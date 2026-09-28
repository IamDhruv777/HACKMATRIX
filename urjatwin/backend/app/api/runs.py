"""
Run management API — creates simulation runs and executes them with real pandapower power flow.
"""
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.models.database import get_db, SessionLocal
from app.models.orm import Run, Scenario
from app.schemas.run import RunRequest
import uuid
from datetime import datetime

router = APIRouter()


def _serialize_pf(pf):
    """Serialize PowerFlowResult to JSON-safe dict."""
    if pf is None:
        return None
    return {
        "converged": pf.converged,
        "bus_voltages_pu": {str(k): v for k, v in (pf.bus_voltages_pu or {}).items()},
        "bus_voltages_kv": {str(k): v for k, v in (pf.bus_voltages_kv or {}).items()},
        "line_loading_pct": {str(k): v for k, v in (pf.line_loading_pct or {}).items()},
        "line_currents_ka": {str(k): v for k, v in (pf.line_currents_ka or {}).items()},
        "trafo_loading_pct": {str(k): v for k, v in (pf.trafo_loading_pct or {}).items()},
        "p_mw_from": {str(k): v for k, v in (pf.p_mw_from or {}).items()},
        "q_mvar_from": {str(k): v for k, v in (pf.q_mvar_from or {}).items()},
        "network_losses_mw": pf.network_losses_mw,
        "network_losses_mvar": pf.network_losses_mvar,
        "total_load_mw": pf.total_load_mw,
        "total_generation_mw": pf.total_generation_mw,
        "boundary_import_mw": pf.boundary_import_mw,
        "solver_algorithm": pf.solver_algorithm,
        "solver_time_s": pf.solver_time_s,
        "error_message": pf.error_message,
    }


def _serialize_violation(v):
    """Serialize a Violation dataclass to JSON-safe dict."""
    return {
        "type": v.type,
        "element_id": v.element_id,
        "actual_value": v.actual_value,
        "limit": v.limit,
        "unit": v.unit,
        "severity": v.severity,
        "explanation": v.explanation,
    }


def _serialize_candidate(c):
    """Serialize a CandidateResult to JSON-safe dict."""
    return {
        "id": c.id,
        "family": c.family,
        "battery_p_mw": c.battery_p_mw,
        "switching_ops": c.switching_ops,
        "curtailment_pct": c.curtailment_pct,
        "violations": [_serialize_violation(v) for v in c.violations],
        "num_violations": c.num_violations,
        "curtailed_mwh": c.curtailed_mwh,
        "network_losses_mw": c.network_losses_mw,
        "battery_throughput": c.battery_throughput,
        "feasible": c.feasible,
        "rejection_reason": c.rejection_reason,
    }


