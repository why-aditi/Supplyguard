'use client';

import { useEffect, useState } from 'react';
import { useSupplyGuardStore } from '@/lib/store';

const SOURCE_CONFIG: Record<string, { icon: string; label: string; badgeClass: string }> = {
  aisstream: { icon: '📡', label: 'AIS', badgeClass: 'bg-blue-500/15 text-blue-400' },
  ais: { icon: '📡', label: 'AIS', badgeClass: 'bg-blue-500/15 text-blue-400' },
  rss: { icon: '📰', label: 'RSS', badgeClass: 'bg-amber-500/15 text-amber-400' },
  simulated: { icon: '🎮', label: 'SIM', badgeClass: 'bg-violet-500/15 text-violet-400' },
};

export default function DisruptionBanner() {
  const { disruptions } = useSupplyGuardStore();
  const [dismissed, setDismissed] = useState<string | null>(null);

  const latest = disruptions.find((d) => !d.resolved && d.id !== dismissed);

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

  const source = SOURCE_CONFIG[(latest as { source?: string }).source ?? ''] || SOURCE_CONFIG.simulated;

  return (
    <div className="pointer-events-auto relative z-45 flex w-full max-w-[1340px] animate-[banner-alert_4s_ease_infinite] items-center gap-5 rounded-lg border-2 border-rose-500/60 bg-rose-500/20 px-6 py-4 shadow-[0_0_20px_rgba(244,63,94,0.2)] backdrop-blur-[32px]">
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-rose-500 animate-[banner-timer_10s_linear_forwards]"
        aria-hidden
      />
      <span className="animate-[logo-glow_3s_ease-in-out_infinite] text-2xl drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">
        🚨
      </span>
      <div className="flex flex-1 flex-col">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-tech text-[10px] font-bold uppercase tracking-wide ${source.badgeClass}`}
          >
            {source.icon} {source.label.toUpperCase()}
          </span>
          <span className="font-mono text-[10px] opacity-60">
            [{new Date(latest.created_at).toLocaleTimeString()}] {typeLabel.toUpperCase()} DETECTED AT{' '}
            {latest.location?.toUpperCase() || latest.affected_node_id.toUpperCase()}{' '}
            {(latest.severity * 100).toFixed(0)}% CRITICALITY
          </span>
        </div>
      </div>
    </div>
  );
}
