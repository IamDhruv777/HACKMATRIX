import React, { useState, useEffect } from 'react';
import { Save, RefreshCcw } from 'lucide-react';
import { endpoints } from '../api/endpoints';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorCard from '../components/ErrorCard';

const Settings = () => {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchSettings = () => {
    setLoading(true);
    endpoints.getSettings()
      .then(res => setSettings(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await endpoints.updateSettings(settings);
      setSaveMsg({ type: 'success', text: 'Settings saved successfully.' });
    } catch (err: any) {
      setSaveMsg({ type: 'error', text: `Failed to save: ${err.response?.data?.detail || err.message}` });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorCard message={error} />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Settings</h1>
      
      <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg shadow-black/20 border border-teal-500/20 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Simulation Limits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Min Voltage (pu)</label>
              <input 
                type="number" step="0.01" 
                value={settings.v_min_pu || 0.95} 
                onChange={(e) => handleChange('v_min_pu', e.target.value)}
                className="w-full border-slate-600 rounded-md focus:ring-teal-500 focus:border-teal-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Max Voltage (pu)</label>
              <input 
                type="number" step="0.01" 
                value={settings.v_max_pu || 1.05} 
                onChange={(e) => handleChange('v_max_pu', e.target.value)}
                className="w-full border-slate-600 rounded-md focus:ring-teal-500 focus:border-teal-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Max Line Loading (%)</label>
              <input 
                type="number" 
                value={settings.max_line_loading_pct || 100} 
                onChange={(e) => handleChange('max_line_loading_pct', e.target.value)}
                className="w-full border-slate-600 rounded-md focus:ring-teal-500 focus:border-teal-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Max Curtailment (%)</label>
              <input 
                type="number" 
                value={settings.max_curtailment_pct || 30} 
                onChange={(e) => handleChange('max_curtailment_pct', e.target.value)}
                className="w-full border-slate-600 rounded-md focus:ring-teal-500 focus:border-teal-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Battery Min SOC</label>
              <input 
                type="number" step="0.01"
                value={settings.battery_soc_min || 0.1} 
                onChange={(e) => handleChange('battery_soc_min', e.target.value)}
                className="w-full border-slate-600 rounded-md focus:ring-teal-500 focus:border-teal-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Battery Max SOC</label>
              <input 
                type="number" step="0.01"
                value={settings.battery_soc_max || 0.95} 
                onChange={(e) => handleChange('battery_soc_max', e.target.value)}
                className="w-full border-slate-600 rounded-md focus:ring-teal-500 focus:border-teal-500" 
              />
            </div>
          </div>
        </div>

        {saveMsg && (
          <div className={`p-3 rounded-lg text-sm ${saveMsg.type === 'success' ? 'bg-green-900/20 text-green-700' : 'bg-red-900/20 text-red-700'}`}>
            {saveMsg.text}
          </div>
        )}

        <div className="pt-4 border-t border-teal-500/20 flex justify-end space-x-4">
          <button 
            onClick={fetchSettings}
            className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-200 text-slate-300 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <RefreshCcw className="w-4 h-4" /> Reset
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <LoadingSpinner /> : <Save className="w-4 h-4" />} Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
