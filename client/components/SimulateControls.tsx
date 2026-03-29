'use client';

import { useState } from 'react';
import { useSupplyGuardStore } from '@/lib/store';
import { triggerSimulation, resetSimulation } from '@/lib/api';
import { DISRUPTION_TYPE_LABELS, type Recommendation } from '@/lib/types';

const disruptionTypes = [
  'port_delay',
  'weather_event',
  'supplier_failure',
  'geopolitical',
  'transport_strike',
  'customs_delay',
] as const;

export default function SimulateControls({ onSimulateExecuted }: { onSimulateExecuted?: () => void }) {
  const { nodes, setRecommendations } = useSupplyGuardStore();
  const [selectedNode, setSelectedNode] = useState('');
  const [originNodeId, setOriginNodeId] = useState('');
  const [destNodeId, setDestNodeId] = useState('');
  const [disruptionType, setDisruptionType] = useState('port_delay');
  const [severity, setSeverity] = useState(0.8);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const sortedNodes = [...nodes].sort((a, b) => a.name.localeCompare(b.name));

  const hasOrigin = originNodeId.trim() !== '';
  const hasDest = destNodeId.trim() !== '';
  const odIncomplete = hasOrigin !== hasDest;

  async function handleSimulate() {
    if (!selectedNode || odIncomplete) return;
    setLoading(true);
    try {
      const result = await triggerSimulation(selectedNode, disruptionType, severity, {
        originNodeId: hasOrigin ? originNodeId : undefined,
        destNodeId: hasDest ? destNodeId : undefined,
      });
      setLastResult(result);

      const recBlock = result.recommendations;
      if (recBlock && Array.isArray(recBlock.recommendations)) {
        const parentSource = recBlock.llm_source as string | undefined;
        const recs = recBlock.recommendations.map((r: Recommendation) => ({
          ...r,
          llm_source: r.llm_source ?? (parentSource as Recommendation['llm_source']),
        }));
        setRecommendations(recs, []);
      }

      // Notify parent to close modal
      if (onSimulateExecuted) {
        onSimulateExecuted();
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setLoading(true);
    try {
      await resetSimulation();
      setLastResult(null);
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="simulate-controls-container">
      <div className="simulate-controls-header shrink-0">
        <h2 className="font-tech text-2xl text-amber-500 flex items-center gap-4">
          <span className="text-3xl">🎮</span> SIMULATION CONTROL
        </h2>
      </div>

      <div className="simulate-form-v2">
        <div className="form-group-v2">
          <label className="font-tech text-[11px] text-muted mb-1 block tracking-[0.2em] font-semibold">TARGET NODE</label>
          <select
            className="form-select form-select-v2 w-full bg-white/5 border border-white/10 rounded-lg p-4 font-mono text-xs focus:border-amber-500/50 outline-none transition-all cursor-pointer"
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
          >
            <option value="" className="bg-slate-900">Select network node...</option>
            {sortedNodes.map((node) => (
              <option key={node.id} value={node.id} className="bg-slate-900">
                {node.name} ({node.type})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group-v2">
          <label className="font-tech text-[11px] text-muted mb-1 block tracking-[0.2em] font-semibold">
            SHIPMENT ORIGIN (OPTIONAL)
          </label>
          <select
            className="form-select form-select-v2 w-full bg-white/5 border border-white/10 rounded-lg p-4 font-mono text-xs focus:border-amber-500/50 outline-none transition-all cursor-pointer"
            value={originNodeId}
            onChange={(e) => setOriginNodeId(e.target.value)}
          >
            <option value="" className="bg-slate-900">Same as legacy (any alternate edges)...</option>
            {sortedNodes.map((node) => (
              <option key={node.id} value={node.id} className="bg-slate-900">
                {node.name} ({node.type})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group-v2">
          <label className="font-tech text-[11px] text-muted mb-1 block tracking-[0.2em] font-semibold">
            SHIPMENT DESTINATION (OPTIONAL)
          </label>
          <select
            className="form-select form-select-v2 w-full bg-white/5 border border-white/10 rounded-lg p-4 font-mono text-xs focus:border-amber-500/50 outline-none transition-all cursor-pointer"
            value={destNodeId}
            onChange={(e) => setDestNodeId(e.target.value)}
          >
            <option value="" className="bg-slate-900">Same as legacy (any alternate edges)...</option>
            {sortedNodes.map((node) => (
              <option key={node.id} value={node.id} className="bg-slate-900">
                {node.name} ({node.type})
              </option>
            ))}
          </select>
          {odIncomplete && (
            <p className="font-mono text-[10px] text-amber-500/90 mt-2">
              Select both origin and destination, or leave both empty for legacy alternate routes.
            </p>
          )}
        </div>

        <div className="form-group-v2">
          <label className="font-tech text-[11px] text-muted mb-1 block tracking-[0.2em] font-semibold">DISRUPTION TYPE</label>
          <select
            className="form-select form-select-v2 w-full bg-white/5 border border-white/10 rounded-lg p-4 font-mono text-xs focus:border-amber-500/50 outline-none transition-all cursor-pointer"
            value={disruptionType}
            onChange={(e) => setDisruptionType(e.target.value)}
          >
            {disruptionTypes.map((type) => (
              <option key={type} value={type} className="bg-slate-900">
                {DISRUPTION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group-v2">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
            <label className="font-tech text-[11px] text-muted tracking-[0.2em] font-semibold uppercase">SEVERITY</label>
            <span className="font-mono text-amber-400 text-sm font-bold">{(severity * 100).toFixed(0)}%</span>
          </div>
          <div className="pt-2">
            <input
              type="range"
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
              min="0.1"
              max="1.0"
              step="0.05"
              value={severity}
              onChange={(e) => setSeverity(parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="form-actions-v2 mt-4">
          <button
            type="button"
            className={`font-tech flex-1 min-w-0 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 simulate-action-btn ${
              !selectedNode || loading || odIncomplete
                ? 'bg-white/5 text-muted cursor-not-allowed border border-white/5'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/40 active:scale-95 border border-amber-500/30'
            }`}
            onClick={handleSimulate}
            disabled={!selectedNode || loading || odIncomplete}
          >
            {loading ? '⏳ PROCESSING...' : '💥 EXECUTE DISRUPTION'}
          </button>
          <button
            type="button"
            className="font-tech flex-1 min-w-0 rounded-lg text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95 simulate-action-btn"
            onClick={handleReset}
            disabled={loading}
          >
            🔄 RESET NETWORK
          </button>
        </div>
      </div>

      {lastResult?.recommendations && (
        <div className="mt-auto pt-6 border-t border-white/5 animate-pulse">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <span className="text-sm">✅</span>
            <h3 className="font-tech text-[10px] font-bold tracking-widest uppercase">
              Recommendations Ready
            </h3>
          </div>
          <p className="font-mono text-[9px] text-muted">
            Source: {lastResult.recommendations.llm_source} | 
            {lastResult.recommendations.recommendations?.length || 0} ALTS FOUND
          </p>
        </div>
      )}
    </div>
  );
}
