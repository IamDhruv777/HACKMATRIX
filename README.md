# UrjaTwin
**From reactive operations to predictive grid control.**

UrjaTwin is an autonomous Digital Twin for Renewable Distribution Grid Management that models physical power flows, forecasts renewable generation, detects thermal and voltage violations, simulates corrective actions, and prioritizes grid stability—end to end, backed by real AC power flow physics.

## Table of Contents
- [What is UrjaTwin?](#what-is-urjatwin)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Real-World Scenario](#real-world-scenario)
- [Key Features](#key-features)
- [Product Walkthrough](#product-walkthrough)
- [How It Works](#how-it-works)
- [System Architecture](#system-architecture)
- [End-to-End Data Flow](#end-to-end-data-flow)
- [Simulation Architecture](#simulation-architecture)
- [Action Evaluation Engine](#action-evaluation-engine)
- [Failure Recovery & Safe Abstention](#failure-recovery--safe-abstention)
- [Engineering Challenges & Solutions](#engineering-challenges--solutions)
- [Technical Decisions](#technical-decisions)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Demo](#running-the-demo)
- [5-Minute Demo](#5-minute-demo)
- [Roadmap](#roadmap)
- [Limitations](#limitations)
- [Hackathon](#hackathon)
- [Team](#team)
- [License](#license)

---

## What is UrjaTwin?
UrjaTwin is not just a dashboard. It is not an AI chatbot layered over mock data. It is a full-scale simulation control system that closes the grid-operations loop:  
**FORECAST → SIMULATE → DETECT → EVALUATE → RECOMMEND → PREVENT**

A distribution grid operator manages complex physical systems: solar arrays, community batteries, transformers, and load fluctuations. These systems frequently experience limits—because of high solar injection, sudden evening demand peaks, or cloud passages.

A naive system stops at: *"Voltage is high at Bus 30."*  
UrjaTwin asks: *"Why is the voltage high?"* Then: *"What happens if we curtail PV by 10%?"* Then: *"What if we switch tie-line 1 instead?"* Then: *"Which combination of actions minimizes renewable curtailment while restoring grid constraints?"*

## The Problem
A modern distribution grid is highly volatile. The introduction of distributed energy resources (DERs) like rooftop solar and electric vehicles has turned passive distribution networks into active, two-way power corridors.

Operators face these core issues:
- **Voltage Violations:** High solar generation during low-demand periods pushes voltages dangerously high.
- **Thermal Overloads:** Evening peaks (high load, zero solar) stress lines and transformers.
- **Trial-and-Error Control:** Operators currently guess whether switching a line or curtailing a generator will fix a problem without causing a new one downstream.

At scale, this becomes dangerous, slow, and expensive. Basic telemetry tools do not catch future problems. They do not simulate physics. They do not tell you the optimal action to take.

## The Solution
**RAW GRID DATA ↓ ML FORECASTING ↓ AC POWER FLOW SIMULATION ↓ CONSTRAINT DETECTION ↓ MULTI-DIMENSIONAL ACTION SEARCH ↓ LEXICOGRAPHIC RANKING ↓ EXPLANATION GENERATION ↓ GRID STABILITY**

Each stage is mathematically verifiable. Physical truth is owned by the `pandapower` AC simulation engine.

## Real-World Scenario
*These scenarios illustrate the system's reasoning using the Baran-Wu 33-bus benchmark network.*

### Case 1 — Auto-Corrected: Solar-Heavy Afternoon
**Condition:** High PV generation (Multiplier: 1.0), low demand (Multiplier: 0.7).  
**Initial State:** Simulation detects 22 overvoltage violations on peripheral buses.  
**UrjaTwin Evaluation:** Simulates 100+ combinations of battery charging, network switching, and curtailment.  
**Outcome:** Selects `BATTERY_CHARGE + SWITCHING_TIE_1`. Resolves all 22 violations with 0% renewable curtailment. 

### Case 2 — Infeasible: Insufficient Flexibility
**Condition:** High solar, battery already at 95% SOC, transfer switches locked for maintenance.  
**UrjaTwin Evaluation:** Simulates all available curtailment levels (up to max 5% limit).  
**Outcome:** 16 voltage violations remain. System accurately reports `NO_FEASIBLE_CANDIDATE`. Explanation states that curtailment allowance is too low and battery cannot absorb excess power.

## Key Features

### A. Physics-Based AC Power Flow
Runs fully converged Newton-Raphson AC power flows using `pandapower`. No mock data—every voltage (p.u.), current (kA), and loading percentage is mathematically solved.

### B. Machine Learning Forecasting
Uses `HistGradientBoostingRegressor` to predict demand and PV generation up to 24 hours ahead, factoring in historical lags, hour-of-day, and weekend flags. Calculates real-time MAE and RMSE metrics.

### C. Multi-Dimensional Action Search
Evaluates 5 distinct action families to resolve grid constraints:
1. `NO_ACTION` (Baseline)
2. `BATTERY_ONLY` (Varying charge/discharge states)
3. `SWITCHING_ONLY` (Dynamic topology reconfiguration)
4. `CURTAILMENT_ONLY` (Clipping PV output)
5. `COMBINED` (Complex multi-agent interventions)

### D. Lexicographic Ranking
Candidates are evaluated strictly:
1. Zero violations (Hard constraint).
2. Minimize curtailed renewable energy (MWh).
3. Minimize network losses.
4. Minimize switching operations.
5. Minimize battery throughput degradation.

### E. Interactive Digital Twin UI
A custom-built `@xyflow/react` topology diagram visualizes the 33-bus network in real-time. Nodes color-shift based on voltage limits; lines color-shift based on thermal loading.

### F. Scenario Library
6 meticulously designed pre-sets (e.g., Evening Peak, Cloud Passage, Equipment Unavailable) to demonstrate extreme grid stress tests.

## Product Walkthrough

| Route | Screen | Purpose |
|-------|--------|---------|
| `/` | **Dashboard** | Grid control centre — live KPIs, simulation clock, violation summaries |
| `/network` | **Network Twin** | Interactive, color-coded 33-bus physical grid topology mapping |
| `/forecast` | **Forecasting** | ML-driven predictions vs actuals with error margin tracking |
| `/scenario` | **Simulator** | Custom scenario builder with demand/solar multipliers and equipment locks |
| `/actions` | **Action Comparison** | Deep-dive table ranking all evaluated interventions and before/after charts |
| `/history` | **Run History** | Traceable audit log of every simulation run with JSON export |
| `/data-sources`| **Data Sources** | Synthetic data ingestion and context |
| `/settings` | **Settings** | Dynamic threshold tuning (Voltage limits, Loading %, Battery boundaries) |

## How It Works

1. **Configure** — Set up a scenario via the Simulator UI (demand, solar, battery state).
2. **Dispatch** — FastAPI spins up an asynchronous background task for the simulation.
3. **Baseline** — Solves base power flow to map existing violations.
4. **Copy & Mutate** — Clones the network 100+ times, applying different switching and curtailment profiles.
5. **Evaluate** — Runs AC power flow on every clone. Validates against constraints.
6. **Rank** — Ranks feasible candidates lexicographically.
7. **Explain** — Generates a deterministic text explanation for the operator.
8. **Render** — Frontend polls for completion and paints the results onto the glassmorphic UI.

## System Architecture

### End-to-End Data Flow
`React UI` ↔ `FastAPI REST` ↔ `Action/Network Services` ↔ `Pandapower Solver` ↔ `SQLite DB`

### Simulation Architecture
The Baran-Wu 33-bus radial distribution network is structurally modified to include:
- 5 PV Arrays at key injection points
- 1 Community Battery Energy Storage System (BESS)
- 3 Normally-Open Tie Switches for topology reconfiguration
- Full reactive power scaling (`q_mvar`) proportional to active power adjustments.

## Engineering Challenges & Solutions

**1. The `NaN` JSON Serialization Crash**
- **Problem:** Pandapower dataframes frequently contain `NaN` values for unset electrical parameters, which crashes FastAPI's JSON encoder.
- **Solution:** Intercepted the dataframe records inside `network_service.py` and globally converted `np.nan` to JSON-compliant `None` before API dispatch.

**2. Reactive Power Desync**
- **Problem:** Initial candidate evaluations scaled active power (`p_mw`) for scenarios but left reactive power (`q_mvar`) static, causing severe, artificial voltage collapse.
- **Solution:** Bound `q_mvar = p_mw * 0.3` dynamically inside the action evaluator to preserve power factors during load scaling.

**3. State Contamination Between Candidates**
- **Problem:** Applying switching operations to the base network permanently altered it for subsequent evaluations.
- **Solution:** Implemented strict deep-copying (`copy.deepcopy`) of the `pandapowerNet` object for every single candidate evaluation loop.

**4. UI Theme Constraints**
- **Problem:** The basic white dashboard did not reflect the premium "Digital Twin" nature of the product.
- **Solution:** Overhauled 26+ React components into a dark, glassmorphic cyber-theme with custom glowing grid SVGs, executed via an automated Python replacement script.

## Technical Decisions

**Why `pandapower`?**
Mathematical truth. We needed a verified, industry-standard Newton-Raphson AC power flow solver. LLMs cannot calculate complex impedance mathematics.

**Why FastAPI Background Tasks?**
Simulating 100+ AC power flows takes several seconds. Standard request/response loops would timeout. The background task + polling architecture ensures a smooth UX.

**Why React Flow (`@xyflow/react`)?**
Standard charts cannot represent grid topology. React Flow allowed us to custom-map bus coordinates and dynamically style edges/nodes based on real-time simulation output.

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend Core** | React 18 + Vite + TypeScript | High-performance SPA |
| **UI Design** | Tailwind CSS 3 | Glassmorphic cyber-theme styling |
| **Grid Visualization**| React Flow (`@xyflow`) | Interactive topology mapping |
| **Charts** | Recharts | Time-series and profile tracking |
| **Backend Core** | Python 3.11 + FastAPI | Async REST API & job orchestration |
| **Grid Solver** | `pandapower` + `NetworkX` | AC Power Flow & Topology checking |
| **Machine Learning** | `scikit-learn` | HistGradientBoostingRegressor |
| **Database** | SQLite + SQLAlchemy | Persistent run/scenario storage |

## Project Structure

```
HackMatrix/
├── urjatwin/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── api/          # FastAPI routers (runs, network, scenarios)
│   │   │   ├── models/       # SQLAlchemy ORM models
│   │   │   ├── schemas/      # Pydantic validation schemas
│   │   │   └── services/     # Core logic (powerflow, constraints, actions)
│   │   ├── data/             # Scenarios JSON & Demo CSVs
│   │   └── main.py           # Application entrypoint
│   └── frontend/
│       ├── src/
│       │   ├── api/          # Axios endpoints
│       │   ├── components/   # Shared UI (Layout, Badges)
│       │   ├── pages/        # Views (Dashboard, NetworkTwin, etc.)
│       │   ├── charts/       # Recharts wrappers
│       │   └── types/        # TypeScript interfaces
│       ├── index.css         # Global cyber-theme styles
│       └── vite.config.ts    # Proxy configuration
```

## Testing
- **Pipeline Testing:** Python scripts natively test the `evaluate_actions` pipeline to verify `FEASIBLE` status for `solar_heavy` and `NO_FEASIBLE_CANDIDATE` for `insufficient_flexibility`.
- **Frontend Build:** Strict TypeScript compilation passing with 0 errors via `tsc && vite build`.

## Installation

```bash
# 1. Clone repository
git clone https://github.com/IamDhruv777/HACKMATRIX.git
cd HACKMATRIX/urjatwin

# 2. Backend Setup
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate # Mac/Linux
pip install -r requirements.txt

# 3. Frontend Setup
cd ../frontend
npm install
```

## Configuration
No complex `.env` is required for the demo. SQLite is used out-of-the-box. Ensure ports `8000` (FastAPI) and `5173` (Vite) are available.

## Running the Demo

**Terminal 1 — Backend:**
```bash
cd backend
.\venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

## 5-Minute Demo
1. **0:00–0:30** - Open `localhost:5173` — observe the glowing cyber-theme Dashboard.
2. **0:30–1:00** - Navigate to **Scenario Simulator**, load `Solar-Heavy Afternoon`, and execute. Watch the real-time polling progress bar.
3. **1:00–1:45** - Click **View Results** to enter **Action Comparison**. Show how the baseline had 22 violations, and the system intelligently picked `BATTERY_CHARGE + SWITCH` to resolve it.
4. **1:45–2:30** - Navigate to **Network Twin**. Slide through time-steps to watch the bus nodes color-shift between red (violation) and green (healthy).
5. **2:30–3:00** - Check **Forecasting** to show the ML model's accuracy on PV predictions.

## Roadmap
- **✅ Built:** Real-time AC Power flow, Action Simulation, React Flow Twin, ML Forecasting, Scenario Library, Glassmorphic UI.
- **🔜 Near-Term:** Integration with real OpenMeteo weather APIs for live solar irradiance tracking.
- **🔮 Future:** Scaling to the IEEE 123-bus benchmark and adding optimal power flow (OPF) solvers.

## Limitations
- Simulation assumes perfectly balanced 3-phase systems (positive sequence only).
- Background tasks run in-memory; scaling to hundreds of concurrent users requires Celery/Redis.
- Forecast model uses synthetic load profiles due to proprietary MSLDC data restrictions.

## Hackathon
- **Event:** HackMatrix 5.0
- **Theme:** Digital Twin / Grid Management

## Team
**Dhruv** — Full Stack & Power Systems Simulation

## License
MIT
