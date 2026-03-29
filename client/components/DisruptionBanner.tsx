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
    <div className="disruption-banner">
      <div className="disruption-banner-pulse" />
      <span className="disruption-banner-icon">🚨</span>
      <span className={`disruption-source-badge ${source.className}`}>
        {source.icon} {source.label}
      </span>
      <span className="disruption-banner-text">
        <strong>{typeLabel}</strong> detected at{' '}
        <strong>{latest.location || latest.affected_node_id}</strong> — Severity:{' '}
        {(latest.severity * 100).toFixed(0)}%
      </span>
      <span className="disruption-banner-time">
        {new Date(latest.created_at).toLocaleTimeString()}
      </span>
      <div className="banner-progress-bar" />
    </div>
  );
}
