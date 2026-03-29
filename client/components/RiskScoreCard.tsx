'use client';

import { useSupplyGuardStore } from '@/lib/store';
import { glassInteractive, glassPanel } from '@/lib/uiClasses';

export default function RiskScoreCard({ compact = false }: { compact?: boolean }) {
  const { nodes, disruptions } = useSupplyGuardStore();

  const totalNodes = nodes.length;
  const disruptedNodes = nodes.filter((n) => n.current_risk > 0.3).length;
  const avgRisk =
    totalNodes > 0 ? nodes.reduce((sum, n) => sum + n.current_risk, 0) / totalNodes : 0;
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
          ? `${((disruptions.reduce((s, d) => s + d.severity, 0) / disruptions.length) * 100).toFixed(0)}%`
          : '—',
      color: '#3B82F6',
      icon: '📊',
    },
  ];

  return (
    <div
      className={`grid w-full gap-5 ${compact ? 'grid-cols-2 gap-2 xl:grid-cols-4' : 'grid-cols-2 xl:grid-cols-4'}`}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className={`relative flex min-w-0 items-center overflow-hidden rounded-2xl ${glassPanel} ${glassInteractive} ${
            compact ? 'gap-2 px-2.5 py-2' : 'gap-3 px-5 py-4'
          } before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.05),transparent_60%)] before:content-['']`}
        >
          <div className={`relative shrink-0 drop-shadow-[0_0_10px_rgba(255,255,255,0.15)] ${compact ? 'text-lg' : 'text-[28px]'}`}>
            {card.icon}
          </div>
          <div className="relative flex min-w-0 flex-col">
            <span
              className={`font-mono font-bold leading-none ${compact ? 'mb-0.5 text-sm' : 'mb-1.5 text-[26px] tracking-tight'}`}
              style={{ color: card.color }}
            >
              {card.value}
            </span>
            <span
              className={`font-tech uppercase text-muted ${compact ? 'text-[8px] tracking-wider' : 'text-[10px] tracking-[0.12em]'}`}
            >
              {card.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
