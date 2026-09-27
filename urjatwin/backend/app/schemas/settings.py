from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Optional, Any
from datetime import datetime

class HealthResponse(BaseModel):
    status: str
    version: str
    uptime: float
