'use client';

import { useSupplyGuardStore } from '@/lib/store';

export default function DisruptionBanner() {
  const { disruptions } = useSupplyGuardStore();

  const latest = disruptions.find((d) => !d.resolved);
  if (!latest) return null;

  const typeLabel = latest.disruption_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="disruption-banner">
      <div className="disruption-banner-pulse" />
      <span className="disruption-banner-icon">🚨</span>
      <span className="disruption-banner-text">
        <strong>{typeLabel}</strong> detected at{' '}
        <strong>{latest.location || latest.affected_node_id}</strong> — Severity:{' '}
        {(latest.severity * 100).toFixed(0)}%
      </span>
      <span className="disruption-banner-time">
        {new Date(latest.created_at).toLocaleTimeString()}
      </span>
    </div>
  );
}
