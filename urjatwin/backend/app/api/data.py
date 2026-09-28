"""
Data management API — CSV import/validation and dataset summary.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import io
import os
from app.services.data_service import validate_csv, generate_demo_data

router = APIRouter()

DEMO_PATH = "./data/demo/demo_profiles.csv"


@router.post("/import")
async def import_data(file: UploadFile = File(...)):
    """
    Upload a CSV file in the UrjaTwin schema and validate it.
    Returns validation results before committing to storage.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        validation = validate_csv(df)
        if not validation.is_valid:
            raise HTTPException(
                status_code=422,
                detail={"message": "CSV validation failed", "errors": validation.errors},
            )
        return {
            "status": "ok",
            "rows": len(df),
            "columns": list(df.columns),
            "asset_types": df["asset_type"].value_counts().to_dict() if "asset_type" in df.columns else {},
            "time_range_start": df["timestamp"].min() if "timestamp" in df.columns else None,
            "time_range_end": df["timestamp"].max() if "timestamp" in df.columns else None,
            "validation_errors": [],
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Import error: {str(exc)}")


@router.get("/summary")
def get_data_summary():
    """Return metadata about the currently loaded dataset."""
    if not os.path.exists(DEMO_PATH):
        os.makedirs(os.path.dirname(DEMO_PATH), exist_ok=True)
        generate_demo_data(DEMO_PATH)

    try:
        df = pd.read_csv(DEMO_PATH)
        pv_df = df[df["asset_type"] == "pv"] if "asset_type" in df.columns else pd.DataFrame()
        return {
            "dataset_name": "synthetic_demo_v1",
            "provenance": "synthetic",
            "label": "Synthetic Demo",
            "description": (
                "Deterministic synthetic profiles generated with seed=42. "
                "NOT real utility measurements. Clearly labelled throughout the application."
            ),
            "rows": len(df),
            "time_steps": int(df["timestamp"].nunique()) if "timestamp" in df.columns else 0,
            "assets": int(df["asset_id"].nunique()) if "asset_id" in df.columns else 0,
            "time_range_start": df["timestamp"].min() if "timestamp" in df.columns else None,
            "time_range_end": df["timestamp"].max() if "timestamp" in df.columns else None,
            "asset_types": (
                df["asset_type"].value_counts().to_dict()
                if "asset_type" in df.columns else {}
            ),
            "max_pv_mw": float(pv_df["available_pv_mw"].max()) if not pv_df.empty else None,
            "resolution_hours": 1,
            "timezone": "Asia/Kolkata (IST, UTC+05:30)",
            "seed": 42,
        }
    except Exception as exc:
        return {"error": str(exc), "dataset_name": "unknown"}
