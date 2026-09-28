import pandapower.networks as pn
import pandapower as pp
import copy
from dataclasses import dataclass, field
from typing import List, Dict, Any, Tuple

@dataclass
class NetworkConfig:
    network_id: str = "case33bw_modified"
    version: str = "1.0"
    description: str = "Modified Baran-Wu 33-bus network with PV, battery, and tie switches"
    pv_buses: List[int] = field(default_factory=lambda: [5, 10, 17, 24, 30])
    pv_capacities: List[float] = field(default_factory=lambda: [0.5, 0.8, 0.6, 0.7, 0.4])
    battery_bus: int = 18
    battery_params: Dict[str, float] = field(default_factory=lambda: {
        "max_e_mwh": 2.0, "max_p_mw": 0.5, "min_e_mwh": 0.2, "sn_mva": 0.5
    })
    tie_switches: List[Tuple[int, int]] = field(default_factory=lambda: [(7, 20), (8, 21), (11, 21)])
    line_ratings_ka: float = 0.2

def get_network_config() -> NetworkConfig:
    return NetworkConfig()

def build_network(scenario_config=None) -> pp.Network:
    net = pn.case33bw()
    config = get_network_config()

    # 1. Add PV generators
    for bus, cap in zip(config.pv_buses, config.pv_capacities):
        pp.create_sgen(net, bus, p_mw=0, q_mvar=0, sn_mva=cap, type='PV', name=f"PV_{bus}")

    # 2. Add community battery
    b_params = config.battery_params
    pp.create_storage(
        net, config.battery_bus, p_mw=0, max_e_mwh=b_params["max_e_mwh"],
        min_e_mwh=b_params["min_e_mwh"], max_p_mw=b_params["max_p_mw"],
        sn_mva=b_params["sn_mva"], type='battery', name=f"Battery_{config.battery_bus}"
    )

    # 3. Add line thermal ratings
    net.line['max_i_ka'] = config.line_ratings_ka

    # 4. Add upstream transformer
    # Create new HV bus
    pp.create_bus(net, vn_kv=33.0, name="HV_Bus", type="b")
    hv_bus_idx = 33 # case33bw buses are 0-32, new bus will be 33
    
    # Move external grid to HV bus
    net.ext_grid.loc[0, 'bus'] = hv_bus_idx
    
    # Connect trafo between HV bus and original ext_grid bus (0)
    pp.create_transformer_from_parameters(
        net, hv_bus=hv_bus_idx, lv_bus=0, sn_mva=5.0, vn_hv_kv=33.0, vn_lv_kv=12.66,
        vkr_percent=1.5, vk_percent=6.0, pfe_kw=20.0, i0_percent=0.4, name="Substation_Trafo"
    )

    # 5. Add tie switches as open lines
    for i, (f_bus, t_bus) in enumerate(config.tie_switches):
        # We need standard line params for 12.66kV, use same as line 0
        l_ref = net.line.iloc[0]
        pp.create_line_from_parameters(
            net, from_bus=f_bus, to_bus=t_bus, length_km=1.0, 
            r_ohm_per_km=l_ref.r_ohm_per_km, x_ohm_per_km=l_ref.x_ohm_per_km,
            c_nf_per_km=l_ref.c_nf_per_km, max_i_ka=config.line_ratings_ka,
            name=f"Tie_Line_{i+1}", in_service=False
        )

    return net

def get_network_elements() -> dict:
    net = build_network()
    
    import numpy as np
    def df_to_records_with_index(df):
        df_clean = df.replace({np.nan: None})
        records = df_clean.reset_index().rename(columns={'index': 'index'}).to_dict(orient='records')
        for i, (idx, _) in enumerate(df.iterrows()):
            records[i]['index'] = int(idx)
        return records
    
    return {
        "buses": df_to_records_with_index(net.bus),
        "lines": df_to_records_with_index(net.line),
        "trafos": df_to_records_with_index(net.trafo) if len(net.trafo) > 0 else [],
        "loads": df_to_records_with_index(net.load),
        "sgens": df_to_records_with_index(net.sgen),
        "storage": df_to_records_with_index(net.storage),
        "ext_grid": df_to_records_with_index(net.ext_grid),
        "pv_buses": [5, 10, 17, 24, 30],
        "battery_bus": 18,
        "tie_switch_pairs": [(7, 20), (8, 21), (11, 21)],
        "network_id": "case33bw_modified_v1",
        "description": "Modified Baran-Wu 33-bus benchmark. 12.66 kV. NOT an actual Maharashtra feeder.",
        "note": "Simulation prototype. All results from pandapower AC power flow.",
    }

def validate_network(net: pp.pandapowerNet) -> bool:
    """Validate network by running power flow. Returns True if converged."""
    try:
        pp.runpp(net, numba=False, verbose=False)
        return True
    except Exception:
        return False
