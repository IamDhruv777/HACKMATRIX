from dataclasses import dataclass
from typing import Tuple, Optional
import pandapower as pp

@dataclass
class BatteryState:
    bus: int = 18
    energy_mwh: float = 1.0
    capacity_mwh: float = 2.0
    min_energy_mwh: float = 0.2
    max_energy_mwh: float = 1.9
    max_charge_mw: float = 0.5
    max_discharge_mw: float = 0.5
    eta_charge: float = 0.95
    eta_discharge: float = 0.95
    available: bool = True

def update_battery_energy(state: BatteryState, p_mw: float, dt_hours: float) -> Tuple[BatteryState, bool, str]:
    if not state.available:
        return state, False, "Battery unavailable"
        
    if p_mw > 0: # charging
        if p_mw > state.max_charge_mw + 1e-6:
            return state, False, f"Charge power {p_mw} exceeds max {state.max_charge_mw}"
        e_next = state.energy_mwh + state.eta_charge * p_mw * dt_hours
    elif p_mw < 0: # discharging
        if abs(p_mw) > state.max_discharge_mw + 1e-6:
            return state, False, f"Discharge power {abs(p_mw)} exceeds max {state.max_discharge_mw}"
        e_next = state.energy_mwh + p_mw * dt_hours / state.eta_discharge
    else:
        e_next = state.energy_mwh
        
    if e_next < state.min_energy_mwh - 1e-6:
        return state, False, f"Resulting energy {e_next} below min {state.min_energy_mwh}"
    if e_next > state.max_energy_mwh + 1e-6:
        return state, False, f"Resulting energy {e_next} above max {state.max_energy_mwh}"
        
    new_state = BatteryState(**state.__dict__)
    new_state.energy_mwh = e_next
    return new_state, True, ""

def apply_battery_to_network(net: pp.Network, p_mw: float, bus: int = 18):
    # p_mw > 0 means charging, pp storage p_mw > 0 means discharging
    # so we set p_mw = -p_mw
    idx = net.storage[net.storage.bus == bus].index
    if not idx.empty:
        net.storage.loc[idx[0], 'p_mw'] = -p_mw
