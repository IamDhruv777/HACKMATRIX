import api from './client';
import { RunResult, ScenarioConfig, ForecastResult } from '../types';

export const endpoints = {
  getHealth: () => api.get('/health'),
  getNetwork: () => api.get('/network'),
  getScenarios: () => api.get<ScenarioConfig[]>('/scenarios'),
  getScenario: (id: string) => api.get<ScenarioConfig>(`/scenarios/${id}`),
  importData: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/data/import', formData);
  },
  getDataSummary: () => api.get('/data/summary'),
  runForecast: (params: any) => api.post<ForecastResult>('/forecast', params),
  createRun: (params: any) => api.post<RunResult>('/runs', params),
  getRuns: () => api.get<RunResult[]>('/runs'),
  getRun: (id: string) => api.get<RunResult>(`/runs/${id}`),
  getRunResults: (id: string) => api.get(`/runs/${id}/results`),
  getRunCandidates: (id: string) => api.get(`/runs/${id}/candidates`),
  exportRun: (id: string) => api.get(`/runs/${id}/export`, { responseType: 'blob' }),
  getSettings: () => api.get('/settings'),
  updateSettings: (settings: any) => api.put('/settings', settings),
};
