import json
import os

scenarios = [
    {
      "id": "normal_operation",
      "name": "Normal Operation",
      "description": "Moderate solar and demand - baseline case",
      "time_step_idx": 36,
      "demand_multiplier": 1.0,
      "solar_multiplier": 0.6,
      "initial_battery_soc": 0.5,
      "battery_available": True,
      "curtailment_limit_pct": 30,
      "unavailable_switches": [],
      "expected_outcome": "normal"
    },
    {
      "id": "solar_heavy",
      "name": "Solar-Heavy Afternoon",
      "description": "High PV, lower demand - voltage rise risk",
      "time_step_idx": 60,
      "demand_multiplier": 0.7,
      "solar_multiplier": 1.0,
      "initial_battery_soc": 0.15,
      "battery_available": True,
      "curtailment_limit_pct": 30,
      "unavailable_switches": [],
      "expected_outcome": "correctable"
    },
    {
      "id": "evening_peak",
      "name": "Evening Peak",
      "description": "High demand, low solar - undervoltage risk",
      "time_step_idx": 18,
      "demand_multiplier": 1.3,
      "solar_multiplier": 0.05,
      "initial_battery_soc": 0.7,
      "battery_available": True,
      "curtailment_limit_pct": 10,
      "unavailable_switches": [],
      "expected_outcome": "correctable"
    },
    {
      "id": "cloud_passage",
      "name": "Cloud Passage",
      "description": "Sudden solar drop - forecast error demo",
      "time_step_idx": 61,
      "demand_multiplier": 0.85,
      "solar_multiplier": 0.2,
      "initial_battery_soc": 0.5,
      "battery_available": True,
      "curtailment_limit_pct": 30,
      "unavailable_switches": [],
      "expected_outcome": "correctable"
    },
    {
      "id": "equipment_unavailable",
      "name": "Equipment Unavailable",
      "description": "Transfer switch unavailable - limited options",
      "time_step_idx": 18,
      "demand_multiplier": 1.2,
      "solar_multiplier": 0.1,
      "initial_battery_soc": 0.6,
      "battery_available": True,
      "curtailment_limit_pct": 20,
      "unavailable_switches": [0, 1],
      "expected_outcome": "limited"
    },
    {
      "id": "insufficient_flexibility",
      "name": "Insufficient Flexibility",
      "description": "High solar, full battery, blocked transfers, minimal curtailment - unresolvable",
      "time_step_idx": 60,
      "demand_multiplier": 0.6,
      "solar_multiplier": 1.0,
      "initial_battery_soc": 0.94,
      "battery_available": True,
      "curtailment_limit_pct": 5,
      "unavailable_switches": [0, 1, 2],
      "expected_outcome": "infeasible"
    }
]

os.makedirs("d:/Hackathons/HackMatrix/urjatwin/backend/data/scenarios", exist_ok=True)
for s in scenarios:
    with open(f"d:/Hackathons/HackMatrix/urjatwin/backend/data/scenarios/{s['id']}.json", "w") as f:
        json.dump(s, f, indent=2)
