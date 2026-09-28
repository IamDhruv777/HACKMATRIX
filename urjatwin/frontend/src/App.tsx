import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NetworkTwin from './pages/NetworkTwin';
import Forecasting from './pages/Forecasting';
import ScenarioSimulator from './pages/ScenarioSimulator';
import ActionComparison from './pages/ActionComparison';
import RunHistory from './pages/RunHistory';
import DataSources from './pages/DataSources';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/network" element={<NetworkTwin />} />
          <Route path="/forecast" element={<Forecasting />} />
          <Route path="/scenario" element={<ScenarioSimulator />} />
          <Route path="/actions" element={<ActionComparison />} />
          <Route path="/history" element={<RunHistory />} />
          <Route path="/data-sources" element={<DataSources />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
