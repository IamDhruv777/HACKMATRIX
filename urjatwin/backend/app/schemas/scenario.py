from pydantic import BaseModel
from typing import List, Optional

class ScenarioConfig(BaseModel):
    id: str
    name: str
    description: str
    time_step_idx: int
    demand_multiplier: float
    solar_multiplier: float
    initial_battery_soc: float
    battery_available: bool
    curtailment_limit_pct: float
    unavailable_switches: List[int]
    expected_outcome: str
