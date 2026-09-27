import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class ValidationResult:
    is_valid: bool
    errors: List[str]

IST = timezone(timedelta(hours=5, minutes=30))

def generate_demo_data(output_path: str = "./data/demo/demo_profiles.csv"):
    np.random.seed(42)
    start_time = datetime(2024, 1, 15, 0, 0, 0, tzinfo=IST)
    hours = 168
    
    timestamps = [start_time + timedelta(hours=i) for i in range(hours)]
    
    records = []
    
    # Base network load reference (we just distribute random weights for buses 1-32)
    bus_loads = {i: np.random.uniform(0.01, 0.1) for i in range(1, 33)}
    
    pv_buses = [5, 10, 17, 24, 30]
    pv_capacities = [0.5, 0.8, 0.6, 0.7, 0.4]
    
    for i, ts in enumerate(timestamps):
        hour = ts.hour
        day = ts.weekday()
        is_weekend = day >= 5
        
        # Load multipliers
        daily_mult = 0.85 if is_weekend else 1.0
        
        # Simple residential pattern
        if 7 <= hour <= 9 or 18 <= hour <= 22:
            base_load = 1.2
        elif 2 <= hour <= 5:
            base_load = 0.4
        else:
            base_load = 0.8
            
        load_factor = base_load * daily_mult * (1 + np.random.normal(0, 0.03))
        
        for bus in range(1, 33):
            p_mw = bus_loads[bus] * load_factor
            q_mvar = p_mw * 0.3 # simple power factor
            records.append({
                "timestamp": ts.isoformat(),
                "asset_id": f"Load_{bus}",
                "asset_type": "load",
                "p_mw": p_mw,
                "q_mvar": q_mvar,
                "available_pv_mw": 0.0,
                "quality": "good",
                "provenance": "synthetic_demo_v1"
            })
            
        # Solar generation
        for bus, cap in zip(pv_buses, pv_capacities):
            irradiance_factor = np.random.uniform(0.7, 1.0)
            
            # Cloud passage scenario logic (Day 3 is index 2, so hours 48 to 71. Hour 13-16 is 48+13=61 to 48+16=64)
            if i >= 61 and i <= 64:
                irradiance_factor = 0.2
                
            available_pv = 0.0
            if 6 <= hour <= 19:
                # simple bell curve
                mu = 12.5
                sigma = 3.0
                bell = np.exp(-0.5 * ((hour - mu) / sigma)**2)
                available_pv = cap * irradiance_factor * bell
                
            records.append({
                "timestamp": ts.isoformat(),
                "asset_id": f"PV_{bus}",
                "asset_type": "pv",
                "p_mw": 0.0,  # actual will be set by run
                "q_mvar": 0.0,
                "available_pv_mw": available_pv,
                "quality": "good",
                "provenance": "synthetic_demo_v1"
            })
            
        # Battery (bus 18)
        records.append({
            "timestamp": ts.isoformat(),
            "asset_id": "Battery_18",
            "asset_type": "battery",
            "p_mw": 0.0,
            "q_mvar": 0.0,
            "available_pv_mw": 0.0,
            "quality": "good",
            "provenance": "synthetic_demo_v1"
        })
        
    df = pd.DataFrame(records)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    return df

def validate_csv(df: pd.DataFrame) -> ValidationResult:
    errors = []
    required_cols = ["timestamp", "asset_id", "asset_type", "p_mw", "q_mvar", "available_pv_mw", "quality", "provenance"]
    for col in required_cols:
        if col not in df.columns:
            errors.append(f"Missing required column: {col}")
            
    if errors:
        return ValidationResult(is_valid=False, errors=errors)
        
    if not pd.api.types.is_numeric_dtype(df["p_mw"]):
        errors.append("p_mw must be numeric")
        
    return ValidationResult(is_valid=len(errors) == 0, errors=errors)


def get_scenario_inputs(
    time_step_idx: int,
    demand_mult: float = 1.0,
    solar_mult: float = 1.0,
) -> dict:
    """
    Return deterministic load and available-PV inputs for a specific time step.
    Uses Baran-Wu reference loads scaled by hourly pattern and multipliers.
    Seed = 42 + time_step_idx for reproducibility.
    """
    import pandapower.networks as pn

    net_ref = pn.case33bw()
    ref_loads: dict = {
        int(row.bus): float(row.p_mw)
        for _, row in net_ref.load.iterrows()
    }

    np.random.seed(42 + time_step_idx)
    hour = time_step_idx % 24
    day_of_week = (time_step_idx // 24) % 7
    is_weekend = day_of_week >= 5

    if 7 <= hour <= 9 or 18 <= hour <= 22:
        base_load = 1.2
    elif 2 <= hour <= 5:
        base_load = 0.4
    else:
        base_load = 0.8

    daily_mult = 0.85 if is_weekend else 1.0
    noise = 1.0 + np.random.normal(0, 0.03)
    load_factor = base_load * daily_mult * demand_mult * noise

    loads = {bus: max(0.001, p_mw * load_factor) for bus, p_mw in ref_loads.items()}

    pv_buses = [5, 10, 17, 24, 30]
    pv_capacities = [0.5, 0.8, 0.6, 0.7, 0.4]
    irradiance_base = 0.2 if 61 <= time_step_idx <= 64 else 0.85

    available_pv: dict = {}
    for bus, cap in zip(pv_buses, pv_capacities):
        if 6 <= hour <= 19:
            mu, sigma = 12.5, 3.0
            bell = float(np.exp(-0.5 * ((hour - mu) / sigma) ** 2))
            avail = cap * irradiance_base * bell * solar_mult
        else:
            avail = 0.0
        available_pv[bus] = max(0.0, min(avail, cap))

    start = datetime(2024, 1, 15, 0, 0, 0, tzinfo=IST)
    sim_ts = start + timedelta(hours=time_step_idx)

    return {
        "loads": loads,
        "available_pv": available_pv,
        "timestamp": sim_ts.isoformat(),
        "hour": hour,
        "day_of_week": day_of_week,
        "is_weekend": is_weekend,
        "time_step_idx": time_step_idx,
        "provenance": "synthetic_demo_v1",
    }
