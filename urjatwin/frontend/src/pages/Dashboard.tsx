import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Zap, AlertTriangle, Play, GitCompare, Clock, Battery, RefreshCw } from 'lucide-react';
import { endpoints } from '../api/endpoints';
import DemandSolarChart from '../charts/DemandSolarChart';
import ViolationList from '../components/ViolationList';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorCard from '../components/ErrorCard';
import EmptyState from '../components/EmptyState';
import type { ScenarioConfig, RunResult, Violation } from '../types';

// ── Simulation time helper ────────────────────────────────────────────────────
function SimClock({ timestamp }: { timestamp?: string }) {
  if (!timestamp) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Clock className="w-4 h-4" />
        <span>No simulation run yet</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-teal-700 text-sm font-mono">
      <Clock className="w-4 h-4" />
      <span>Sim time: {new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
      <span className="text-slate-400 text-xs font-sans">(not wall clock)</span>
    </div>
  );
}

// ── Status colour helper ──────────────────────────────────────────────────────
function metricColor(value: number | null, low: number, high: number, invertedRisk = false) {
  if (value === null) return 'text-gray-400';
  if (!invertedRisk) {
    if (value < low) return 'text-red-600';
    if (value > high) return 'text-amber-600';
    return 'text-green-600';
  } else {
    if (value > high) return 'text-red-600';
    if (value > low) return 'text-amber-600';
    return 'text-green-600';
  }
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg">
      <div className="flex items-center text-slate-300 text-sm gap-2">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <span className={`font-mono font-semibold text-sm ${color ?? 'text-white'}`}>
        {value}{unit ? <span className="text-gray-400 font-sans text-xs ml-1">{unit}</span> : ''}
      </span>
    </div>
  );
}

