export interface NetworkElement {
  id: string;
  bus_from: number;
  bus_to: number;
  type: string;
}

export interface PowerFlowResult {
  converged: boolean;
  bus_voltages_pu: Record<string, number>;
  line_loading_pct: Record<string, number>;
  trafo_loading_pct: Record<string, number>;
}

export interface Violation {
  type: string;
  element_id: string;
  actual_value: number;
  limit: number;
  unit: string;
  severity: 'warning' | 'critical';
  explanation: string;
}

export interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  demand_multiplier: number;
  solar_multiplier: number;
  initial_battery_soc: number;
}

export interface CandidateResult {
  id: string;
  family: string;
  battery_p_mw: number;
  switching_ops: any[];
  curtailment_pct: number;
  num_violations: number;
  feasible: boolean;
  violations: Violation[];
  curtailed_mwh: number;
  network_losses_mw: number;
  battery_throughput: number;
  rejection_reason?: string;
}

export interface RunResult {
  run_id: string;
  status: string;
  progress: number;
  baseline: PowerFlowResult;
  candidates: CandidateResult[];
  selected: CandidateResult;
  explanation: string;
}

export interface ForecastResult {
  forecast_horizon_h: number;
  forecast_values: number[];
  forecast_timestamps: string[];
  actual_values: number[];
  mae: number;
  rmse: number;
}

export interface BatteryState {
  energy_mwh: number;
  soc: number;
  capacity_mwh: number;
  min_soc: number;
  max_soc: number;
  available: boolean;
}
