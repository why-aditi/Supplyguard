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
      className="node-tooltip font-mono"
      style={{
        left: x + 20,
        top: y - 20,
      }}
    >
      <div className="tooltip-header">
        <span className="tooltip-name font-tech">{node.name}</span>
        <span 
          className="tooltip-risk-badge" 
          style={{ color: riskToColor(risk), border: `1px solid ${riskToColor(risk)}33` }}
        >
          {(risk * 100).toFixed(0)}%
        </span>
      </div>
      <div className="tooltip-grid">
        <span className="tooltip-label">NODE TYPE</span>
        <span className="tooltip-value" style={{ color: config.color }}>
          {config.label.toUpperCase()}
        </span>
        <span className="tooltip-label">ORIGIN</span>
        <span className="tooltip-value">{node.location.country.toUpperCase()}</span>
        <span className="tooltip-label">TIER</span>
        <span className="tooltip-value">0{node.tier}</span>
        <span className="tooltip-label">CENTRALITY</span>
        <span className="tooltip-value">{(node.centrality * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

