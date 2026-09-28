"""
Power flow execution service.
Uses pandapower AC power flow. Primary: Newton-Raphson (runpp).
Fallback: also tries with different initial conditions if NR fails.

Sign conventions:
- boundary_import_mw > 0: power flows from external grid INTO the feeder (import)
- storage p_mw > 0: discharging (generation); p_mw < 0: charging (consumption)
- sgen p_mw > 0: generation
- load p_mw > 0: consumption
"""
import pandapower as pp
import math
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
import time


@dataclass
class PowerFlowResult:
    converged: bool
    bus_voltages_pu: Optional[Dict[int, Optional[float]]] = None
    bus_voltages_kv: Optional[Dict[int, Optional[float]]] = None
    line_loading_pct: Optional[Dict[int, Optional[float]]] = None
    line_currents_ka: Optional[Dict[int, Optional[float]]] = None
    trafo_loading_pct: Optional[Dict[int, Optional[float]]] = None
    p_mw_from: Optional[Dict[int, Optional[float]]] = None
    q_mvar_from: Optional[Dict[int, Optional[float]]] = None
    network_losses_mw: Optional[float] = None
    network_losses_mvar: Optional[float] = None
    total_load_mw: Optional[float] = None
    total_generation_mw: Optional[float] = None
    boundary_import_mw: Optional[float] = None
    solver_time_s: float = 0.0
    solver_algorithm: str = ""
    error_message: str = ""


def _clean(v) -> Optional[float]:
    """Convert a value to float, returning None for NaN/Inf."""
    if v is None:
        return None
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def run_powerflow(net: pp.pandapowerNet) -> PowerFlowResult:
    """
    Run AC power flow on the given pandapower network.

    Tries Newton-Raphson (runpp). Returns PowerFlowResult.
    If the solver fails, returns converged=False with error details.
    Never returns fake results.

    Parameters
    ----------
    net : pp.pandapowerNet
        A pandapower network object, already configured with loads, sgens, and storage.

    Returns
    -------
    PowerFlowResult
        converged=False if the solver did not converge.
    """
    t0 = time.time()
    error_msg = ""
    algo = "nr"

    try:
        # Newton-Raphson (default, robust for meshed networks too)
        pp.runpp(net, numba=False, verbose=False)
        converged = True
    except Exception as e1:
        # Second attempt with flat voltage start
        try:
            pp.runpp(net, init="flat", numba=False, verbose=False)
            converged = True
            algo = "nr_flat"
        except Exception as e2:
            converged = False
            error_msg = f"NR failed: {e1}. NR-flat failed: {e2}"

    t1 = time.time()
    solver_time = t1 - t0

    if not converged:
        return PowerFlowResult(
            converged=False,
            solver_time_s=solver_time,
            solver_algorithm=algo,
            error_message=error_msg,
        )

    # ── Extract results ──────────────────────────────────────────────────────
    res_bus = net.res_bus
    res_line = net.res_line
    res_trafo = net.res_trafo if hasattr(net, 'res_trafo') else None

    result = PowerFlowResult(
        converged=True,
        solver_time_s=solver_time,
        solver_algorithm=algo,
    )

    # Bus voltages
    result.bus_voltages_pu = {
        int(i): _clean(row.vm_pu) for i, row in res_bus.iterrows()
    }
    result.bus_voltages_kv = {
        int(i): _clean(row.vm_pu * net.bus.loc[i, 'vn_kv'])
        for i, row in res_bus.iterrows()
    }

    # Line results
    result.line_loading_pct = {
        int(i): _clean(row.loading_percent) for i, row in res_line.iterrows()
    }
    result.line_currents_ka = {
        int(i): _clean(row.i_ka) for i, row in res_line.iterrows()
    }
    result.p_mw_from = {
        int(i): _clean(row.p_from_mw) for i, row in res_line.iterrows()
    }
    result.q_mvar_from = {
        int(i): _clean(row.q_from_mvar) for i, row in res_line.iterrows()
    }

    # Transformer results
    if res_trafo is not None and len(res_trafo) > 0:
        result.trafo_loading_pct = {
            int(i): _clean(row.loading_percent) for i, row in res_trafo.iterrows()
        }
    else:
        result.trafo_loading_pct = {}

    # Network totals
    line_losses_mw = res_line.pl_mw.sum() if 'pl_mw' in res_line.columns else 0.0
    trafo_losses_mw = (
        res_trafo.pl_mw.sum()
        if res_trafo is not None and 'pl_mw' in res_trafo.columns
        else 0.0
    )
    line_losses_mvar = res_line.ql_mvar.sum() if 'ql_mvar' in res_line.columns else 0.0
    trafo_losses_mvar = (
        res_trafo.ql_mvar.sum()
        if res_trafo is not None and 'ql_mvar' in res_trafo.columns
        else 0.0
    )

    result.network_losses_mw = _clean(line_losses_mw + trafo_losses_mw)
    result.network_losses_mvar = _clean(line_losses_mvar + trafo_losses_mvar)
    result.total_load_mw = _clean(net.res_load.p_mw.sum()) if len(net.res_load) > 0 else 0.0
    result.total_generation_mw = _clean(net.res_sgen.p_mw.sum()) if len(net.res_sgen) > 0 else 0.0

    # Boundary import (positive = importing from grid)
    result.boundary_import_mw = _clean(net.res_ext_grid.p_mw.sum()) if len(net.res_ext_grid) > 0 else 0.0

    return result
