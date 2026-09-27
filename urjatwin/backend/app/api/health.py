from fastapi import APIRouter, Depends
import time
from app.schemas.settings import HealthResponse

router = APIRouter()
START_TIME = time.time()

@router.get("/health", response_model=HealthResponse)
def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "uptime": time.time() - START_TIME
    }
