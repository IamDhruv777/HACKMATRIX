from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class RunRequest(BaseModel):
    scenario_id: str
    config_overrides: Optional[Dict[str, Any]] = None

class RunResponse(BaseModel):
    run_id: str
    status: str
