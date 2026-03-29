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
      className="node-tooltip"
      style={{
        left: x + 16,
        top: y - 10,
      }}
    >
      <div className="tooltip-header">
        <span className="tooltip-icon">{config.icon}</span>
        <span className="tooltip-name">{node.name}</span>
      </div>
      <div className="tooltip-grid">
        <span className="tooltip-label">Type</span>
        <span className="tooltip-value" style={{ color: config.color }}>
          {config.label}
        </span>
        <span className="tooltip-label">Country</span>
        <span className="tooltip-value">{node.location.country}</span>
        <span className="tooltip-label">Tier</span>
        <span className="tooltip-value">T{node.tier}</span>
        <span className="tooltip-label">Risk</span>
        <span className="tooltip-value" style={{ color: riskToColor(risk) }}>
          {(risk * 100).toFixed(0)}%
        </span>
        <span className="tooltip-label">Centrality</span>
        <span className="tooltip-value">{(node.centrality * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
