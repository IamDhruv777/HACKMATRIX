import React, { useState, useEffect } from 'react';
import { ExternalLink, Upload, RefreshCw, Database } from 'lucide-react';
import { endpoints } from '../api/endpoints';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorCard from '../components/ErrorCard';

const DataSources = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchSummary = () => {
    setLoading(true);
    endpoints.getDataSummary()
      .then(res => setSummary(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMsg(null);
    try {
      await endpoints.importData(file);
      setUploadMsg({ type: 'success', text: 'Data imported successfully.' });
      fetchSummary();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message;
      setUploadMsg({ type: 'error', text: `Upload failed: ${msg}` });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Data Sources & Assumptions</h1>
      
      <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <p className="text-sm text-blue-300">
          <strong>Note:</strong> These sources provide operating profiles and research context. State-level observations are not measurements of the modelled benchmark feeder.
        </p>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">MSLDC References</h2>
        <ul className="space-y-3 text-sm">
          <li>
            <a href="https://mahasldc.in/" target="_blank" rel="noreferrer" className="flex items-center text-teal-400 hover:underline font-medium">
              MSLDC Main Website <ExternalLink className="w-4 h-4 ml-1" />
            </a>
          </li>
          <li className="text-slate-300 border-l-2 border-slate-700 pl-3">Daily System Report</li>
          <li className="text-slate-300 border-l-2 border-slate-700 pl-3">Decadal Assessment</li>
          <li className="text-slate-300 border-l-2 border-slate-700 pl-3">11th OCC minutes</li>
          <li className="text-slate-300 border-l-2 border-slate-700 pl-3">Voltage-collapse report</li>
          <li className="text-slate-300 border-l-2 border-slate-700 pl-3">REMC reports</li>
        </ul>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Current Dataset Information</h2>
        {loading ? <LoadingSpinner /> : error ? <ErrorCard message={error} /> : summary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/40 p-4 rounded-lg border border-teal-500/20">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Database className="w-3 h-3" /> Rows</div>
                <div className="text-xl font-bold text-slate-100">{summary.row_count?.toLocaleString()}</div>
              </div>
              <div className="bg-slate-800/40 p-4 rounded-lg border border-teal-500/20">
                <div className="text-xs text-slate-400 mb-1">Assets</div>
                <div className="text-xl font-bold text-slate-100">{summary.assets?.length || 0}</div>
              </div>
              <div className="bg-slate-800/40 p-4 rounded-lg border border-teal-500/20 md:col-span-2">
                <div className="text-xs text-slate-400 mb-1">Time Range</div>
                <div className="text-sm font-semibold text-slate-100 break-words font-mono mt-1">
                  {summary.min_time ? new Date(summary.min_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '–'} <br/>
                  to {summary.max_time ? new Date(summary.max_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '–'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No data available.</p>
        )}
      </div>

      <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Network Assumptions</h2>
        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          The underlying network model uses the standard 33-bus Baran-Wu distribution benchmark system, not an actual physical feeder.
        </p>
        
        <table className="min-w-full divide-y divide-slate-200 text-sm mb-6 border border-slate-700 rounded-lg overflow-hidden">
          <thead className="bg-slate-800/40">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-300">Equipment</th>
              <th className="px-4 py-2 text-left font-medium text-slate-300">Assumed Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr><td className="px-4 py-2">Voltage Level</td><td className="px-4 py-2 font-mono">12.66 kV</td></tr>
            <tr><td className="px-4 py-2">Main Transformer</td><td className="px-4 py-2 font-mono">5.0 MVA</td></tr>
            <tr><td className="px-4 py-2">Line Thermal Limit</td><td className="px-4 py-2 font-mono">200 A (~4.4 MVA)</td></tr>
            <tr><td className="px-4 py-2">Community Battery</td><td className="px-4 py-2 font-mono">2.0 MWh, 0.5 MW</td></tr>
            <tr><td className="px-4 py-2">Distributed PV Total</td><td className="px-4 py-2 font-mono">3.0 MWp (5 locations)</td></tr>
          </tbody>
        </table>

        <div className="p-5 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/40 text-center relative hover:bg-slate-800/60 transition-colors">
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300 mb-1">Import Custom Dataset (CSV)</p>
          <p className="text-xs text-slate-400 mb-3">Format: timestamp, asset_id, asset_type, p_mw...</p>
          
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload} 
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
          />
          
          <button 
            disabled={uploading}
            className="bg-slate-900/60 backdrop-blur-md border border-slate-600 text-slate-300 px-4 py-2 rounded-md text-sm hover:bg-slate-800/40 transition-colors disabled:opacity-50"
          >
            {uploading ? <><RefreshCw className="w-4 h-4 inline animate-spin mr-1" /> Uploading...</> : 'Select File'}
          </button>
        </div>
        
        {uploadMsg && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${uploadMsg.type === 'success' ? 'bg-green-900/20 text-green-700' : 'bg-red-900/20 text-red-700'}`}>
            {uploadMsg.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSources;
