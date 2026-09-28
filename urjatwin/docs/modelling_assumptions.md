# UrjaTwin — Modelling Assumptions

**Version:** 1.0  
**Date:** 2024-01  
**Status:** Prototype

---

## Network Model

### Base Network
- **Source:** Baran & Wu (1989) 33-bus benchmark, as implemented in pandapower (`pandapower.networks.case33bw()`)
- **Voltage level:** 12.66 kV distribution
- **Topology:** Radial, 33 buses, 32 branches
- **Identity:** This is a benchmark/modelled feeder. It is NOT an actual Maharashtra 11 kV feeder.

### Bus Numbering
- Internal bus indices match pandapower: 0–32
- Bus 0 = substation / reference bus
- Bus 1–32 = distribution buses

### Upstream Transformer (Added)
| Parameter | Value | Source |
|-----------|-------|--------|
| HV voltage | 33 kV | Project assumption |
| LV voltage | 12.66 kV | Matches base network |
| Rated power | 5.0 MVA | Project assumption |
| Short-circuit voltage | 6% | Typical distribution |
| Resistance | 1.5% | Typical distribution |
| Iron losses | 20 kW | Typical distribution |
| No-load current | 0.4% | Typical distribution |
| Loading limit | 100% | Project assumption |

### Line Thermal Ratings
- **All lines:** 200 A (0.2 kA)
- **Source:** Project assumption — the original benchmark does not specify thermal ratings
- **Stored in:** `data/assumptions/line_ratings.json`
- At 12.66 kV, 200 A corresponds to approximately 4.4 MVA three-phase

### PV Installations (Added)
| Asset ID | Bus | Capacity (MW) | Basis |
|----------|-----|---------------|-------|
| PV_5 | 5 | 0.5 | Project assumption |
| PV_10 | 10 | 0.8 | Project assumption |
| PV_17 | 17 | 0.6 | Project assumption |
| PV_24 | 24 | 0.7 | Project assumption |
| PV_30 | 30 | 0.4 | Project assumption |

### Community Battery (Added)
| Parameter | Value | Basis |
|-----------|-------|-------|
| Bus | 18 | Project assumption |
| Energy capacity | 2.0 MWh | Project assumption |
| Max charge power | 0.5 MW | Project assumption |
| Max discharge power | 0.5 MW | Project assumption |
| Charge efficiency | 95% | Typical Li-ion |
| Discharge efficiency | 95% | Typical Li-ion |
| Min SOC | 10% | Project assumption |
| Max SOC | 95% | Project assumption |

### Tie Connections (Added)
| Tie | From Bus | To Bus | Status |
|-----|----------|--------|--------|
| Tie-0 | 7 | 20 | Normally open |
| Tie-1 | 8 | 21 | Normally open |
| Tie-2 | 11 | 21 | Normally open |

Tie line impedances: approximated as 0.5 × adjacent line impedances.

---

## Scope Limitations

The following are explicitly outside this version:

1. **Phase imbalance** — The network is modelled as balanced three-phase
2. **Protection dynamics** — No relay coordination or fault analysis
3. **Switching sequences** — Evaluated actions are steady-state candidates only
4. **Transient stability** — No dynamic simulations
5. **Demand response** — Loads treated as fixed at each time step
6. **Reactive control** — PV inverter reactive capability not modelled in this version
7. **Tap changers** — Fixed transformer tap
8. **Voltage regulators** — Not included in benchmark
9. **Distributed generation ramp rates** — Not modelled
10. **Behind-the-meter PV** — Demand profiles are gross consumption (pre-PV)

---

## Operating Limits

These are **project operating targets**, not universal regulatory requirements.

| Parameter | Value | Label |
|-----------|-------|-------|
| Voltage band | 0.95 – 1.05 pu | Project target |
| Line loading limit | 100% of declared rating | Project target |
| Transformer loading limit | 100% of rated MVA | Project target |

> The ±5% voltage band is commonly used in distribution studies. Actual operational limits depend on utility standards and regulatory frameworks, which vary by region.

---

## Power Flow Solver

- **Primary solver:** Backward-Forward Sweep (bfsw) — appropriate for radial networks
- **Fallback solver:** Newton-Raphson (nr)
- **Non-convergence:** Treated as failed simulation — results are NOT returned
- **Sign convention for storage:** pandapower convention: p_mw > 0 = discharge (generation)
- **Reference bus:** Bus 0 (external grid / substation)

---

## Battery Energy Accounting

```
Charging (p_charge_mw > 0):
  E_next = E_current + eta_charge × p_charge_mw × dt_hours

Discharging (p_discharge_mw > 0):
  E_next = E_current - p_discharge_mw × dt_hours / eta_discharge
```

Units: E in MWh, P in MW, dt in hours, eta dimensionless (0–1).

Constraints enforced:
- E_next ≥ E_min (min_soc × capacity)
- E_next ≤ E_max (max_soc × capacity)
- p_charge ≤ max_charge_mw
- p_discharge ≤ max_discharge_mw
- No simultaneous charging and discharging

---

## Synthetic Data

- **Seed:** 42 (fixed for reproducibility)
- **Duration:** 7 days (168 hours)
- **Resolution:** 1 hour
- **Start time:** 2024-01-15 00:00:00 IST (UTC+5:30)
- **Profile shapes:** Bell curves, diurnal patterns, Gaussian noise
- **Provenance tag:** "synthetic_demo_v1"
- **NOT:** Real measurements from any utility

### Labelling
- All synthetic data clearly marked "Synthetic Demo" in UI and exports
- CSV includes `provenance` column = "synthetic_demo_v1"
- Quality flags: 'good' for generated, 'estimated' for interpolated

---

## MSLDC Data

References to Maharashtra State Load Dispatch Centre data are provided on the Data Sources page for research context only.

- State-level grid observations are not measurements of this modelled feeder
- No public MSLDC API exists; startup does not depend on internet access
- No authenticated operational systems are accessed
- Allocating state profiles to individual buses would require engineering assumptions that are not claimed here

---

## Reproducibility

Each saved run stores:
- Scenario configuration (with multipliers)
- Initial battery state
- Network version identifier
- Random seed used
- Solver settings
- Operating limits in effect
- Candidate search parameters

A saved run can be reopened and inspected without re-simulation.

---

*This document should be updated whenever network parameters, limits, or modelling scope changes.*
