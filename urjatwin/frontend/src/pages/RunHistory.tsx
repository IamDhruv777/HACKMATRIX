import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { endpoints } from '../api/endpoints';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorCard from '../components/ErrorCard';
import EmptyState from '../components/EmptyState';

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'failed':    return <XCircle className="w-4 h-4 text-red-600" />;
    case 'running':   return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'queued':    return <Clock className="w-4 h-4 text-amber-500" />;
    default:          return <AlertTriangle className="w-4 h-4 text-gray-400" />;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-green-700 bg-green-900/20 border border-green-200';
    case 'failed':    return 'text-red-700 bg-red-900/20 border border-red-200';
    case 'running':   return 'text-blue-700 bg-blue-900/20 border border-blue-200';
    case 'queued':    return 'text-amber-700 bg-amber-900/20 border border-amber-200';
    default:          return 'text-gray-600 bg-gray-50';
  }
}

const RunHistory: React.FC = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = () => {
    setLoading(true);
    endpoints.getRuns()
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setRuns(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleExport = (runId: string) => {
    window.open(`/api/runs/${runId}/export`, '_blank');
  };

  const handleViewResults = (runId: string) => {
    navigate(`/actions?run_id=${runId}`);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorCard message={`Failed to load runs: ${error}`} />;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Run History</h1>
          <p className="text-slate-400 text-sm mt-1">
            All simulation runs. Saved results can be reopened without re-running.
          </p>
        </div>
        <button
          onClick={fetchRuns}
          className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-200 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* ── Table ── */}
      {runs.length === 0 ? (
        <EmptyState message="No runs yet. Go to the Dashboard or Scenario Simulator and run a baseline simulation." />
      ) : (
        <div className="bg-slate-900/60 backdrop-blur-md rounded-xl shadow-lg shadow-black/20 border border-teal-500/20 overflow-hidden">
          <table className="min-w-full text-sm divide-y divide-slate-100">
            <thead className="bg-slate-800/40">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Run ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Scenario</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Progress</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Started At</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {runs.map((run) => (
                <tr key={run.run_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-slate-300">
                    {run.run_id?.substring(0, 16)}…
                  </td>
                  <td className="px-5 py-3 text-slate-100 font-medium">
                    {run.scenario_id}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${statusColor(run.status)}`}>
                      <StatusIcon status={run.status} />
                      {run.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {run.status === 'running' ? (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-slate-800/60 rounded-full h-1.5">
                          <div
                            className="bg-teal-500 h-1.5 rounded-full"
                            style={{ width: `${run.progress ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{Math.round(run.progress ?? 0)}%</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">
                        {run.status === 'completed' ? '100%' : '–'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    {run.created_at
                      ? new Date(run.created_at).toLocaleString('en-IN', { timeZone: 'UTC' }) + ' UTC'
                      : '–'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {run.status === 'completed' && (
                        <>
                          <button
                            onClick={() => handleViewResults(run.run_id)}
                            className="flex items-center gap-1 text-teal-400 hover:text-teal-800 text-xs font-medium"
                            title="View results in Action Comparison"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => handleExport(run.run_id)}
                            className="flex items-center gap-1 text-slate-400 hover:text-slate-300 text-xs font-medium"
                            title="Export as JSON"
                          >
                            <Download className="w-4 h-4" />
                            Export
                          </button>
                        </>
                      )}
                      {run.status === 'failed' && run.has_error && (
                        <span className="text-red-500 text-xs" title="Run failed — check logs">
                          Failed
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-slate-400">
        {runs.length} run(s) total. Saved runs can be reopened without re-simulation.
        Wall-clock timestamps shown in UTC; simulation timestamps are IST (separate concept).
      </div>
    </div>
  );
};

export default RunHistory;
