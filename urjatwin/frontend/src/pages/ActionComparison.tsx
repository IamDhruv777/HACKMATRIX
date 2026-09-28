import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { endpoints } from '../api/endpoints';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorCard from '../components/ErrorCard';
import EmptyState from '../components/EmptyState';
import VoltageProfileChart from '../charts/VoltageProfileChart';
import LineLoadingChart from '../charts/LineLoadingChart';
import type { CandidateResult } from '../types';

function FamilyIcon({ family }: { family: string }) {
  switch (family) {
    case 'NO_ACTION': return <span title="No Action">⛔</span>;
    case 'BATTERY_ONLY': return <span title="Battery">🔋</span>;
    case 'SWITCHING_ONLY': return <span title="Switching">🔀</span>;
    case 'CURTAILMENT_ONLY': return <span title="Curtailment">☀️</span>;
    case 'COMBINED': return <span title="Combined">⚙️</span>;
    default: return <span>?</span>;
  }
}

const ActionComparison: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const runId = searchParams.get('run_id');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any | null>(null);
  const [runMeta, setRunMeta] = useState<any | null>(null);

  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      endpoints.getRun(runId),
      endpoints.getRunResults(runId),
    ])
      .then(([metaRes, resultsRes]) => {
        setRunMeta(metaRes.data);
        setResults(resultsRes.data);
      })
      .catch((err) => {
        const detail = err.response?.data?.detail || err.message;
        setError(detail);
      })
      .finally(() => setLoading(false));
  }, [runId]);

  if (!runId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Action Comparison</h1>
        <EmptyState message="No run selected. Run a baseline from the Dashboard or Scenario Simulator, then navigate here." />
        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-2 text-teal-700 hover:underline text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> View Run History
        </button>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorCard message={`Failed to load results: ${error}`} />;
  if (!results) return <EmptyState message="No results available for this run." />;

  const baseline = results.baseline;
  const pf = baseline?.powerflow;
  const violations = baseline?.violations ?? [];
  const comparison = results.action_comparison;
  const candidates: CandidateResult[] = comparison?.all_candidates ?? [];
  const selected = comparison?.selected_candidate;
  const status = comparison?.status ?? 'UNKNOWN';

  // Bus voltage data for chart
  const busVoltageData = pf?.bus_voltages_pu
    ? Object.entries(pf.bus_voltages_pu)
        .map(([bus, v]) => ({ bus: `Bus ${bus}`, voltage: v as number }))
        .filter((d) => d.voltage !== null)
        .sort((a, b) => parseInt(a.bus.replace('Bus ', '')) - parseInt(b.bus.replace('Bus ', '')))
    : [];

  // Line loading data for chart
  const lineLoadData = pf?.line_loading_pct
    ? Object.entries(pf.line_loading_pct)
        .map(([line, pct]) => ({ line: `L${line}`, loading: pct as number }))
        .filter((d) => d.loading !== null)
        .sort((a, b) => parseInt(a.line.replace('L', '')) - parseInt(b.line.replace('L', '')))
    : [];

  // Separate by family for summary
  const feasible = candidates.filter((c) => c.feasible);
  const rejected = candidates.filter((c) => !c.feasible);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Action Comparison</h1>
          {runMeta && (
            <p className="text-slate-400 text-sm mt-1">
              Scenario: <span className="font-semibold">{runMeta.scenario_id}</span> |
              Run: <span className="font-mono text-xs">{runId?.substring(0, 12)}…</span>
            </p>
          )}
        </div>
        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-300 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to History
        </button>
      </div>

      {/* ── Simulation time note ── */}
      {results.simulation_timestamp && (
        <div className="bg-blue-900/20 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-300">
          <strong>Simulation time:</strong> {new Date(results.simulation_timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
          {' '}(not wall-clock time)
        </div>
      )}

      {/* ── Baseline summary ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
          <p className="text-xs text-slate-400 mb-1">Baseline Violations</p>
          <p className={`text-2xl font-bold ${violations.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {violations.length}
          </p>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
          <p className="text-xs text-slate-400 mb-1">Feasible Candidates</p>
          <p className="text-2xl font-bold text-green-600">{feasible.length}</p>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
          <p className="text-xs text-slate-400 mb-1">Rejected Candidates</p>
          <p className="text-2xl font-bold text-slate-300">{rejected.length}</p>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
          <p className="text-xs text-slate-400 mb-1">Overall Status</p>
          <span className={`inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full ${
            status === 'FEASIBLE'
              ? 'bg-green-100 text-green-300'
              : 'bg-red-100 text-red-300'
          }`}>
            {status === 'FEASIBLE'
              ? <><CheckCircle className="w-4 h-4" /> FEASIBLE</>
              : <><XCircle className="w-4 h-4" /> {status}</>}
          </span>
        </div>
      </div>

      {/* ── Candidates table ── */}
      <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">
          All Candidates ({candidates.length} evaluated)
        </h2>
        {candidates.length === 0 ? (
          <EmptyState message="No candidates evaluated." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-slate-100">
              <thead className="bg-slate-800/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Family</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Battery (MW)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Curtail (%)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Curtailed (MWh)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Losses (MW)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Violations</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Rejection Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {candidates.map((c) => {
                  const isSelected = selected && c.id === selected.id;
                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-green-900/20 border-l-4 border-green-500'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-100 flex items-center gap-2">
                        <FamilyIcon family={c.family} />
                        {c.family}
                        {isSelected && (
                          <span className="ml-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">Selected</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.id}</td>
                      <td className="px-4 py-3">
                        {c.feasible ? (
                          <span className="flex items-center gap-1 text-green-700 text-xs font-bold">
                            <CheckCircle className="w-3 h-3" /> FEASIBLE
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 text-xs font-bold">
                            <XCircle className="w-3 h-3" /> REJECTED
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {c.battery_p_mw !== undefined ? c.battery_p_mw.toFixed(2) : '–'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {c.curtailment_pct?.toFixed(1) ?? '–'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {c.curtailed_mwh?.toFixed(4) ?? '–'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {c.network_losses_mw?.toFixed(4) ?? '–'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.num_violations === 0 ? (
                          <span className="text-green-600 font-bold">0</span>
                        ) : (
                          <span className="text-red-600 font-bold">{c.num_violations}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate" title={c.rejection_reason}>
                        {c.rejection_reason || '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Baseline charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {busVoltageData.length > 0 && (
          <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Baseline Bus Voltages</h2>
            <VoltageProfileChart data={busVoltageData} />
          </div>
        )}
        {lineLoadData.length > 0 && (
          <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Baseline Line Loading (%)</h2>
            <LineLoadingChart data={lineLoadData} />
          </div>
        )}
      </div>

      {/* ── Explanation ── */}
      <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
        <h2 className="text-lg font-semibold text-slate-100 mb-3">
          {status === 'FEASIBLE' ? 'Recommendation' : 'Unresolved Status Explanation'}
        </h2>
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          status === 'FEASIBLE'
            ? 'bg-green-900/20 border border-green-200 text-green-300'
            : 'bg-red-900/20 border border-red-200 text-red-300'
        }`}>
          {status === 'FEASIBLE' ? (
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Feasible corrective action found</p>
                {selected && (
                  <p className="mt-1">
                    Selected: <span className="font-mono">{selected.family}</span> ({selected.id}) —{' '}
                    {selected.curtailed_mwh?.toFixed(4)} MWh curtailed,{' '}
                    {selected.network_losses_mw?.toFixed(4)} MW losses
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">No feasible candidate found — violations remain unresolved</p>
                <p className="mt-1 text-xs">
                  This conclusion applies to the evaluated action set only, not global infeasibility.
                </p>
              </div>
            </div>
          )}
        </div>
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {comparison?.explanation}
        </p>
      </div>

      {/* ── Remaining violations ── */}
      {violations.length > 0 && (
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Baseline Violations Detail</h2>
          <div className="space-y-2">
            {violations.map((v: any, i: number) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                  v.severity === 'critical'
                    ? 'bg-red-900/20 border border-red-200'
                    : 'bg-amber-900/20 border border-amber-200'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                  v.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                }`} />
                <div>
                  <span className="font-semibold">{v.type}</span> at <span className="font-mono">{v.element_id}</span>
                  {' '}— Actual: <span className="font-mono">{v.actual_value?.toFixed(4)} {v.unit}</span>,
                  Limit: <span className="font-mono">{v.limit} {v.unit}</span>
                  <p className="text-xs text-slate-400 mt-1">{v.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Export ── */}
      <div className="flex gap-3">
        <a
          href={`/api/runs/${runId}/export`}
          download={`urjatwin_run_${runId?.substring(0, 8)}.json`}
          className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Export JSON
        </a>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 bg-slate-800/60 hover:bg-slate-200 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ActionComparison;
