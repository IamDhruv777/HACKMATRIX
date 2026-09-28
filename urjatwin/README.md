# UrjaTwin — Digital Twin for Renewable Distribution Grid Management

> **Simulation Prototype** | **Synthetic Demo Data**

UrjaTwin predicts distribution-grid operating conditions and evaluates corrective actions to improve renewable utilization while respecting electrical and equipment limits.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         URJATWIN                                 │
│                                                                  │
│  Frontend (React + TypeScript + Vite)  :5173                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Dashboard | Network Twin | Forecasting | Scenario Sim    │   │
│  │ Action Comparison | Run History | Data Sources | Settings│   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │ HTTP/REST (/api/*)                 │
│  Backend (FastAPI + Python) :8000                               │
│  ┌──────────────────────────┴───────────────────────────────┐   │
│  │ Network Service → pandapower AC Power Flow               │   │
│  │ Data Service → Synthetic profiles (seed=42)              │   │
│  │ Forecast Service → HistGradientBoostingRegressor         │   │
│  │ Constraint Service → Voltage/Thermal checker             │   │
│  │ Battery Service → Energy accounting                      │   │
│  │ Switching Service → NetworkX topology validation         │   │
│  │ Action Service → Corrective action comparison            │   │
│  │ Explanation Service → Deterministic templates            │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│  SQLite Database (urjatwin.db)                                  │
│  Data: data/demo/demo_profiles.csv                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn

### 1. Backend Setup

```bash
cd urjatwin/backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# or (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env   # Windows
# cp .env.example .env   # Mac/Linux

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

Backend will be available at: http://localhost:8000  
API docs: http://localhost:8000/docs

### 2. Frontend Setup

```bash
cd urjatwin/frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend will be available at: http://localhost:5173

### 3. Verify Everything Works

```bash
# Check backend health
curl http://localhost:8000/api/health

# Should return: {"status": "ok", "version": "1.0.0", ...}
```

---

## Network Model

**Base Network:** Baran-Wu 33-bus benchmark (pandapower built-in)

| Parameter | Value |
|-----------|-------|
| Nominal voltage | 12.66 kV |
| Buses | 33 (Bus 0 = substation) |
| Branches | 32 radial + 3 tie lines |
| Type | Modelled distribution feeder (NOT an actual Maharashtra feeder) |

**Added assets:**
| Asset | Bus | Capacity |
|-------|-----|----------|
| PV Array 1 | 5 | 0.5 MW |
| PV Array 2 | 10 | 0.8 MW |
| PV Array 3 | 17 | 0.6 MW |
| PV Array 4 | 24 | 0.7 MW |
| PV Array 5 | 30 | 0.4 MW |
| Community Battery | 18 | 2.0 MWh / 0.5 MW |

**Upstream Transformer:**
- HV: 33 kV → LV: 12.66 kV
- Rated power: 5.0 MVA
- Loading limit: 100%

**Tie Connections (normally open):**
- Tie 1: Bus 7 → Bus 20
- Tie 2: Bus 8 → Bus 21
- Tie 3: Bus 11 → Bus 21

**Line thermal ratings:** 200 A (documented assumption — not from benchmark)

---

## Scenarios

| ID | Name | Expected Outcome |
|----|------|-----------------|
| `normal_operation` | Normal Operation | No violations |
| `solar_heavy` | Solar-Heavy Afternoon | Correctable by battery/switching |
| `evening_peak` | Evening Peak | Correctable by battery discharge |
| `cloud_passage` | Cloud Passage | Forecast error demonstration |
| `equipment_unavailable` | Equipment Unavailable | Limited options |
| `insufficient_flexibility` | Insufficient Flexibility | **Unresolved violations** |

---

## Demonstration Script

See [`docs/demo_script.md`](docs/demo_script.md) for the complete walkthrough.

### Quick Demo Sequence

1. **Open Dashboard** → Select "Solar-Heavy Afternoon" scenario
2. **Run Baseline** → See voltage rise violations (overvoltage at downstream buses)
3. **Go to Action Comparison** → Compare Battery/Switching/Curtailment
4. **Inspect Network Twin** → See buses colored red/amber/green
5. **Go to Forecasting** → See demand and solar forecasts
6. **Select "Insufficient Flexibility"** → Run baseline → Compare actions → See unresolved status
7. **Export Report** → Download JSON or CSV from Run History

---

## Operating Limits (Project Targets)

> These are project operating targets, not universal regulatory requirements.

| Parameter | Value |
|-----------|-------|
| Voltage band | 0.95 – 1.05 pu |
| Max line loading | 100% of declared rating |
| Max transformer loading | 100% |
| Battery SOC bounds | 10% – 95% |
| Default curtailment allowance | 30% of available PV |

---

## Data Provenance

- All displayed electrical results come from **pandapower AC power flow simulations**
- Demand and solar profiles are **synthetic** (seed=42), clearly labelled
- Not labelled as measured Maharashtra SLDC data
- Fixed seed ensures **reproducibility**
- Maharashtra SLDC references listed on Data Sources page for context only

---

## Sign Conventions

| Quantity | Positive direction |
|----------|-------------------|
| Battery charging power | Battery absorbs from grid |
| Battery discharging power | Battery injects to grid |
| pandapower storage p_mw | Positive = discharge (generation) |
| Boundary import | Power flows from grid into feeder |
| PV generation | Always positive |

---

## Limitations

1. **Balanced network only** — Phase imbalance and protection dynamics not modelled
2. **Steady-state** — No dynamic simulations or transient stability
3. **Single time step** — Corrective actions evaluated at one snapshot (not full MPC)
4. **Simplified switching** — No protection coordination validation
5. **Synthetic data** — No real utility measurements used
6. **Prototype** — Not for real-world grid control

---

## Project Structure

```
urjatwin/
  frontend/          React+TypeScript frontend
  backend/           FastAPI Python backend
  data/
    demo/            Synthetic demo profiles (CSV)
    scenarios/       Scenario configuration (JSON)
    assumptions/     Equipment rating assumptions
  docs/
    architecture.md
    modelling_assumptions.md
    data_sources.md
    demo_script.md
  README.md
```

---

## References

- **pandapower**: https://www.pandapower.org/
- **Baran & Wu (1989)**: "Network Reconfiguration in Distribution Systems"
- **MSLDC**: https://mahasldc.in/ (context only)

---

*UrjaTwin is a simulation and recommendation tool. It does not control physical equipment.*
