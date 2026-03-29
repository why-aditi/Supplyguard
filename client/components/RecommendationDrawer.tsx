'use client';

import { useSupplyGuardStore } from '@/lib/store';
import type { Recommendation } from '@/lib/types';
import { glassPanelBright, glassInteractive } from '@/lib/uiClasses';

function llmBadgeLabel(source: NonNullable<Recommendation['llm_source']>) {
  switch (source) {
    case 'gemini':
      return '✨ GEMINI';
    case 'groq':
      return '⚡ GROQ';
    case 'fallback':
      return '📊 GRAPH FALLBACK';
    default:
      return String(source).toUpperCase();
  }
}

function llmBadgeClasses(source: NonNullable<Recommendation['llm_source']>) {
  switch (source) {
    case 'gemini':
      return 'bg-blue-500/15 text-blue-400';
    case 'groq':
      return 'bg-orange-500/12 text-orange-400';
    case 'fallback':
      return 'bg-slate-500/15 text-slate-400';
    default:
      return 'bg-slate-500/15 text-slate-400';
  }
}

function confidenceClasses(c: string) {
  if (c === 'high') return 'bg-emerald-500/15 text-emerald-400';
  if (c === 'medium') return 'bg-amber-500/15 text-amber-400';
  return 'bg-rose-500/15 text-rose-400';
}

export default function RecommendationDrawer() {
  const {
    isRecommendationDrawerOpen,
    setRecommendationDrawerOpen,
    recommendations,
    setRecommendedEdges,
    selectedRecommendationRank,
    setSelectedRecommendationRank,
  } = useSupplyGuardStore();

  if (!isRecommendationDrawerOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 animate-[fade-in_200ms_ease] bg-black/50"
        onClick={() => {
          setRecommendedEdges([]);
          setRecommendationDrawerOpen(false);
        }}
        role="presentation"
      />
      <div
        className={`fixed bottom-0 right-0 top-0 z-[51] flex max-h-dvh w-full max-w-[100vw] flex-col border-l border-white/10 bg-slate-950 shadow-[-10px_0_40px_rgba(0,0,0,0.5)] animate-[drawer-slide-in_300ms_ease] sm:max-w-none sm:min-w-0 sm:border-l sm:border-white/10 sm:[width:min(420px,100vw)] max-sm:border-l-0`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h3 className="font-tech text-base font-semibold text-cyan-400">🛤️ Rerouting Recommendations</h3>
            <p className="font-mono mt-1 text-[10px] uppercase opacity-50">AI-GENERATED MITIGATION STRATEGIES</p>
          </div>
          <button
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded border border-white/10 text-slate-400 transition-all duration-150 ${glassInteractive}`}
            onClick={() => {
              setRecommendedEdges([]);
              setSelectedRecommendationRank(null);
              setRecommendationDrawerOpen(false);
            }}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {recommendations.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <p className="mb-3 text-[32px]">🔍</p>
              <p>No recommendations available yet.</p>
              <p className="mt-1 text-xs">Trigger a disruption to generate rerouting suggestions.</p>
            </div>
          ) : (
            recommendations.map((rec: Recommendation) => (
              <RecommendationCard
                key={rec.rank}
                rec={rec}
                isActive={selectedRecommendationRank === rec.rank}
                onToggleRoute={() => {
                  const hasEdge =
                    rec.source_node_id &&
                    rec.target_node_id &&
                    rec.source_node_id.trim() !== '' &&
                    rec.target_node_id.trim() !== '';
                  if (!hasEdge) return;
                  if (selectedRecommendationRank === rec.rank) {
                    setRecommendedEdges([]);
                    setSelectedRecommendationRank(null);
                  } else {
                    setRecommendedEdges([{ source: rec.source_node_id!, target: rec.target_node_id! }]);
                    setSelectedRecommendationRank(rec.rank);
                  }
                }}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function RecommendationCard({
  rec,
  isActive,
  onToggleRoute,
}: {
  rec: Recommendation;
  isActive: boolean;
  onToggleRoute: () => void;
}) {
  const canMap =
    !!rec.source_node_id &&
    !!rec.target_node_id &&
    rec.source_node_id.trim() !== '' &&
    rec.target_node_id.trim() !== '';

  return (
    <div
      {...(canMap ? { role: 'button' as const, tabIndex: 0 } : { role: 'article' as const })}
      className={`mb-4 rounded-lg border p-4 transition-all duration-150 ${glassPanelBright} ${
        canMap ? `cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${glassInteractive}` : ''
      } ${
        isActive ? 'border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.18)]' : 'border-white/10'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        if (canMap) onToggleRoute();
      }}
      onKeyDown={(e) => {
        if (!canMap) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleRoute();
        }
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-tech text-[11px] font-bold uppercase tracking-wider text-emerald-400">
          Option #{rec.rank}
        </span>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 font-tech text-[10px] font-semibold uppercase ${confidenceClasses(rec.confidence)}`}>
            {rec.confidence.toUpperCase()}
          </span>
          {rec.llm_source && (
            <span className={`rounded px-2 py-0.5 font-tech text-[10px] font-semibold ${llmBadgeClasses(rec.llm_source)}`}>
              {llmBadgeLabel(rec.llm_source)}
            </span>
          )}
        </div>
      </div>

      <p className="font-tech mb-2 text-lg text-white">{rec.route}</p>
      <p className="mb-2 text-sm leading-relaxed text-slate-400">{rec.reasoning}</p>
      {canMap ? (
        <p className="mb-3 font-mono text-[9px] text-cyan-500/80">
          {isActive ? 'Map: highlighted — click to clear' : 'Click to highlight on map'}
        </p>
      ) : (
        <p className="mb-3 font-mono text-[9px] text-slate-600">Map highlight unavailable (no graph edge id for this row)</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className={`${glassPanelBright} rounded-lg p-3 text-center`}>
          <span
            className="font-mono text-lg font-bold"
            style={{ color: rec.cost_delta_percent > 0 ? '#f43f5e' : '#10b981' }}
          >
            {rec.cost_delta_percent > 0 ? '+' : ''}
            {rec.cost_delta_percent}%
          </span>
          <span className="font-tech mt-0.5 block text-[9px] uppercase tracking-wide text-muted">COST DELTA</span>
        </div>
        <div className={`${glassPanelBright} rounded-lg p-3 text-center`}>
          <span className="font-mono text-lg font-bold text-amber-500">+{rec.lead_time_delta_days}D</span>
          <span className="font-tech mt-0.5 block text-[9px] uppercase tracking-wide text-muted">DELAY</span>
        </div>
        <div className={`${glassPanelBright} rounded-lg p-3 text-center`}>
          <span className="font-mono text-lg font-bold text-emerald-500">-{rec.risk_reduction_percent}%</span>
          <span className="font-tech mt-0.5 block text-[9px] uppercase tracking-wide text-muted">MITIGATION</span>
        </div>
      </div>
    </div>
  );
}
