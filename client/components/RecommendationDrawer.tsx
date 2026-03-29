'use client';

import { useSupplyGuardStore } from '@/lib/store';
import type { Recommendation } from '@/lib/types';

export default function RecommendationDrawer() {
  const {
    isRecommendationDrawerOpen,
    setRecommendationDrawerOpen,
    recommendations,
  } = useSupplyGuardStore();

  if (!isRecommendationDrawerOpen) return null;

  return (
    <>
      <div
        className="recommendation-drawer-overlay"
        onClick={() => setRecommendationDrawerOpen(false)}
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
            onClick={() => setRecommendationDrawerOpen(false)}
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
              <RecommendationCard key={rec.rank} rec={rec} />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div className="rec-card glass-panel-bright glass-interactive mb-4">
      <div className="rec-card-header mb-4">
        <span className="rec-rank font-tech">Option #{rec.rank}</span>
        <div className="flex gap-2 items-center">
          <span className={`confidence-badge font-tech ${rec.confidence}`}>
            {rec.confidence.toUpperCase()}
          </span>
          {rec.llm_source && (
            <span className={`llm-badge font-tech ${rec.llm_source}`}>
              {rec.llm_source === 'gemini' ? '✨ GEMINI' : '🤖 GROK'}
            </span>
          )}
        </div>
      </div>

      <p className="rec-route font-tech text-lg text-white mb-2">{rec.route}</p>
      <p className="rec-reasoning text-sm text-slate-400 leading-relaxed mb-4">{rec.reasoning}</p>

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

