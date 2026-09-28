import React, { useState } from 'react';
import { Play, TrendingUp, AlertTriangle } from 'lucide-react';
import { endpoints } from '../api/endpoints';
import ForecastChart from '../charts/ForecastChart';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorCard from '../components/ErrorCard';

const Forecasting = () => {
  const [assetType, setAssetType] = useState('demand');
  const [horizon, setHorizon] = useState(4);
  const [assetId, setAssetId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<any>(null);

  const runForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await endpoints.runForecast({
        scenario_id: 'normal_operation', // used to determine timestamp
        asset_type: assetType,
        horizon_h: horizon,
        asset_id: assetId ? assetId : undefined
      });
      setForecast(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Convert API result to chart format
  const chartData = forecast ? (forecast.actual_values || []).map((_: any, i: number) => {
    // If we only have actuals up to T-0, and forecast starts at T+1
    const ts = forecast.forecast_timestamps?.[i] || `T+${i}`;
    return {
      time: ts.substring(11, 16), // HH:mm if isoformat
      actual: forecast.actual_values?.[i],
      predicted: forecast.forecast_values?.[i],
      uncertainty: forecast.forecast_values?.[i] 
        ? [forecast.forecast_values[i] * 0.95, forecast.forecast_values[i] * 1.05] 
        : null
    };
  }) : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Forecasting</h1>
          <p className="text-sm text-slate-400 mt-1">
            Machine learning forecast module (HistGradientBoostingRegressor)
          </p>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Asset Type</label>
          <select 
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="demand">Total Demand (MW)</option>
            <option value="pv">Total Solar PV (MW)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Horizon (Hours)</label>
          <select 
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value={1}>1 Hour Ahead</option>
            <option value={4}>4 Hours Ahead</option>
            <option value={24}>24 Hours Ahead</option>
          </select>
        </div>

        <button 
          onClick={runForecast}
          disabled={loading}
          className="flex items-center gap-2 bg-teal-500 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? <LoadingSpinner /> : <Play className="w-4 h-4" />}
          Run Forecast
        </button>
      </div>

      {error && <ErrorCard message={error} />}

      {forecast && !loading && (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 capitalize flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              {assetType} Forecast (Horizon: {forecast.forecast_horizon_h}h)
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800/40 p-3 rounded-lg">
                <p className="text-xs text-slate-400">Method</p>
                <p className="font-semibold text-sm">{forecast.method}</p>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-lg">
                <p className="text-xs text-slate-400">Mean Abs Error (MAE)</p>
                <p className="font-bold text-teal-400">{forecast.mae?.toFixed(4) || 'N/A'}</p>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-lg">
                <p className="text-xs text-slate-400">RMSE</p>
                <p className="font-bold text-teal-400">{forecast.rmse?.toFixed(4) || 'N/A'}</p>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-lg">
                <p className="text-xs text-slate-400">Persistence Baseline MAE</p>
                <p className="font-semibold text-slate-300">{forecast.baseline_persistence_mae?.toFixed(4) || 'N/A'}</p>
              </div>
            </div>

            <div className="h-64">
              <ForecastChart data={chartData} issueTime={chartData[0]?.time || ''} />
            </div>
            
            {forecast.mae > forecast.baseline_persistence_mae && (
              <div className="mt-4 p-3 bg-amber-900/20 text-amber-300 rounded-lg text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p><strong>Note:</strong> The ML model performed worse than the naive persistence baseline for this run. This is common when testing with purely synthetic or highly predictable deterministic data.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!forecast && !loading && !error && (
        <div className="text-center p-12 bg-slate-900/60 backdrop-blur-md rounded-xl shadow-lg shadow-black/20 border border-teal-500/20 text-slate-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Configure parameters and run the forecast model.</p>
        </div>
      )}
    </div>
  );
};

export default Forecasting;
