"""
Settings API — read and write configurable simulation parameters.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.orm import Setting

router = APIRouter()

# Default operating limits (project targets, not regulatory requirements)
DEFAULTS: dict = {
    "v_min_pu": 0.95,
    "v_max_pu": 1.05,
    "max_line_loading_pct": 100.0,
    "max_trafo_loading_pct": 100.0,
    "battery_soc_min": 0.10,
    "battery_soc_max": 0.95,
    "max_curtailment_pct": 30.0,
    "max_switching_ops": 3,
    "battery_steps": 7,
    "curtailment_steps": 4,
    "candidate_cap": 50,
}

_descriptions = {
    "v_min_pu": "Minimum acceptable bus voltage (project operating target, not regulatory limit)",
    "v_max_pu": "Maximum acceptable bus voltage (project operating target)",
    "max_line_loading_pct": "Maximum line thermal loading as % of declared rating",
    "max_trafo_loading_pct": "Maximum transformer loading as % of rated MVA",
    "battery_soc_min": "Minimum battery state of charge (fraction, 0–1)",
    "battery_soc_max": "Maximum battery state of charge (fraction, 0–1)",
    "max_curtailment_pct": "Maximum allowed PV curtailment as % of available PV",
    "max_switching_ops": "Maximum number of switching operations per interval",
    "battery_steps": "Number of battery setpoint candidates to evaluate",
    "curtailment_steps": "Number of curtailment level candidates to evaluate",
    "candidate_cap": "Maximum total candidates to evaluate (prevents combinatorial explosion)",
}


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    """Return current settings, falling back to defaults for unset keys."""
    settings = {}
    for key, default in DEFAULTS.items():
        row = db.query(Setting).filter(Setting.key == key).first()
        try:
            settings[key] = float(row.value) if row else default
        except (ValueError, TypeError):
            settings[key] = default
    return {
        "settings": settings,
        "descriptions": _descriptions,
        "note": "Voltage band is a project operating target, not a universal regulatory requirement.",
    }


@router.put("")
def update_settings(data: dict, db: Session = Depends(get_db)):
    """Update one or more settings. Unknown keys are silently ignored."""
    updated = []
    for key, value in data.items():
        if key not in DEFAULTS:
            continue  # ignore unknown keys
        row = db.query(Setting).filter(Setting.key == key).first()
        if row:
            row.value = str(value)
        else:
            db.add(Setting(key=key, value=str(value)))
        updated.append(key)
    db.commit()
    return {"status": "ok", "updated": updated}


@router.post("/reset")
def reset_settings(db: Session = Depends(get_db)):
    """Reset all settings to factory defaults."""
    db.query(Setting).delete()
    db.commit()
    return {"status": "ok", "settings": DEFAULTS, "message": "All settings reset to defaults."}