def execute_run(run_id: str):
    """
    Background task: execute a full simulation run using pandapower.
    Never returns fake results — if simulation fails, marks run as failed.
    """
    db = SessionLocal()
    try:
        run = db.query(Run).filter(Run.id == run_id).first()
        if not run:
            return

        run.status = "running"
        run.progress = 5.0
        db.commit()

        config = run.config_json

        # ── Import services ───────────────────────────────────────────────
        from app.services.network_service import build_network
        from app.services.powerflow_service import run_powerflow
        from app.services.constraint_service import check_constraints, ConstraintLimits
        from app.services.battery_service import BatteryState, apply_battery_to_network
        from app.services.action_service import evaluate_actions
        from app.services.data_service import get_scenario_inputs
        from app.services.explanation_service import generate_explanation

        # ── Extract scenario parameters ───────────────────────────────────
        time_step_idx = int(config.get("time_step_idx", 36))
        demand_mult = float(config.get("demand_multiplier", 1.0))
        solar_mult = float(config.get("solar_multiplier", 0.6))
        initial_soc = float(config.get("initial_battery_soc", 0.5))
        battery_available = bool(config.get("battery_available", True))
        curtailment_limit_pct = float(config.get("curtailment_limit_pct", 30.0))

        # ── Get time-series inputs ────────────────────────────────────────
        scenario_inputs = get_scenario_inputs(time_step_idx, demand_mult, solar_mult)
        loads = scenario_inputs["loads"]          # {bus: p_mw}
        available_pv = scenario_inputs["available_pv"]  # {bus: p_mw}
        sim_timestamp = scenario_inputs["timestamp"]

        run.progress = 20.0
        db.commit()

        # ── Battery initial state ─────────────────────────────────────────
        battery = BatteryState(
            energy_mwh=initial_soc * 2.0,   # 2.0 MWh capacity
            available=battery_available
        )

        # ── BASELINE power flow ───────────────────────────────────────────
        net_baseline = build_network()

        # Apply loads from scenario
        for bus, p_mw in loads.items():
            mask = net_baseline.load.bus == bus
            if mask.any():
                idx = net_baseline.load[mask].index[0]
                net_baseline.load.at[idx, 'p_mw'] = float(p_mw)
                net_baseline.load.at[idx, 'q_mvar'] = float(p_mw) * 0.3

        # Apply available PV at full output (no curtailment in baseline)
        for bus, p_avail in available_pv.items():
            mask = net_baseline.sgen.bus == bus
            if mask.any():
                idx = net_baseline.sgen[mask].index[0]
                net_baseline.sgen.at[idx, 'p_mw'] = float(p_avail)

        pf_baseline = run_powerflow(net_baseline)

        run.progress = 40.0
        db.commit()

        # ── Check baseline constraints ────────────────────────────────────
        limits = ConstraintLimits(max_curtailment_pct=curtailment_limit_pct)
        baseline_violations = (
            check_constraints(pf_baseline, limits)
            if pf_baseline.converged else []
        )

        run.progress = 50.0
        db.commit()

        # ── Evaluate corrective actions ───────────────────────────────────
        comparison = evaluate_actions(
            scenario_config=config,
            current_battery=battery,
            available_pv=available_pv,
            loads=loads,
            dt_hours=1.0,
        )

        run.progress = 85.0
        db.commit()

        # ── Generate explanation ──────────────────────────────────────────
        explanation = generate_explanation(pf_baseline, baseline_violations, comparison)

        # ── Build result document ─────────────────────────────────────────
        # Compute total available PV energy
        total_avail_pv_mwh = sum(available_pv.values())
        selected = comparison.selected_candidate
        curtailed_mwh = selected.curtailed_mwh if selected else 0.0
        generated_pv_mwh = max(0.0, total_avail_pv_mwh - curtailed_mwh)

        result = {
            "baseline": {
                "powerflow": _serialize_pf(pf_baseline),
                "violations": [_serialize_violation(v) for v in baseline_violations],
                "num_violations": len(baseline_violations),
                "inputs": {
                    "loads": {str(k): v for k, v in loads.items()},
                    "available_pv": {str(k): v for k, v in available_pv.items()},
                    "battery_initial_soc": initial_soc,
                    "time_step_idx": time_step_idx,
                },
            },
            "action_comparison": {
                "status": comparison.status,
                "selected_candidate": (
                    _serialize_candidate(comparison.selected_candidate)
                    if comparison.selected_candidate else None
                ),
                "all_candidates": [
                    _serialize_candidate(c) for c in comparison.all_candidates
                ],
                "rejection_reasons": comparison.rejection_reasons,
                "explanation": explanation,
                "search_coverage": comparison.search_coverage,
            },
            "metrics": {
                "total_available_pv_mwh": total_avail_pv_mwh,
                "total_generated_pv_mwh": generated_pv_mwh,
                "total_curtailed_mwh": curtailed_mwh,
                "renewable_utilization_pct": (
                    100.0 * generated_pv_mwh / total_avail_pv_mwh
                    if total_avail_pv_mwh > 0 else None
                ),
            },
            "scenario_config": config,
            "simulation_timestamp": sim_timestamp,
            "wall_clock_utc": datetime.utcnow().isoformat() + "Z",
            "note": (
                "Simulation prototype — results computed by pandapower AC power flow. "
                "Not for real-world grid control."
            ),
        }

        run.result_json = result
        run.status = "completed"
        run.progress = 100.0
        db.commit()

    except Exception as exc:
        import traceback
        tb = traceback.format_exc()
        try:
            db.rollback()
            run2 = db.query(Run).filter(Run.id == run_id).first()
            if run2:
                run2.status = "failed"
                run2.error = f"{str(exc)}\n{tb[:3000]}"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


# ── API endpoints ──────────────────────────────────────────────────────────────

@router.post("")
def create_run(req: RunRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == req.scenario_id).first()
    if not scenario:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario '{req.scenario_id}' not found. "
                   "Use GET /api/scenarios to list available scenarios.",
        )

    run_id = str(uuid.uuid4())
    config = dict(scenario.config_json)
    if req.config_overrides:
        config.update(req.config_overrides)

    new_run = Run(
        id=run_id,
        scenario_id=req.scenario_id,
        status="queued",
        progress=0.0,
        config_json=config,
    )
    db.add(new_run)
    db.commit()

    background_tasks.add_task(execute_run, run_id)
    return {"run_id": run_id, "status": "queued", "message": "Run queued. Poll GET /api/runs/{run_id} for status."}


@router.get("")
def list_runs(db: Session = Depends(get_db)):
    runs = db.query(Run).order_by(Run.created_at.desc()).all()
    return [
        {
            "run_id": r.id,
            "scenario_id": r.scenario_id,
            "status": r.status,
            "progress": r.progress,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "has_error": bool(r.error),
        }
        for r in runs
    ]


@router.get("/{run_id}")
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return {
        "run_id": run.id,
        "scenario_id": run.scenario_id,
        "status": run.status,
        "progress": run.progress,
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "error": run.error[:500] if run.error else None,
    }


@router.get("/{run_id}/results")
def get_run_results(run_id: str, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.status == "failed":
        raise HTTPException(
            status_code=500,
            detail=f"Run failed: {run.error[:500] if run.error else 'unknown error'}",
        )
    if run.status != "completed":
        return {"status": run.status, "progress": run.progress, "message": "Run not yet complete"}
    return run.result_json


@router.get("/{run_id}/candidates")
def get_run_candidates(run_id: str, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.status != "completed" or not run.result_json:
        return []
    return run.result_json.get("action_comparison", {}).get("all_candidates", [])


@router.get("/{run_id}/export")
def export_run(run_id: str, db: Session = Depends(get_db)):
    """Export the saved run as JSON for reproducibility. Does not re-run simulation."""
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return JSONResponse(
        content={
            "run_id": run.id,
            "scenario_id": run.scenario_id,
            "status": run.status,
            "created_at": run.created_at.isoformat() if run.created_at else None,
            "config": run.config_json,
            "results": run.result_json,
            "export_note": (
                "This is the saved run result. "
                "Results reflect the simulation at the time of the run, "
                "not current UI settings."
            ),
        }
    )
