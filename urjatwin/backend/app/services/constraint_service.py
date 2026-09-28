from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime
from app.services.powerflow_service import PowerFlowResult
from app.services.battery_service import BatteryState

@dataclass
class ConstraintLimits:
    v_min_pu: float = 0.95
    v_max_pu: float = 1.05
    max_line_loading_pct: float = 100.0
    max_trafo_loading_pct: float = 100.0
    battery_soc_min: float = 0.1
    battery_soc_max: float = 0.95
    max_curtailment_pct: float = 30.0
    max_switching_ops: int = 3

@dataclass
class Violation:
    type: str
    element_id: str
    timestamp: Optional[datetime]
    actual_value: float
    limit: float
    unit: str
    severity: str
    explanation: str

def check_constraints(pf_result: PowerFlowResult, limits: ConstraintLimits, battery_state: Optional[BatteryState] = None, timestamp: Optional[datetime] = None) -> List[Violation]:
    violations = []
    
    if not pf_result.converged:
        violations.append(Violation(
            type="non_convergence", element_id="network", timestamp=timestamp, actual_value=0.0, limit=1.0, unit="",
            severity="critical", explanation="Power flow did not converge."
        ))
        return violations

    for bus_id, v in pf_result.bus_voltages_pu.items():
        if v is not None:
            if v < limits.v_min_pu:
                violations.append(Violation(
                    type="undervoltage", element_id=f"bus_{bus_id}", timestamp=timestamp, actual_value=v,
                    limit=limits.v_min_pu, unit="pu", severity="critical" if v < limits.v_min_pu - 0.05 else "warning",
                    explanation=f"Voltage at bus {bus_id} is below {limits.v_min_pu} pu"
                ))
            elif v > limits.v_max_pu:
                violations.append(Violation(
                    type="overvoltage", element_id=f"bus_{bus_id}", timestamp=timestamp, actual_value=v,
                    limit=limits.v_max_pu, unit="pu", severity="critical" if v > limits.v_max_pu + 0.05 else "warning",
                    explanation=f"Voltage at bus {bus_id} is above {limits.v_max_pu} pu"
                ))

    for line_id, loading in pf_result.line_loading_pct.items():
        if loading is not None and loading > limits.max_line_loading_pct:
            violations.append(Violation(
                type="line_overload", element_id=f"line_{line_id}", timestamp=timestamp, actual_value=loading,
                limit=limits.max_line_loading_pct, unit="%", severity="critical" if loading > 120 else "warning",
                explanation=f"Line {line_id} loaded at {loading:.1f}%"
            ))

    for trafo_id, loading in pf_result.trafo_loading_pct.items():
        if loading is not None and loading > limits.max_trafo_loading_pct:
            violations.append(Violation(
                type="trafo_overload", element_id=f"trafo_{trafo_id}", timestamp=timestamp, actual_value=loading,
                limit=limits.max_trafo_loading_pct, unit="%", severity="critical" if loading > 120 else "warning",
                explanation=f"Transformer {trafo_id} loaded at {loading:.1f}%"
            ))
            
    if battery_state:
        soc = battery_state.energy_mwh / battery_state.capacity_mwh
        if soc < limits.battery_soc_min:
            violations.append(Violation(
                type="battery_soc", element_id=f"battery_{battery_state.bus}", timestamp=timestamp, actual_value=soc,
                limit=limits.battery_soc_min, unit="pu", severity="warning",
                explanation=f"Battery SOC below minimum"
            ))
        elif soc > limits.battery_soc_max:
            violations.append(Violation(
                type="battery_soc", element_id=f"battery_{battery_state.bus}", timestamp=timestamp, actual_value=soc,
                limit=limits.battery_soc_max, unit="pu", severity="warning",
                explanation=f"Battery SOC above maximum"
            ))

    return violations
