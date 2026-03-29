'use client';

import { useSupplyGuardStore } from '@/lib/store';

export default function RiskScoreCard() {
  const { nodes, disruptions } = useSupplyGuardStore();

  const totalNodes = nodes.length;
  const disruptedNodes = nodes.filter((n) => n.current_risk > 0.3).length;
  const avgRisk =
    totalNodes > 0
      ? nodes.reduce((sum, n) => sum + n.current_risk, 0) / totalNodes
      : 0;
  const activeDisruptions = disruptions.filter((d) => !d.resolved).length;

  const cards = [
    {
      label: 'Overall Risk',
      value: `${(avgRisk * 100).toFixed(1)}%`,
      color: avgRisk > 0.5 ? '#EF4444' : avgRisk > 0.2 ? '#F59E0B' : '#10B981',
      icon: '🛡️',
    },
    {
      label: 'Disrupted Nodes',
      value: `${disruptedNodes} / ${totalNodes}`,
      color: disruptedNodes > 5 ? '#EF4444' : disruptedNodes > 0 ? '#F59E0B' : '#10B981',
      icon: '⚠️',
    },
    {
      label: 'Active Events',
      value: `${activeDisruptions}`,
      color: activeDisruptions > 0 ? '#EF4444' : '#10B981',
      icon: '📡',
    },
    {
      label: 'Avg Severity',
      value:
        disruptions.length > 0
          ? `${(
              (disruptions.reduce((s, d) => s + d.severity, 0) / disruptions.length) *
              100
            ).toFixed(0)}%`
          : '—',
      color: '#3B82F6',
      icon: '📊',
    },
  ];

  return (
    <div className="risk-score-cards w-full">
      {cards.map((card) => (
        <div key={card.label} className="risk-card glass-panel glass-interactive">
          <div className="risk-card-icon">{card.icon}</div>
          <div className="risk-card-content">
            <span className="risk-card-value font-mono" style={{ color: card.color }}>
              {card.value}
            </span>
            <span className="risk-card-label font-tech">{card.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

