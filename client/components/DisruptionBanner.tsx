'use client';

import { useEffect, useState } from 'react';
import { useSupplyGuardStore } from '@/lib/store';

const SOURCE_CONFIG: Record<string, { icon: string; label: string; className: string }> = {
  aisstream: { icon: '📡', label: 'AIS', className: 'ais' },
  ais: { icon: '📡', label: 'AIS', className: 'ais' },
  rss: { icon: '📰', label: 'RSS', className: 'rss' },
  simulated: { icon: '🎮', label: 'SIM', className: 'simulated' },
};

export default function DisruptionBanner() {
  const { disruptions } = useSupplyGuardStore();
  const [dismissed, setDismissed] = useState<string | null>(null);

  const latest = disruptions.find((d) => !d.resolved && d.id !== dismissed);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!latest) return;
    const timer = setTimeout(() => {
      setDismissed(latest.id);
    }, 10_000);
    return () => clearTimeout(timer);
  }, [latest]);

  if (!latest) return null;

  const typeLabel = latest.disruption_type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const source = SOURCE_CONFIG[(latest as any).source] || SOURCE_CONFIG.simulated;

  return (
    <div className="disruption-banner glass-panel">
      <div className="disruption-banner-pulse" />
      <span className="disruption-banner-icon pulsing-logo">🚨</span>
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`disruption-source-badge font-tech ${source.className}`}>
            {source.icon} {source.label.toUpperCase()}
          </span>
          <span className="disruption-banner-time font-mono text-[10px] opacity-60">
            [{new Date(latest.created_at).toLocaleTimeString()}]
          </span>
        </div>
        <span className="disruption-banner-text font-tech">
          <strong className="text-rose-500">{typeLabel.toUpperCase()}</strong> DETECTED AT{' '}
          <strong className="text-rose-400">{latest.location?.toUpperCase() || latest.affected_node_id.toUpperCase()}</strong>
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="font-mono text-xl font-bold text-rose-500">
          {(latest.severity * 100).toFixed(0)}%
        </span>
        <span className="font-tech text-[9px] opacity-50">CRITICALITY</span>
      </div>
    </div>
  );
}

