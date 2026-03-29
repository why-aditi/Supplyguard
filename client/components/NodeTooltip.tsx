'use client';

import type { GraphNode } from '@/lib/types';
import { NODE_TYPE_CONFIG } from '@/lib/types';
import { riskToColor } from '@/lib/graphData';

interface NodeTooltipProps {
  node: GraphNode;
  risk: number;
  x: number;
  y: number;
}

export default function NodeTooltip({ node, risk, x, y }: NodeTooltipProps) {
  const config = NODE_TYPE_CONFIG[node.type];

  return (
    <div
      className="pointer-events-none absolute z-[100] min-w-[240px] animate-[tooltip-burst_200ms_cubic-bezier(0.16,1,0.3,1)] rounded-2xl border border-cyan-400/40 bg-[rgba(2,6,23,0.85)] px-5 py-4 font-mono shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-xl"
      style={{
        left: x + 20,
        top: y - 20,
      }}
    >
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
        <span className="font-tech text-sm font-bold uppercase tracking-wide text-slate-50">{node.name}</span>
        <span
          className="rounded px-1.5 py-0.5 text-[11px] font-bold"
          style={{ color: riskToColor(risk), border: `1px solid ${riskToColor(risk)}33`, background: 'rgba(11,15,26,0.9)' }}
        >
          {(risk * 100).toFixed(0)}%
        </span>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        <span className="font-tech text-[10px] uppercase tracking-wider text-muted">NODE TYPE</span>
        <span className="font-medium" style={{ color: config.color }}>
          {config.label.toUpperCase()}
        </span>
        <span className="font-tech text-[10px] uppercase tracking-wider text-muted">ORIGIN</span>
        <span className="text-slate-200">{node.location.country.toUpperCase()}</span>
        <span className="font-tech text-[10px] uppercase tracking-wider text-muted">TIER</span>
        <span className="text-slate-200">0{node.tier}</span>
        <span className="font-tech text-[10px] uppercase tracking-wider text-muted">CENTRALITY</span>
        <span className="text-slate-200">{(node.centrality * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
