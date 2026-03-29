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

/** Tailwind-only select: chevron via arbitrary bg (must stay literal for compiler). */
const SIMULATE_SELECT_CLASS =
  'appearance-none w-full rounded-lg border border-white/10 bg-white/5 font-mono text-xs text-slate-100 py-3 pl-4 pr-12 sm:py-4 sm:text-sm ' +
  'focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all cursor-pointer ' +
  'bg-[length:18px] bg-no-repeat bg-[position:right_1rem_center] ' +
  "bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.4)%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]";

const FIELD_GROUP = 'flex flex-col gap-2 sm:gap-2.5';

const BTN_PRIMARY =
  'font-tech w-full min-h-14 min-w-0 rounded-lg px-3 py-4 text-[11px] font-bold transition-all flex items-center justify-center gap-2 sm:min-h-16 sm:px-4 sm:py-5 sm:text-xs sm:flex-1 sm:min-w-0';

const BTN_SECONDARY =
  'font-tech w-full min-h-14 min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-4 text-[11px] font-bold text-white transition-all hover:bg-white/10 active:scale-95 sm:min-h-16 sm:px-4 sm:py-5 sm:text-xs sm:flex-1 sm:min-w-0';

export default function SimulateControls({ onSimulateExecuted }: { onSimulateExecuted?: () => void }) {
  const { nodes, setRecommendations } = useSupplyGuardStore();
  const [selectedNode, setSelectedNode] = useState('');
  const [originNodeId, setOriginNodeId] = useState('');
  const [destNodeId, setDestNodeId] = useState('');
  const [disruptionType, setDisruptionType] = useState('port_delay');
  const [severity, setSeverity] = useState(0.8);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    recommendations?: { llm_source?: string; recommendations?: unknown[] };
  } | null>(null);

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
    <div
      className={`flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto sm:gap-8 md:gap-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
    >
      <div className="shrink-0 pr-10 sm:pr-0">
        <h2 className="font-tech flex flex-wrap items-center gap-2 text-lg leading-tight text-amber-500 sm:gap-3 sm:text-xl md:text-2xl">
          <span className="text-xl sm:text-2xl md:text-3xl" aria-hidden>
            🎮
          </span>
          <span className="tracking-wide">SIMULATION CONTROL</span>
        </h2>
      </div>

      <div className="flex min-h-0 flex-col gap-5 sm:gap-6 md:gap-7">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className={`${FIELD_GROUP} min-w-0`}>
            <label className="font-tech block text-[10px] font-semibold tracking-[0.18em] text-muted sm:text-[11px] sm:tracking-[0.2em]">
              TARGET NODE
            </label>
            <select
              className={SIMULATE_SELECT_CLASS}
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
            >
              <option value="" className="bg-slate-900">
                Select network node...
              </option>
              {sortedNodes.map((node) => (
                <option key={node.id} value={node.id} className="bg-slate-900">
                  {node.name} ({node.type})
                </option>
              ))}
            </select>
          </div>

          <div className={`${FIELD_GROUP} min-w-0`}>
            <label className="font-tech block text-[10px] font-semibold tracking-[0.18em] text-muted sm:text-[11px] sm:tracking-[0.2em]">
              DISRUPTION TYPE
            </label>
            <select
              className={SIMULATE_SELECT_CLASS}
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
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className={`${FIELD_GROUP} min-w-0`}>
            <label className="font-tech block text-[10px] font-semibold tracking-[0.18em] text-muted sm:text-[11px] sm:tracking-[0.2em]">
              SHIPMENT ORIGIN
            </label>
            <select
              className={SIMULATE_SELECT_CLASS}
              value={originNodeId}
              onChange={(e) => setOriginNodeId(e.target.value)}
            >
              <option value="" className="bg-slate-900">
                Select any origin node...
              </option>
              {sortedNodes.map((node) => (
                <option key={node.id} value={node.id} className="bg-slate-900">
                  {node.name} ({node.type})
                </option>
              ))}
            </select>
          </div>

          <div className={`${FIELD_GROUP} min-w-0`}>
            <label className="font-tech block text-[10px] font-semibold tracking-[0.18em] text-muted sm:text-[11px] sm:tracking-[0.2em]">
              SHIPMENT DESTINATION
            </label>
            <select
              className={SIMULATE_SELECT_CLASS}
              value={destNodeId}
              onChange={(e) => setDestNodeId(e.target.value)}
            >
              <option value="" className="bg-slate-900">
                Select any destination node...
              </option>
              {sortedNodes.map((node) => (
                <option key={node.id} value={node.id} className="bg-slate-900">
                  {node.name} ({node.type})
                </option>
              ))}
            </select>
          </div>

          {odIncomplete && (
            <p className="col-span-2 font-mono text-[10px] leading-snug text-amber-500/90">
              Select both origin and destination, or leave both empty for legacy alternate routes.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex w-full items-center justify-between gap-3">
            <label className="font-tech text-[10px] font-semibold uppercase tracking-[0.18em] text-muted sm:text-[11px] sm:tracking-[0.2em]">
              SEVERITY
            </label>
            <span className="font-mono text-xs font-bold text-amber-400 sm:text-sm">{(severity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-amber-500"
            min="0.1"
            max="1.0"
            step="0.05"
            value={severity}
            onChange={(e) => setSeverity(parseFloat(e.target.value))}
          />
        </div>

        <div className="mt-2 flex flex-col gap-3 pt-2 sm:mt-4 sm:flex-row sm:items-stretch sm:gap-3 sm:pt-0">
          <button
            type="button"
            className={`${BTN_PRIMARY} ${
              !selectedNode || loading || odIncomplete
                ? 'cursor-not-allowed border border-white/5 bg-white/5 text-muted'
                : 'border border-amber-500/30 bg-amber-600 text-white shadow-lg shadow-amber-900/40 hover:bg-amber-500 active:scale-95'
            }`}
            onClick={handleSimulate}
            disabled={!selectedNode || loading || odIncomplete}
          >
            {loading ? '⏳ PROCESSING...' : '💥 EXECUTE DISRUPTION'}
          </button>
          <button type="button" className={BTN_SECONDARY} onClick={handleReset} disabled={loading}>
            🔄 RESET NETWORK
          </button>
        </div>
      </div>

      {lastResult?.recommendations && (
        <div className="mt-auto border-t border-white/5 pt-6 text-center animate-pulse sm:text-left">
          <div className="mb-2 flex items-center justify-center gap-2 text-emerald-400 sm:justify-start">
            <span className="text-sm">✅</span>
            <h3 className="font-tech text-[10px] font-bold uppercase tracking-widest">Recommendations Ready</h3>
          </div>
          <p className="font-mono text-[9px] text-muted">
            Source: {lastResult.recommendations.llm_source} |{' '}
            {lastResult.recommendations.recommendations?.length || 0} ALTS FOUND
          </p>
        </div>
      )}
    </div>
  );
}
