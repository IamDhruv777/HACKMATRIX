import copy
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import pandapower as pp

from app.services.network_service import build_network
from app.services.powerflow_service import run_powerflow
from app.services.constraint_service import check_constraints, ConstraintLimits
from app.services.battery_service import BatteryState, apply_battery_to_network, update_battery_energy
from app.services.switching_service import get_valid_switching_candidates

@dataclass
class CandidateResult:
    id: str
    family: str
    battery_p_mw: float
    switching_ops: List[Any]
    curtailment_pct: float
    violations: List[Any]
    num_violations: int
    curtailed_mwh: float
    network_losses_mw: float
    battery_throughput: float
    feasible: bool
    rejection_reason: str = ""

@dataclass
class ActionComparisonResult:
    selected_candidate: Optional[CandidateResult]
    status: str
    all_candidates: List[CandidateResult]
    rejection_reasons: Dict[str, str]
    explanation: str
    search_coverage: Dict[str, int]

def evaluate_actions(scenario_config: Dict, current_battery: BatteryState, available_pv: Dict[int, float], loads: Dict[int, float], dt_hours: float = 1.0) -> ActionComparisonResult:
    net_base = build_network()
    
    # Apply baseline loads and PV
    for bus, p in loads.items():
        idx = net_base.load[net_base.load.bus == bus].index
        if not idx.empty:
            net_base.load.loc[idx[0], 'p_mw'] = p
            net_base.load.loc[idx[0], 'q_mvar'] = p * 0.3
            
    # Limits
    limits = ConstraintLimits(
        max_curtailment_pct=scenario_config.get("curtailment_limit_pct", 30)
    )
    
    unavailable_switches = scenario_config.get("unavailable_switches", [])
    switch_cands = get_valid_switching_candidates(net_base, unavailable_switches)
    
    batt_levels = [0.0]
    if scenario_config.get("battery_available", True):
        batt_levels = [-0.3, -0.2, -0.1, 0.0, 0.1, 0.2, 0.3]
        
    curtail_levels = [0.0, 10.0, 20.0, 30.0]
    
    candidates = []
    
    # 1. NO ACTION
    candidates.append({"id": "NO_ACTION", "family": "NO_ACTION", "b": 0.0, "s": [], "c": 0.0})
    
    # 2. BATTERY ONLY
    for b in batt_levels:
        if b != 0.0:
            candidates.append({"id": f"BATT_{b}", "family": "BATTERY_ONLY", "b": b, "s": [], "c": 0.0})
            
    # 3. SWITCHING ONLY
    for idx, s in enumerate(switch_cands):
        if len(s) > 0:
            candidates.append({"id": f"SW_{idx}", "family": "SWITCHING_ONLY", "b": 0.0, "s": s, "c": 0.0})
            
    # 4. CURTAILMENT ONLY
    for c in curtail_levels:
        if c > 0.0:
            candidates.append({"id": f"CURT_{c}", "family": "CURTAILMENT_ONLY", "b": 0.0, "s": [], "c": c})
            
    # 5. COMBINED (Limit to a few to save time)
    comb_count = 0
    for b in batt_levels:
        for s in switch_cands:
            for c in curtail_levels:
                if b != 0.0 and len(s) > 0 and comb_count < 20:
                    candidates.append({"id": f"COMB_{comb_count}", "family": "COMBINED", "b": b, "s": s, "c": c})
                    comb_count += 1
                    
    results = []
    
    for cand in candidates:
        net = copy.deepcopy(net_base)
        
        # Apply battery
        _, feasible_batt, batt_reason = update_battery_energy(current_battery, cand["b"], dt_hours)
        if not feasible_batt:
            results.append(CandidateResult(
                id=cand["id"], family=cand["family"], battery_p_mw=cand["b"], switching_ops=cand["s"],
                curtailment_pct=cand["c"], violations=[], num_violations=999, curtailed_mwh=0,
                network_losses_mw=0, battery_throughput=0, feasible=False, rejection_reason=batt_reason
            ))
            continue
            
        apply_battery_to_network(net, cand["b"], current_battery.bus)
        
        # Apply switching
        for l_idx, state in cand["s"]:
            if l_idx in net.line.index:
                net.line.loc[l_idx, 'in_service'] = state
                
        # Apply PV and curtailment
        curt_factor = 1.0 - (cand["c"] / 100.0)
        curtailed_mwh = 0.0
        for bus, p_avail in available_pv.items():
            idx = net.sgen[net.sgen.bus == bus].index
            if not idx.empty:
                p_set = p_avail * curt_factor
                net.sgen.loc[idx[0], 'p_mw'] = p_set
                curtailed_mwh += (p_avail - p_set) * dt_hours
                
        # Run PF
        pf = run_powerflow(net)
        
        if not pf.converged:
            results.append(CandidateResult(
                id=cand["id"], family=cand["family"], battery_p_mw=cand["b"], switching_ops=cand["s"],
                curtailment_pct=cand["c"], violations=[], num_violations=999, curtailed_mwh=curtailed_mwh,
                network_losses_mw=0, battery_throughput=abs(cand["b"])*dt_hours, feasible=False, rejection_reason="PF non-convergence"
            ))
            continue
            
        viols = check_constraints(pf, limits)
        
        results.append(CandidateResult(
            id=cand["id"], family=cand["family"], battery_p_mw=cand["b"], switching_ops=cand["s"],
            curtailment_pct=cand["c"], violations=viols, num_violations=len(viols), curtailed_mwh=curtailed_mwh,
            network_losses_mw=pf.network_losses_mw, battery_throughput=abs(cand["b"])*dt_hours,
            feasible=len(viols) == 0, rejection_reason=f"{len(viols)} violations" if len(viols) > 0 else ""
        ))
        
    # Sort results
    def sort_key(r: CandidateResult):
        return (r.num_violations, r.curtailed_mwh, r.network_losses_mw, len(r.switching_ops), r.battery_throughput)
        
    results.sort(key=sort_key)
    
    selected = results[0] if results and results[0].feasible else None
    status = "FEASIBLE" if selected else "NO_FEASIBLE_CANDIDATE"
    
    explanation = f"Evaluated {len(results)} candidates."
    if selected:
        explanation += f" Selected {selected.id} from {selected.family} family."
    else:
        explanation += " No candidate could resolve all violations."
        
    return ActionComparisonResult(
        selected_candidate=selected,
        status=status,
        all_candidates=results,
        rejection_reasons={r.id: r.rejection_reason for r in results if not r.feasible},
        explanation=explanation,
        search_coverage={"evaluated": len(results)}
    )