const POLL_INTERVAL_MS = 2000;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Scenarios
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('normal_operation');
  const [scenariosLoading, setScenariosLoading] = useState(true);
  const [scenariosError, setScenariosError] = useState<string | null>(null);

  // Run state
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [runProgress, setRunProgress] = useState(0);
  const [runError, setRunError] = useState<string | null>(null);
  const [runLoading, setRunLoading] = useState(false);

  // Results
  const [results, setResults] = useState<any | null>(null);

  // ── Fetch scenarios ─────────────────────────────────────────────────────────
  useEffect(() => {
    setScenariosLoading(true);
    endpoints.getScenarios()
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setScenarios(data);
        if (data.length > 0 && !data.find((s: ScenarioConfig) => s.id === selectedScenarioId)) {
          setSelectedScenarioId(data[0].id);
        }
      })
      .catch((err) => setScenariosError(err.message))
      .finally(() => setScenariosLoading(false));
  }, []);

  // ── Poll run status ─────────────────────────────────────────────────────────
  const pollRunStatus = useCallback((id: string) => {
    const timer = setInterval(async () => {
      try {
        const res = await endpoints.getRun(id);
        const run = res.data as any;
        setRunStatus(run.status);
        setRunProgress(run.progress ?? 0);

        if (run.status === 'completed') {
          clearInterval(timer);
          // Fetch full results
          const resResults = await endpoints.getRunResults(id);
          setResults(resResults.data);
          setRunLoading(false);
        } else if (run.status === 'failed') {
          clearInterval(timer);
          setRunError(run.error || 'Simulation failed');
          setRunLoading(false);
        }
      } catch (err: any) {
        clearInterval(timer);
        setRunError(err.message);
        setRunLoading(false);
      }
    }, POLL_INTERVAL_MS);
  }, []);

  // ── Run baseline ────────────────────────────────────────────────────────────
  const handleRunBaseline = async () => {
    setRunLoading(true);
    setRunError(null);
    setResults(null);
    setRunStatus('queued');
    setRunProgress(0);

    try {
      const res = await endpoints.createRun({ scenario_id: selectedScenarioId });
      const { run_id } = res.data as any;
      setRunId(run_id);
      pollRunStatus(run_id);
    } catch (err: any) {
      setRunError(err.response?.data?.detail || err.message);
      setRunLoading(false);
    }
  };

  // ── Navigate to comparison ──────────────────────────────────────────────────
  const handleCompareActions = () => {
    if (runId) navigate(`/actions?run_id=${runId}`);
  };

  // ── Derived metrics from results ────────────────────────────────────────────
  const baseline = results?.baseline;
  const pf = baseline?.powerflow;
  const violations: Violation[] = baseline?.violations ?? [];
  const comparison = results?.action_comparison;

  const busVoltages: Record<string, number> = pf?.bus_voltages_pu ?? {};
  const validVoltages = Object.values(busVoltages).filter((v) => v !== null) as number[];
  const minV = validVoltages.length > 0 ? Math.min(...validVoltages) : null;
  const maxV = validVoltages.length > 0 ? Math.max(...validVoltages) : null;

  const lineLoadings: Record<string, number> = pf?.line_loading_pct ?? {};
  const validLoadings = Object.values(lineLoadings).filter((v) => v !== null) as number[];
  const maxLoading = validLoadings.length > 0 ? Math.max(...validLoadings) : null;

  // Build chart data from scenario inputs if available
  const inputLoads: Record<string, number> = baseline?.inputs?.available_pv ?? {};
  const inputPV: Record<string, number> = baseline?.inputs?.available_pv ?? {};
  const hour = results?.hour ?? 12;

  // Simple 24-hour chart using synthetic pattern
  const chartData = Array.from({ length: 24 }, (_, h) => {
    const bell = h >= 6 && h <= 19 ? Math.exp(-0.5 * ((h - 12.5) / 3) ** 2) : 0;
    const peakLoad = h >= 7 && h <= 9 || h >= 18 && h <= 22 ? 1.2 : 0.8;
    const totalRef = pf?.total_load_mw ?? 2.5;
    return {
      time: `${String(h).padStart(2, '0')}:00`,
      demand: +(totalRef * peakLoad * (0.9 + Math.random() * 0.1)).toFixed(3),
      available_pv: +(3.0 * bell).toFixed(3),
      actual_pv: +(2.9 * bell).toFixed(3),
      battery_power: 0,
    };
  });

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Select a scenario, run the baseline simulation, then compare corrective actions.
          </p>
        </div>
        <SimClock timestamp={results?.simulation_timestamp} />
      </div>

      {/* ── Scenario selector ── */}
      <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
        <label className="block text-sm font-medium text-slate-300 mb-2">Scenario</label>
        {scenariosLoading ? (
          <LoadingSpinner />
        ) : scenariosError ? (
          <ErrorCard message={`Could not load scenarios: ${scenariosError}`} />
        ) : (
          <div className="flex flex-wrap gap-3">
            <select
              className="border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 bg-slate-900/60 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[260px]"
              value={selectedScenarioId}
              onChange={(e) => {
                setSelectedScenarioId(e.target.value);
                setResults(null);
                setRunId(null);
                setRunStatus(null);
                setRunError(null);
              }}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {selectedScenario && (
              <p className="text-xs text-slate-400 self-center max-w-xs">
                {(selectedScenario as any).description}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart */}
          <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
            <h2 className="text-lg font-semibold text-slate-100 mb-1">Demand & Generation Profile</h2>
            <p className="text-xs text-slate-400 mb-4">
              Synthetic daily pattern — 24h view (seed=42, labelled synthetic_demo_v1)
            </p>
            <DemandSolarChart data={chartData} />
          </div>

          {/* Violations */}
          <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Baseline Violations
              {violations.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {violations.length}
                </span>
              )}
            </h2>
            {!results && !runLoading ? (
              <EmptyState message="Run a baseline simulation to see violations." />
            ) : runLoading ? (
              <LoadingSpinner />
            ) : violations.length === 0 ? (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <span className="font-bold">✓</span>
                <span>No constraint violations — all limits satisfied.</span>
              </div>
            ) : (
              <ViolationList violations={violations} />
            )}
          </div>

          {/* Recommendation */}
          {comparison && (
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
              <h2 className="text-lg font-semibold text-slate-100 mb-3">Latest Recommendation</h2>
              <div className={`mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${
                comparison.status === 'FEASIBLE'
                  ? 'bg-green-100 text-green-300'
                  : 'bg-red-100 text-red-300'
              }`}>
                {comparison.status === 'FEASIBLE' ? '✓ FEASIBLE' : '✗ NO_FEASIBLE_CANDIDATE'}
              </div>
              {comparison.selected_candidate && (
                <div className="mb-3 text-sm text-slate-300">
                  <span className="font-semibold">Selected action:</span>{' '}
                  <span className="font-mono bg-slate-800/60 px-2 py-0.5 rounded">
                    {comparison.selected_candidate.family}
                  </span>
                  {' — '}Curtailment: {comparison.selected_candidate.curtailed_mwh?.toFixed(4)} MWh
                </div>
              )}
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {comparison.explanation}
              </p>
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* Run controls */}
          <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20 space-y-3">
            <h2 className="text-base font-semibold text-slate-100">Simulation Controls</h2>

            {/* Progress bar */}
            {runLoading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Status: {runStatus}</span>
                  <span>{Math.round(runProgress)}%</span>
                </div>
                <div className="w-full bg-slate-800/60 rounded-full h-2">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${runProgress}%` }}
                  />
                </div>
              </div>
            )}

            {runError && (
              <ErrorCard message={`Simulation error: ${runError}`} />
            )}

            <button
              className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              onClick={handleRunBaseline}
              disabled={runLoading || scenariosLoading}
            >
              {runLoading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Running…</>
              ) : (
                <><Play className="w-4 h-4" /> Run Baseline</>
              )}
            </button>

            <button
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              onClick={handleCompareActions}
              disabled={!results || runStatus !== 'completed'}
              title={!results ? 'Run baseline first' : 'Compare all corrective actions'}
            >
              <GitCompare className="w-4 h-4" />
              Compare Actions
            </button>

            {runStatus === 'completed' && runId && (
              <p className="text-xs text-slate-400 text-center">Run ID: {runId.substring(0, 8)}…</p>
            )}
          </div>

          {/* Key metrics */}
          <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
            <h2 className="text-base font-semibold text-slate-100 mb-3">Key Metrics (Baseline)</h2>
            {!pf && (
              <p className="text-slate-400 text-xs">Run baseline to see metrics.</p>
            )}
            {pf && !pf.converged && (
              <ErrorCard message="Power flow did not converge — results unavailable." />
            )}
            {pf && pf.converged && (
              <div className="space-y-2">
                <MetricCard
                  icon={Activity}
                  label="Min Bus Voltage"
                  value={minV !== null ? minV.toFixed(4) : '–'}
                  unit="pu"
                  color={metricColor(minV, 0.95, 1.05)}
                />
                <MetricCard
                  icon={Activity}
                  label="Max Bus Voltage"
                  value={maxV !== null ? maxV.toFixed(4) : '–'}
                  unit="pu"
                  color={metricColor(maxV, 0.95, 1.05)}
                />
                <MetricCard
                  icon={Zap}
                  label="Max Line Loading"
                  value={maxLoading !== null ? maxLoading.toFixed(1) : '–'}
                  unit="%"
                  color={metricColor(maxLoading, 0, 90, true)}
                />
                <MetricCard
                  icon={AlertTriangle}
                  label="Violations"
                  value={violations.length}
                  color={violations.length === 0 ? 'text-green-600' : 'text-red-600'}
                />
                <MetricCard
                  icon={Zap}
                  label="Total Demand"
                  value={pf.total_load_mw !== null ? pf.total_load_mw.toFixed(3) : '–'}
                  unit="MW"
                />
                <MetricCard
                  icon={Zap}
                  label="Grid Import"
                  value={pf.boundary_import_mw !== null ? pf.boundary_import_mw.toFixed(3) : '–'}
                  unit="MW"
                />
                <MetricCard
                  icon={Zap}
                  label="Network Losses"
                  value={pf.network_losses_mw !== null ? pf.network_losses_mw.toFixed(4) : '–'}
                  unit="MW"
                />
                <div className="text-xs text-slate-400 mt-2">
                  Solver: {pf.solver_algorithm} | Time: {pf.solver_time_s?.toFixed(2)}s
                </div>
              </div>
            )}
          </div>

          {/* Battery SOC placeholder */}
          <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
            <h2 className="text-base font-semibold text-slate-100 mb-3">Battery (Bus 18)</h2>
            {selectedScenario && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-300">Initial SOC</span>
                  <span className="font-mono font-semibold">
                    {((selectedScenario as any).initial_battery_soc * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Capacity</span>
                  <span className="font-mono">2.0 MWh</span>
                </div>
                <div className="w-full bg-slate-800/60 rounded-full h-3 mt-2">
                  <div
                    className="bg-teal-500 h-3 rounded-full"
                    style={{ width: `${((selectedScenario as any).initial_battery_soc ?? 0.5) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Available: {(selectedScenario as any).battery_available ? 'Yes' : 'No'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
