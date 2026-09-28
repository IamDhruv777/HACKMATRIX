# UrjaTwin Demo Script

**Purpose:** Guide for demonstrating and verifying the working prototype  
**Audience:** Technical reviewers and student demonstrations  
**Duration:** ~15 minutes for full walkthrough

---

## Prerequisites

1. Backend running at http://localhost:8000
2. Frontend running at http://localhost:5173
3. No internet connection required (all data is bundled)

---

## Step 1: Verify System Health

Open http://localhost:8000/docs in a browser.

Check: `GET /api/health` returns `{"status": "ok"}`.

Open http://localhost:5173 — the Dashboard should load with scenario selector populated.

---

## Step 2: Normal Operation (Baseline Verification)

**Goal:** Confirm the base network produces no violations under normal conditions.

1. On Dashboard: Select **"Normal Operation"** scenario
2. Click **Run Baseline**
3. Wait for progress bar to complete (~5-10 seconds)
4. Expected result:
   - All bus voltages: 0.95–1.05 pu ✅
   - All line loadings: < 100% ✅
   - Violation count: 0
5. Click **Compare Actions** → Should show NO_ACTION as selected (no intervention needed)

**Verification:** A correctly configured normal case must satisfy all limits without intervention.

---

## Step 3: Solar-Heavy Afternoon (Correctable Scenario)

**Goal:** Demonstrate voltage rise from excess PV, then show correction.

1. Select **"Solar-Heavy Afternoon"** scenario  
   *(High PV near downstream buses, low local demand)*
2. Click **Run Baseline**
3. Expected baseline violations:
   - Overvoltage at buses 30-32 (voltage > 1.05 pu)
   - Possible transformer loading warning
4. Click **Compare Actions**
5. Expected comparison results:
   - **NO_ACTION**: REJECTED (overvoltage remains)
   - **BATTERY_ONLY (charge)**: FEASIBLE (battery absorbs excess PV)
   - **CURTAILMENT_ONLY (10%)**: FEASIBLE
   - **COMBINED**: FEASIBLE (best curtailment performance)
6. Go to **Network Twin** → See buses 30-32 colored amber/red in baseline, green after action
7. The explanation should state: *"Overvoltage predicted at bus 30 (1.063 pu vs limit 1.05 pu)..."*

---

## Step 4: Evening Peak (Discharge Scenario)

**Goal:** Demonstrate undervoltage from high demand with no solar.

1. Select **"Evening Peak"** scenario  
   *(1.3× demand, near-zero solar, 18:00 IST)*
2. Run Baseline
3. Expected baseline violations:
   - Undervoltage at terminal buses (Bus 17-18 range, voltage < 0.95 pu)
   - Line loading warnings on main feeder
4. Compare Actions:
   - **BATTERY_ONLY (discharge)**: FEASIBLE — battery supports voltage
   - **SWITCHING**: may improve power path
   - **COMBINED**: optimal
5. Note the battery SOC trajectory in the Before/After chart

---

## Step 5: Cloud Passage (Forecast Error)

**Goal:** Show sudden solar drop and forecast limitation.

1. Select **"Cloud Passage"** scenario  
   *(Solar drops to 20% of forecast)*
2. Run Baseline
3. Go to **Forecasting page** to see the forecast error
4. The forecast assumed higher PV; actual is much lower
5. This demonstrates reserve limitations when actual < forecast

---

## Step 6: Equipment Unavailable (Limited Options)

**Goal:** Demonstrate rejection of actions requiring unavailable equipment.

1. Select **"Equipment Unavailable"** scenario  
   *(Tie switches 0 and 1 are unavailable)*
2. Run Baseline → Evening peak violations expected
3. Compare Actions:
   - **SWITCHING (using tie 0 or 1)**: REJECTED — "Switch unavailable"
   - **BATTERY_ONLY**: may still be feasible
   - **COMBINED with only tie 2**: evaluated
4. Shows how equipment constraints propagate to action rejection

---

## Step 7: Insufficient Flexibility (Unresolved Case)

**Goal:** Demonstrate an honest "no feasible solution" result.

1. Select **"Insufficient Flexibility"** scenario  
   *(High solar, battery nearly full at 94%, all tie switches unavailable, curtailment limit = 5%)*
2. Run Baseline → Overvoltage violations expected
3. Compare Actions — All candidates should be REJECTED:
   - **BATTERY_ONLY**: REJECTED — battery near full, cannot absorb enough PV
   - **SWITCHING_ONLY**: REJECTED — all switches unavailable
   - **CURTAILMENT_ONLY**: REJECTED — 5% curtailment insufficient
   - **COMBINED**: REJECTED — combination still insufficient
4. **Status: NO_FEASIBLE_CANDIDATE**
5. Explanation should read: *"After evaluating N candidates... violations remain. Battery cannot help: SOC at 94%, max charge is X MW but Y MW absorption needed..."*

**This is the critical unresolved case — it must show an honest failure, not fabricated success.**

---

## Step 8: Forecasting Module

1. Go to **Forecasting** page
2. Select scenario and 1-hour horizon
3. See:
   - Actual vs Predicted demand chart
   - MAE and RMSE vs persistence baseline
   - Training/validation/test split information
4. Try 4-hour horizon — error should increase
5. Solar forecast should show zero at night (consistent with physics)

---

## Step 9: Export and Reproducibility

1. Go to **Run History**
2. Find a completed run
3. Click **Export JSON** → Download full run configuration + results
4. Click **Export CSV** → Download time-series metrics
5. Reopen the run → Results should match (no re-simulation needed)

---

## Step 10: Settings Verification

1. Go to **Settings**
2. Change voltage band to 0.96–1.04 pu
3. Return to Normal Operation and re-run
4. Some buses that were previously OK may now show violations
5. Reset to defaults
6. Verify changes persist between pages

---

## Verification Checklist

| Test | Expected | Status |
|------|----------|--------|
| Backend health endpoint | `{"status": "ok"}` | |
| Network loads successfully | 33 buses, 32+ lines | |
| Normal operation: 0 violations | ✅ | |
| Solar-heavy: baseline overvoltage | > 1.05 pu at terminal buses | |
| Battery charge action: FEASIBLE | Resolves overvoltage | |
| Evening peak: undervoltage | < 0.95 pu | |
| Battery discharge: FEASIBLE | Resolves undervoltage | |
| Insufficient flexibility: NO_FEASIBLE_CANDIDATE | Honest unresolved | |
| Export JSON contains actual results | Not UI settings | |
| Forecast MAE reported | Non-zero, labelled synthetic | |
| Network Twin shows colors | Green/amber/red | |
| Sim time ≠ wall-clock time | Clearly distinguished | |
| "Simulation Prototype" badge visible | In sidebar | |
| "Synthetic Demo" badge visible | In sidebar | |

---

## Known Limitations (Demonstrate Honestly)

1. **Single time step simulation:** Action comparison at one snapshot, not full-horizon MPC
2. **Balanced network:** Phase imbalance not modelled
3. **Simplified switching:** No protection coordination
4. **Synthetic profiles:** Not real MSLDC measurements
5. **Combinatorial search bounded:** Maximum 20 combined candidates evaluated

---

*End of demo script. For questions: see README.md and docs/modelling_assumptions.md*
