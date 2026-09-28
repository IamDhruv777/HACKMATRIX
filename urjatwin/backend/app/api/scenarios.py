from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.orm import Scenario

router = APIRouter()

@router.get("")
def get_scenarios(db: Session = Depends(get_db)):
    scenarios = db.query(Scenario).all()
    return [s.config_json for s in scenarios]

@router.get("/{id}")
def get_scenario(id: str, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == id).first()
    return scenario.config_json if scenario else {}
