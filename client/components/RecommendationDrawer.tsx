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
      <div className="recommendation-drawer">
        <div className="drawer-header">
          <div>
            <h3 className="drawer-title">🛤️ Rerouting Recommendations</h3>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
              AI-generated alternate routes ranked by risk reduction
            </p>
          </div>
          <button
            className="drawer-close"
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
    <div className="rec-card">
      <div className="rec-card-header">
        <span className="rec-rank">Option #{rec.rank}</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className={`confidence-badge ${rec.confidence}`}>
            {rec.confidence}
          </span>
          {rec.llm_source && (
            <span className={`llm-badge ${rec.llm_source}`}>
              {rec.llm_source === 'gemini' ? '✨ Gemini' : '🤖 Grok'}
            </span>
          )}
        </div>
      </div>

      <p className="rec-route">{rec.route}</p>
      <p className="rec-reasoning">{rec.reasoning}</p>

      <div className="rec-metrics">
        <div className="rec-metric">
          <span
            className="rec-metric-value"
            style={{ color: rec.cost_delta_percent > 0 ? '#EF4444' : '#10B981' }}
          >
            {rec.cost_delta_percent > 0 ? '+' : ''}
            {rec.cost_delta_percent}%
          </span>
          <span className="rec-metric-label">Cost Delta</span>
        </div>
        <div className="rec-metric">
          <span className="rec-metric-value" style={{ color: '#F59E0B' }}>
            +{rec.lead_time_delta_days}d
          </span>
          <span className="rec-metric-label">Lead Time</span>
        </div>
        <div className="rec-metric">
          <span className="rec-metric-value" style={{ color: '#10B981' }}>
            -{rec.risk_reduction_percent}%
          </span>
          <span className="rec-metric-label">Risk Reduction</span>
        </div>
      </div>
    </div>
  );
}
