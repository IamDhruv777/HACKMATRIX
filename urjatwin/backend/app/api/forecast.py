"""
Forecast API — runs ML demand and solar forecasting pipeline.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()


class ForecastRequest(BaseModel):
    scenario_id: str = Field(default="normal_operation")
    asset_type: str = Field(
        default="load",
        description="'load' for demand forecast, 'pv' for solar forecast",
    )
    horizon_h: int = Field(default=1, ge=1, le=4, description="Forecast horizon in hours")
    asset_id: Optional[str] = Field(
        default=None,
        description="Specific asset ID (e.g. 'PV_5'). If None, uses total demand for load.",
    )


@router.post("")
def run_forecast(req: ForecastRequest):
    """
    Run demand or solar forecast for the requested horizon.
    Uses HistGradientBoostingRegressor trained on synthetic demo data.
    Results are labelled as synthetic_demo_v1.
    """
    try:
        from app.services.forecast_service import run_forecast_pipeline

        result = run_forecast_pipeline(
            asset_type=req.asset_type,
            horizon_h=req.horizon_h,
            asset_id=req.asset_id,
        )
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Forecast pipeline failed: {str(exc)}",
        )
