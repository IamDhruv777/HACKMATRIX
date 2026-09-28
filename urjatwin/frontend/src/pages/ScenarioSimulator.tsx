import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, RefreshCw, RotateCcw } from 'lucide-react';
import { endpoints } from '../api/endpoints';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorCard from '../components/ErrorCard';
import type { ScenarioConfig } from '../types';

interface SimConfig {
  scenario_id: string;
  demand_multiplier: number;
  solar_multiplier: number;
  initial_battery_soc: number;
  battery_available: boolean;
  curtailment_limit_pct: number;
  unavailable_switches: number[];
  time_step_idx: number;
}

const SWITCH_LABELS = ['Tie Switch 0 (Bus 7→20)', 'Tie Switch 1 (Bus 8→21)', 'Tie Switch 2 (Bus 11→21)'];

function RangeInput({
  label, value, min, max, step, onChange, unit, error,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; unit?: string; error?: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="text-sm font-mono text-teal-700">
          {value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}{unit ?? ''}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-teal-600"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-0.5">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

const ScenarioSimulator: React.FC = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(true);

  const [config, setConfig] = useState<SimConfig>({
    scenario_id: 'normal_operation',
    demand_multiplier: 1.0,
    solar_multiplier: 0.6,
    initial_battery_soc: 0.5,
    battery_available: true,
    curtailment_limit_pct: 30,
    unavailable_switches: [],
    time_step_idx: 36,
  });

  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string | null>(null);

  // Load scenarios
  useEffect(() => {
    endpoints.getScenarios()
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setScenarios(data);
      })
      .catch(() => {})
      .finally(() => setScenariosLoading(false));
  }, []);

  // Apply preset when scenario changes
  const applyPreset = (scenarioId: string) => {
    const s = scenarios.find((sc) => sc.id === scenarioId) as any;
    if (!s) return;
    setConfig({
      scenario_id: s.id,
      demand_multiplier: s.demand_multiplier ?? 1.0,
      solar_multiplier: s.solar_multiplier ?? 0.6,
      initial_battery_soc: s.initial_battery_soc ?? 0.5,
      battery_available: s.battery_available ?? true,
      curtailment_limit_pct: s.curtailment_limit_pct ?? 30,
      unavailable_switches: s.unavailable_switches ?? [],
      time_step_idx: s.time_step_idx ?? 36,
    });
  };

  const toggleSwitch = (sw: number) => {
    setConfig((prev) => ({
      ...prev,
      unavailable_switches: prev.unavailable_switches.includes(sw)
        ? prev.unavailable_switches.filter((s) => s !== sw)
        : [...prev.unavailable_switches, sw],
    }));
  };

  // Validation
  const errors: Record<string, string> = {};
  if (config.demand_multiplier < 0.5 || config.demand_multiplier > 1.5) errors.demand = 'Must be 0.5–1.5';
  if (config.solar_multiplier < 0 || config.solar_multiplier > 1) errors.solar = 'Must be 0–1';
  if (config.initial_battery_soc < 0.1 || config.initial_battery_soc > 0.95) errors.soc = 'Must be 10%–95%';
  if (config.curtailment_limit_pct < 0 || config.curtailment_limit_pct > 50) errors.curtail = 'Must be 0–50%';
  const isValid = Object.keys(errors).length === 0;

  const handleRun = async () => {
    if (!isValid) return;
    setRunLoading(true);
    setRunError(null);
    setRunId(null);
    setRunStatus('queued');

    try {
      const res = await endpoints.createRun({
        scenario_id: config.scenario_id,
        config_overrides: {
          demand_multiplier: config.demand_multiplier,
          solar_multiplier: config.solar_multiplier,
          initial_battery_soc: config.initial_battery_soc,
          battery_available: config.battery_available,
          curtailment_limit_pct: config.curtailment_limit_pct,
          unavailable_switches: config.unavailable_switches,
          time_step_idx: config.time_step_idx,
        },
      });
      const { run_id } = res.data as any;
      setRunId(run_id);

      // Poll until complete
      const poll = setInterval(async () => {
        try {
          const statusRes = await endpoints.getRun(run_id);
          const run = statusRes.data as any;
          setRunStatus(run.status);
          if (run.status === 'completed' || run.status === 'failed') {
            clearInterval(poll);
            setRunLoading(false);
          }
        } catch {
          clearInterval(poll);
          setRunLoading(false);
        }
      }, 2000);
    } catch (err: any) {
      setRunError(err.response?.data?.detail || err.message);
      setRunLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Scenario Simulator</h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure scenario parameters and run a simulation. All electrical results come from pandapower AC power flow.
        </p>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20 space-y-6">
        {/* Preset selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Preset Scenario</label>
          {scenariosLoading ? <LoadingSpinner /> : (
            <div className="flex gap-3">
              <select
                className="flex-1 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 bg-slate-900/60 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={config.scenario_id}
                onChange={(e) => {
                  setConfig((prev) => ({ ...prev, scenario_id: e.target.value }));
                }}
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button
                onClick={() => applyPreset(config.scenario_id)}
                className="flex items-center gap-1 bg-slate-800/60 hover:bg-slate-200 text-slate-300 text-sm px-3 py-2 rounded-lg"
                title="Reset to preset values"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Preset
              </button>
            </div>
          )}
          {scenarios.find((s) => s.id === config.scenario_id) && (
            <p className="text-xs text-slate-400 mt-2">
              {(scenarios.find((s) => s.id === config.scenario_id) as any)?.description}
            </p>
          )}
        </div>

        <hr className="border-teal-500/20" />

        {/* Time step */}
        <RangeInput
          label="Simulation Time Step (hours from 2024-01-15 00:00 IST)"
          value={config.time_step_idx}
          min={0} max={167} step={1}
          onChange={(v) => setConfig((p) => ({ ...p, time_step_idx: v }))}
          unit="h"
        />
        <p className="text-xs text-slate-400 -mt-4">
          Hour {config.time_step_idx % 24}:00 on day {Math.floor(config.time_step_idx / 24) + 1}
          {' ('}simulation time, not wall clock{')'}
        </p>

        {/* Demand / Solar */}
        <div className="grid grid-cols-2 gap-6">
          <RangeInput
            label="Demand Multiplier"
            value={config.demand_multiplier}
            min={0.5} max={1.5} step={0.1}
            onChange={(v) => setConfig((p) => ({ ...p, demand_multiplier: v }))}
            unit="×"
            error={errors.demand}
          />
          <RangeInput
            label="Solar Multiplier"
            value={config.solar_multiplier}
            min={0} max={1} step={0.1}
            onChange={(v) => setConfig((p) => ({ ...p, solar_multiplier: v }))}
            unit="×"
            error={errors.solar}
          />
        </div>

        {/* Battery */}
        <div className="grid grid-cols-2 gap-6">
          <RangeInput
            label="Initial Battery SOC"
            value={config.initial_battery_soc}
            min={0.1} max={0.95} step={0.05}
            onChange={(v) => setConfig((p) => ({ ...p, initial_battery_soc: v }))}
            unit="%"
            error={errors.soc}
          />
          <RangeInput
            label="Curtailment Limit"
            value={config.curtailment_limit_pct}
            min={0} max={50} step={5}
            onChange={(v) => setConfig((p) => ({ ...p, curtailment_limit_pct: v }))}
            unit="%"
            error={errors.curtail}
          />
        </div>

        {/* Battery availability */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.battery_available}
              onChange={(e) => setConfig((p) => ({ ...p, battery_available: e.target.checked }))}
              className="rounded text-teal-400 focus:ring-teal-500 w-4 h-4"
            />
            <span className="text-sm font-medium text-slate-300">Battery Available</span>
          </label>
          {!config.battery_available && (
            <span className="text-xs text-amber-600 bg-amber-900/20 px-2 py-0.5 rounded">
              Battery disabled — BATTERY_ONLY and COMBINED candidates will be rejected
            </span>
          )}
        </div>

        {/* Switch availability */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Unavailable Tie Switches (cannot be operated)
          </label>
          <div className="space-y-2">
            {SWITCH_LABELS.map((label, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.unavailable_switches.includes(i)}
                  onChange={() => toggleSwitch(i)}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span className="text-sm text-slate-300">{label}</span>
                {config.unavailable_switches.includes(i) && (
                  <span className="text-xs text-red-600 bg-red-900/20 px-2 py-0.5 rounded">Unavailable</span>
                )}
              </label>
            ))}
          </div>
        </div>

        <hr className="border-teal-500/20" />

        {/* Run controls */}
        {runError && <ErrorCard message={`Run error: ${runError}`} />}

        {runId && runStatus && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
            runStatus === 'completed' ? 'bg-green-900/20 text-green-300 border border-green-200' :
            runStatus === 'failed' ? 'bg-red-900/20 text-red-300 border border-red-200' :
            'bg-blue-900/20 text-blue-300 border border-blue-200'
          }`}>
            {runStatus === 'running' && <RefreshCw className="w-4 h-4 animate-spin" />}
            Status: <span className="font-bold">{runStatus.toUpperCase()}</span>
            {runStatus === 'completed' && (
              <button
                onClick={() => navigate(`/actions?run_id=${runId}`)}
                className="ml-auto text-xs underline text-teal-700"
              >
                View Results →
              </button>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleRun}
            disabled={runLoading || !isValid}
            className="flex-1 flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {runLoading
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running…</>
              : <><Play className="w-4 h-4" /> Run Simulation</>}
          </button>
          <button
            onClick={() => applyPreset(config.scenario_id)}
            className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-200 text-slate-300 font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {!isValid && (
          <div className="text-xs text-red-600 bg-red-900/20 border border-red-200 rounded-lg px-4 py-2">
            Please fix validation errors before running.
          </div>
        )}
      </div>

      {/* Config summary */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700 p-4 text-xs text-slate-300">
        <strong className="font-semibold text-slate-300">Current Configuration:</strong>{' '}
        Scenario: {config.scenario_id} | Hour: {config.time_step_idx % 24}:00 |
        Demand: {config.demand_multiplier.toFixed(1)}× | Solar: {config.solar_multiplier.toFixed(1)}× |
        SOC: {(config.initial_battery_soc * 100).toFixed(0)}% |
        Battery: {config.battery_available ? 'Available' : 'Unavailable'} |
        Curtailment cap: {config.curtailment_limit_pct}% |
        Blocked switches: {config.unavailable_switches.length === 0 ? 'None' : config.unavailable_switches.join(', ')}
      </div>
    </div>
  );
};

export default ScenarioSimulator;
