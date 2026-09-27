"""
UrjaTwin FastAPI application entry point.
Registers all API routers and handles startup initialization.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import json

from app.models.database import engine, Base, SessionLocal
from app.models.orm import Scenario

# ── Routers ────────────────────────────────────────────────────────────────────
from app.api import health, network, scenarios, runs
from app.api import data as data_api
from app.api import forecast as forecast_api
from app.api import settings as settings_api

# ── Application ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="UrjaTwin API",
    version="1.0.0",
    description=(
        "Digital Twin for Renewable Distribution Grid Management. "
        "All electrical results computed by pandapower AC power flow. "
        "Simulation prototype — not for real-world grid control."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include routers ────────────────────────────────────────────────────────────
app.include_router(health.router,       prefix="/api/health",    tags=["health"])
app.include_router(network.router,      prefix="/api/network",   tags=["network"])
app.include_router(scenarios.router,    prefix="/api/scenarios", tags=["scenarios"])
app.include_router(runs.router,         prefix="/api/runs",      tags=["runs"])
app.include_router(data_api.router,     prefix="/api/data",      tags=["data"])
app.include_router(forecast_api.router, prefix="/api/forecast",  tags=["forecast"])
app.include_router(settings_api.router, prefix="/api/settings",  tags=["settings"])


# ── Exception handler ──────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "type": type(exc).__name__},
    )


# ── Startup ────────────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    # Create all database tables
    Base.metadata.create_all(bind=engine)

    # Generate demo data if not present
    demo_path = "./data/demo/demo_profiles.csv"
    if not os.path.exists(demo_path):
        os.makedirs("./data/demo", exist_ok=True)
        try:
            from app.services.data_service import generate_demo_data
            generate_demo_data(demo_path)
            print(f"[startup] Generated demo data at {demo_path}")
        except Exception as exc:
            print(f"[startup] WARNING: Could not generate demo data: {exc}")

    # Seed / update scenarios from JSON files
    db = SessionLocal()
    try:
        scenarios_dir = "./data/scenarios"
        if os.path.exists(scenarios_dir):
            seeded = 0
            for fname in sorted(os.listdir(scenarios_dir)):
                if not fname.endswith(".json"):
                    continue
                fpath = os.path.join(scenarios_dir, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        config = json.load(f)
                except Exception as exc:
                    print(f"[startup] WARNING: Could not read {fpath}: {exc}")
                    continue

                sid = config.get("id")
                if not sid:
                    print(f"[startup] WARNING: {fname} has no 'id' field — skipping")
                    continue

                existing = db.query(Scenario).filter(Scenario.id == sid).first()
                if existing:
                    existing.config_json = config
                    existing.name = config.get("name", sid)
                else:
                    db.add(Scenario(
                        id=sid,
                        name=config.get("name", sid),
                        config_json=config,
                    ))
                seeded += 1
            db.commit()
            print(f"[startup] Seeded/updated {seeded} scenarios from {scenarios_dir}")
        else:
            print(f"[startup] WARNING: scenarios_dir not found: {scenarios_dir}")
    finally:
        db.close()

    print("[startup] UrjaTwin API ready.")
    print("[startup] Docs: http://localhost:8000/docs")
