'use client';

import { useSupplyGuardStore } from '@/lib/store';
import type { Recommendation } from '@/lib/types';

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
        className="recommendation-drawer-overlay"
        onClick={() => {
          setRecommendedEdges([]);
          setRecommendationDrawerOpen(false);
        }}
      />
      <div className="recommendation-drawer glass-panel">
        <div className="drawer-header border-b border-white/10">
          <div>
            <h3 className="drawer-title font-tech text-cyan-400">🛤️ Rerouting Recommendations</h3>
            <p className="font-mono text-[10px] uppercase opacity-50 mt-1">
              AI-GENERATED MITIGATION STRATEGIES
            </p>
          </div>
          <button
            className="drawer-close glass-interactive"
            onClick={() => {
              setRecommendedEdges([]);
              setSelectedRecommendationRank(null);
              setRecommendationDrawerOpen(false);
            }}
          >
            ✕
          </button>
        </div>


        <div className="drawer-content">
          {recommendations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
              <p style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</p>
              <p>No recommendations available yet.</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>
                Trigger a disruption to generate rerouting suggestions.
              </p>
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
                    setRecommendedEdges([
                      { source: rec.source_node_id!, target: rec.target_node_id! },
                    ]);
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
      {...(canMap
        ? { role: 'button' as const, tabIndex: 0 }
        : { role: 'article' as const })}
      className={`rec-card glass-panel-bright glass-interactive mb-4 ${isActive ? 'rec-card--active' : ''} ${canMap ? 'rec-card--clickable' : ''}`}
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
      <div className="rec-card-header mb-4">
        <span className="rec-rank font-tech">Option #{rec.rank}</span>
        <div className="flex gap-2 items-center">
          <span className={`confidence-badge font-tech ${rec.confidence}`}>
            {rec.confidence.toUpperCase()}
          </span>
          {rec.llm_source && (
            <span className={`llm-badge font-tech ${rec.llm_source}`}>
              {llmBadgeLabel(rec.llm_source)}
            </span>
          )}
        </div>
      </div>

      <p className="rec-route font-tech text-lg text-white mb-2">{rec.route}</p>
      <p className="rec-reasoning text-sm text-slate-400 leading-relaxed mb-2">{rec.reasoning}</p>
      {canMap ? (
        <p className="font-mono text-[9px] text-cyan-500/80 mb-3">
          {isActive ? 'Map: highlighted — click to clear' : 'Click to highlight on map'}
        </p>
      ) : (
        <p className="font-mono text-[9px] text-slate-600 mb-3">
          Map highlight unavailable (no graph edge id for this row)
        </p>
      )}

      <div className="rec-metrics grid grid-cols-3 gap-3">
        <div className="rec-metric glass-panel-bright p-3 rounded-lg text-center">
          <span
            className="rec-metric-value font-mono text-lg"
            style={{ color: rec.cost_delta_percent > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}
          >
            {rec.cost_delta_percent > 0 ? '+' : ''}{rec.cost_delta_percent}%
          </span>
          <span className="rec-metric-label font-tech text-[9px] block">COST DELTA</span>
        </div>
        <div className="rec-metric glass-panel-bright p-3 rounded-lg text-center">
          <span className="rec-metric-value font-mono text-lg text-amber-500">
            +{rec.lead_time_delta_days}D
          </span>
          <span className="rec-metric-label font-tech text-[9px] block">DELAY</span>
        </div>
        <div className="rec-metric glass-panel-bright p-3 rounded-lg text-center">
          <span className="rec-metric-value font-mono text-lg text-emerald-500">
            -{rec.risk_reduction_percent}%
          </span>
          <span className="rec-metric-label font-tech text-[9px] block">MITIGATION</span>
        </div>
      </div>
    </div>
  );
}

