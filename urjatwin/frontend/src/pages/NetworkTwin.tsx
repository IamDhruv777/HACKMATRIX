import React, { useState, useEffect, useCallback } from 'react';
import { ReactFlow, Controls, Background, Node, Edge, NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { endpoints } from '../api/endpoints';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorCard from '../components/ErrorCard';

// ── Bus layout for 33-bus Baran-Wu (hand-crafted readable layout) ─────────────
// Main feeder: buses 0-17 horizontal
// Branch 1 (from bus 2): buses 18-22 downward
// Branch 2 (from bus 5): buses 23-24 
// Branch 3 (from bus 11): buses 25-32 downward
const BUS_POSITIONS: Record<number, { x: number; y: number }> = {
  0:  { x: 40,   y: 300 },
  1:  { x: 140,  y: 300 },
  2:  { x: 240,  y: 300 },
  3:  { x: 340,  y: 300 },
  4:  { x: 440,  y: 300 },
  5:  { x: 540,  y: 300 },
  6:  { x: 640,  y: 300 },
  7:  { x: 740,  y: 300 },
  8:  { x: 840,  y: 300 },
  9:  { x: 940,  y: 300 },
  10: { x: 1040, y: 300 },
  11: { x: 1140, y: 300 },
  12: { x: 1240, y: 300 },
  13: { x: 1340, y: 300 },
  14: { x: 1440, y: 300 },
  15: { x: 1540, y: 300 },
  16: { x: 1640, y: 300 },
  17: { x: 1740, y: 300 },
  18: { x: 240,  y: 420 },
  19: { x: 340,  y: 420 },
  20: { x: 440,  y: 420 },
  21: { x: 540,  y: 420 },
  22: { x: 640,  y: 420 },
  23: { x: 540,  y: 180 },
  24: { x: 640,  y: 180 },
  25: { x: 1140, y: 420 },
  26: { x: 1240, y: 420 },
  27: { x: 1340, y: 420 },
  28: { x: 1440, y: 420 },
  29: { x: 1540, y: 420 },
  30: { x: 1640, y: 420 },
  31: { x: 1740, y: 420 },
  32: { x: 1840, y: 420 },
};

const PV_BUSES = [5, 10, 17, 24, 30];
const BATTERY_BUS = 18;

// ── Colour by voltage ─────────────────────────────────────────────────────────
function voltageColor(v: number | null): string {
  if (v === null || v === undefined) return '#94a3b8'; // grey
  if (v < 0.95) return '#dc2626'; // red
  if (v > 1.05) return '#ea580c'; // orange-red (overvoltage)
  if (v < 0.97 || v > 1.03) return '#d97706'; // amber warning
  return '#16a34a'; // green
}

// ── Colour by line loading ────────────────────────────────────────────────────
function loadingColor(pct: number | null): string {
  if (pct === null || pct === undefined) return '#94a3b8';
  if (pct > 100) return '#dc2626';
  if (pct > 90)  return '#d97706';
  if (pct > 70)  return '#f59e0b';
  return '#16a34a';
}

// ── Build node label ──────────────────────────────────────────────────────────
function busLabel(busIdx: number, voltage: number | null): string {
  const base = `Bus ${busIdx}`;
  const isPV = PV_BUSES.includes(busIdx);
  const isBatt = busIdx === BATTERY_BUS;
  const vLabel = voltage !== null ? `\n${voltage.toFixed(4)} pu` : '';
  const tag = isPV ? ' ☀' : isBatt ? ' 🔋' : '';
  return base + tag + vLabel;
}

const NetworkTwin: React.FC = () => {
  const [networkData, setNetworkData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Run results for coloring
  const [runResults, setRunResults] = useState<any | null>(null);
  const [runIdInput, setRunIdInput] = useState('');
  const [loadingRun, setLoadingRun] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const [selectedElement, setSelectedElement] = useState<any | null>(null);

  // Fetch network topology
  useEffect(() => {
    endpoints.getNetwork()
      .then((res) => setNetworkData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleLoadRun = async () => {
    if (!runIdInput.trim()) return;
    setLoadingRun(true);
    setRunError(null);
    try {
      const res = await endpoints.getRunResults(runIdInput.trim());
      setRunResults(res.data);
    } catch (err: any) {
      setRunError(err.response?.data?.detail || err.message);
    } finally {
      setLoadingRun(false);
    }
  };

  // Build nodes and edges from network data + optional run results
  const buildFlow = useCallback(() => {
    if (!networkData) return { nodes: [] as Node[], edges: [] as Edge[] };

    const buses = networkData.buses ?? [];
    const lines = networkData.lines ?? [];

    const voltages: Record<string, number | null> = {};
    const lineLoadings: Record<string, number | null> = {};

    if (runResults?.baseline?.powerflow) {
      const pf = runResults.baseline.powerflow;
      Object.entries(pf.bus_voltages_pu ?? {}).forEach(([k, v]) => {
        voltages[k] = v as number;
      });
      Object.entries(pf.line_loading_pct ?? {}).forEach(([k, v]) => {
        lineLoadings[k] = v as number;
      });
    }

    const nodes: Node[] = buses.map((bus: any) => {
      const busIdx = bus.index ?? bus.name ?? 0;
      const v = voltages[String(busIdx)] ?? null;
      const pos = BUS_POSITIONS[busIdx] ?? { x: (busIdx % 10) * 100, y: Math.floor(busIdx / 10) * 120 };
      const isPV = PV_BUSES.includes(busIdx);
      const isBatt = busIdx === BATTERY_BUS;
      const isExt = busIdx === 33;

      return {
        id: String(busIdx),
        position: pos,
        data: {
          label: busLabel(busIdx, v),
          voltage: v,
          busIdx,
          isPV,
          isBatt,
          isExt,
          raw: bus,
        },
        style: {
          background: isExt ? '#1e3a5f' : voltageColor(v),
          color: 'white',
          border: isExt ? '2px solid #64748b' : isPV ? '2px solid #fbbf24' : isBatt ? '2px solid #a78bfa' : '1px solid #e2e8f0',
          borderRadius: isExt ? '4px' : '50%',
          width: isExt ? 80 : 60,
          height: isExt ? 30 : 60,
          fontSize: 9,
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          whiteSpace: 'pre-line',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        },
      };
    });

    const edges: Edge[] = lines
      .filter((l: any) => l.in_service !== false || l.name?.includes('Tie'))
      .map((line: any, i: number) => {
        const fromBus = line.from_bus;
        const toBus = line.to_bus;
        const pct = lineLoadings[String(i)] ?? null;
        const isTie = line.name?.includes('Tie') || line.in_service === false;
        return {
          id: `e${i}`,
          source: String(fromBus),
          target: String(toBus),
          style: {
            stroke: isTie ? '#94a3b8' : loadingColor(pct),
            strokeWidth: isTie ? 1.5 : 2.5,
            strokeDasharray: isTie ? '5,5' : undefined,
          },
          label: pct !== null ? `${pct.toFixed(1)}%` : undefined,
          labelStyle: { fontSize: 8, fill: '#475569' },
          data: { loading: pct, isTie, raw: line },
          animated: !isTie && pct !== null && pct > 80,
        };
      });

    return { nodes, edges };
  }, [networkData, runResults]);

  const { nodes, edges } = buildFlow();

  const onNodeClick: NodeMouseHandler = (_, node) => {
    setSelectedElement({ type: 'bus', data: node.data });
  };

  const onEdgeClick = (_: any, edge: Edge) => {
    setSelectedElement({ type: 'line', data: edge.data });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorCard message={`Network load failed: ${error}`} />;

  return (
    <div className="flex flex-col h-full space-y-4" style={{ minHeight: '80vh' }}>
      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Network Twin</h1>
          <p className="text-slate-400 text-sm">
            Baran-Wu 33-bus benchmark | 12.66 kV | Modelled feeder (not an actual Maharashtra feeder)
          </p>
        </div>
        {/* Load run results */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Paste Run ID to color by results"
            className="border border-slate-600 rounded-lg px-3 py-2 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={runIdInput}
            onChange={(e) => setRunIdInput(e.target.value)}
          />
          <button
            onClick={handleLoadRun}
            disabled={loadingRun || !runIdInput.trim()}
            className="bg-teal-500 hover:bg-teal-700 text-white text-xs px-3 py-2 rounded-lg disabled:opacity-50"
          >
            {loadingRun ? '…' : 'Load'}
          </button>
          {runResults && (
            <span className="text-xs text-green-600 font-medium">✓ Results loaded</span>
          )}
          {runError && (
            <span className="text-xs text-red-600">{runError}</span>
          )}
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex gap-4 flex-1" style={{ minHeight: '600px' }}>
        {/* React Flow diagram */}
        <div className="flex-1 bg-slate-900/60 backdrop-blur-md rounded-xl shadow-lg shadow-black/20 border border-teal-500/20 relative overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            minZoom={0.3}
            maxZoom={2}
          >
            <Background color="#e2e8f0" gap={20} />
            <Controls />
          </ReactFlow>

          {/* Legend */}
          <div className="absolute top-4 left-4 bg-slate-900/60 backdrop-blur-md/95 p-3 rounded-lg shadow-md border border-slate-700 text-xs space-y-2">
            <div className="font-semibold text-slate-300 mb-2">Voltage Legend</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-600"/><span>Normal (0.97–1.03 pu)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-900/200"/><span>Warning (0.95–0.97 or 1.03–1.05)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-600"/><span>Undervoltage (&lt;0.95 pu)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-600"/><span>Overvoltage (&gt;1.05 pu)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-400"/><span>No data</span></div>
            <div className="font-semibold text-slate-300 mt-3 mb-2">Line Loading</div>
            <div className="flex items-center gap-2"><div className="h-1 w-8 bg-green-600 rounded"/><span>&lt;70%</span></div>
            <div className="flex items-center gap-2"><div className="h-1 w-8 bg-amber-900/200 rounded"/><span>70–90%</span></div>
            <div className="flex items-center gap-2"><div className="h-1 w-8 bg-red-600 rounded"/><span>&gt;90%</span></div>
            <div className="flex items-center gap-2"><div className="h-1 w-8 bg-gray-400 rounded" style={{borderTop:'2px dashed #94a3b8', height:0}}/><span>Tie line (open)</span></div>
            <div className="mt-2 text-xs text-slate-400">☀ = PV | 🔋 = Battery</div>
          </div>
        </div>

        {/* Element detail panel */}
        {selectedElement && (
          <div className="w-72 bg-slate-900/60 backdrop-blur-md rounded-xl shadow-lg shadow-black/20 border border-teal-500/20 p-5 text-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-100">
                {selectedElement.type === 'bus' ? `Bus ${selectedElement.data.busIdx}` : 'Line Details'}
              </h3>
              <button
                onClick={() => setSelectedElement(null)}
                className="text-slate-400 hover:text-slate-300 text-lg"
              >
                ×
              </button>
            </div>

            {selectedElement.type === 'bus' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Voltage</span>
                  <span className="font-mono font-bold" style={{ color: voltageColor(selectedElement.data.voltage) }}>
                    {selectedElement.data.voltage !== null
                      ? `${selectedElement.data.voltage.toFixed(4)} pu`
                      : 'No data'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Has PV</span>
                  <span>{selectedElement.data.isPV ? '☀ Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Has Battery</span>
                  <span>{selectedElement.data.isBatt ? '🔋 Yes' : 'No'}</span>
                </div>
                {selectedElement.data.voltage !== null && (
                  <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-medium ${
                    selectedElement.data.voltage < 0.95 || selectedElement.data.voltage > 1.05
                      ? 'bg-red-900/20 text-red-700 border border-red-200'
                      : selectedElement.data.voltage < 0.97 || selectedElement.data.voltage > 1.03
                      ? 'bg-amber-900/20 text-amber-700 border border-amber-200'
                      : 'bg-green-900/20 text-green-700 border border-green-200'
                  }`}>
                    {selectedElement.data.voltage < 0.95
                      ? '⚠ Undervoltage violation'
                      : selectedElement.data.voltage > 1.05
                      ? '⚠ Overvoltage violation'
                      : selectedElement.data.voltage < 0.97 || selectedElement.data.voltage > 1.03
                      ? 'Warning: approaching limit'
                      : '✓ Voltage within limits'}
                  </div>
                )}
                {!runResults && (
                  <p className="text-slate-400 text-xs mt-3">
                    Load a run result above to see real voltages.
                  </p>
                )}
              </div>
            )}

            {selectedElement.type === 'line' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Loading</span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: loadingColor(selectedElement.data.loading) }}
                  >
                    {selectedElement.data.loading !== null
                      ? `${selectedElement.data.loading.toFixed(1)}%`
                      : 'No data'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Type</span>
                  <span>{selectedElement.data.isTie ? 'Tie line (open)' : 'Normal line'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rating</span>
                  <span className="font-mono text-slate-300">200 A (assumed)</span>
                </div>
                {selectedElement.data.loading > 90 && (
                  <div className="mt-3 px-3 py-2 rounded-lg text-xs font-medium bg-amber-900/20 text-amber-700 border border-amber-200">
                    ⚠ Thermal overload risk
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkTwin;
