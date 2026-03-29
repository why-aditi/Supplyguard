'use client';

import { use, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import Link from 'next/link';
import { useSupplyGuardStore } from '@/lib/store';
import { riskToColor, centralityToRadius } from '@/lib/graphData';
import { NODE_TYPE_CONFIG } from '@/lib/types';
import type { GraphNode, GraphEdge } from '@/lib/types';
import Sidebar from '@/components/Sidebar';

export default function NodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { nodes, edges, riskScores } = useSupplyGuardStore();
  const miniGraphRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const node = nodes.find((n) => n.id === id);
  const risk = riskScores[id] ?? node?.current_risk ?? 0;

  // Find connections
  const { upstream, downstream, neighborNodes, neighborEdges } = useMemo(() => {
    const up = edges
      .filter((e) => {
        const tId = typeof e.target === 'string' ? e.target : e.target.id;
        return tId === id;
      })
      .map((e) => {
        const sId = typeof e.source === 'string' ? e.source : e.source.id;
        return { id: sId, node: nodes.find((n) => n.id === sId), edge: e };
      })
      .filter((c) => c.node);

    const down = edges
      .filter((e) => {
        const sId = typeof e.source === 'string' ? e.source : e.source.id;
        return sId === id;
      })
      .map((e) => {
        const tId = typeof e.target === 'string' ? e.target : e.target.id;
        return { id: tId, node: nodes.find((n) => n.id === tId), edge: e };
      })
      .filter((c) => c.node);

    const neighborIds = new Set([...up.map((c) => c.id), ...down.map((c) => c.id), id]);
    const nNodes = nodes.filter((n) => neighborIds.has(n.id));
    const nEdges = edges.filter((e) => {
      const sId = typeof e.source === 'string' ? e.source : e.source.id;
      const tId = typeof e.target === 'string' ? e.target : e.target.id;
      return neighborIds.has(sId) && neighborIds.has(tId);
    });

    return { upstream: up, downstream: down, neighborNodes: nNodes, neighborEdges: nEdges };
  }, [id, nodes, edges]);

  // Mini D3 graph
  useEffect(() => {
    if (!miniGraphRef.current || !containerRef.current || neighborNodes.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = 400;

    d3.select(miniGraphRef.current).selectAll('*').remove();

    const svg = d3
      .select(miniGraphRef.current)
      .attr('width', width)
      .attr('height', height);

    const defs = svg.append('defs');
    const glowFilter = defs.append('filter').attr('id', 'mini-glow');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const simNodes: GraphNode[] = neighborNodes.map((n) => ({ ...n }));
    const simEdges: GraphEdge[] = neighborEdges.map((e) => ({ ...e }));

    const edgeElements = svg
      .append('g')
      .selectAll<SVGLineElement, GraphEdge>('line')
      .data(simEdges)
      .join('line')
      .attr('stroke', '#374151')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.5);

    const nodeGroups = svg
      .append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'pointer');

    nodeGroups
      .append('circle')
      .attr('r', (d) => (d.id === id ? 20 : centralityToRadius(d.centrality)))
      .attr('fill', (d) => riskToColor(riskScores[d.id] ?? d.current_risk))
      .attr('stroke', (d) => (d.id === id ? '#3B82F6' : NODE_TYPE_CONFIG[d.type]?.color ?? '#6B7280'))
      .attr('stroke-width', (d) => (d.id === id ? 3 : 2))
      .attr('filter', (d) => ((riskScores[d.id] ?? d.current_risk) > 0.6 ? 'url(#mini-glow)' : 'none'));

    nodeGroups
      .append('text')
      .text((d) => NODE_TYPE_CONFIG[d.type]?.icon ?? '●')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', (d) => (d.id === id ? '16px' : '11px'))
      .attr('pointer-events', 'none');

    nodeGroups
      .append('text')
      .text((d) => d.name.length > 16 ? d.name.slice(0, 14) + '…' : d.name)
      .attr('dy', (d) => (d.id === id ? 30 : centralityToRadius(d.centrality) + 12))
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.id === id ? '#F9FAFB' : '#9CA3AF'))
      .attr('font-size', (d) => (d.id === id ? '12px' : '10px'))
      .attr('font-weight', (d) => (d.id === id ? '600' : '400'))
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('pointer-events', 'none');

    const simulation = d3
      .forceSimulation<GraphNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphEdge>(simEdges)
          .id((d) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(25))
      .on('tick', () => {
        edgeElements
          .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
          .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
          .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
          .attr('y2', (d) => (d.target as GraphNode).y ?? 0);
        nodeGroups.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    return () => { simulation.stop(); };
  }, [id, neighborNodes, neighborEdges, riskScores]);

  if (!node) {
    return (
      <div className="dashboard">
        <div className="dashboard-content">
          <Sidebar />
          <main className="dashboard-main">
            <div className="node-detail-page">
              <Link href="/" className="back-link">← Back to Map</Link>
              <h2>Node not found</h2>
              <p style={{ color: '#9CA3AF' }}>No node with ID &quot;{id}&quot; exists in the graph.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const riskPercent = Math.round(risk * 100);
  const typeConfig = NODE_TYPE_CONFIG[node.type];
  const circumference = 2 * Math.PI * 56;
  const dashoffset = circumference - (risk * circumference);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="brand-logo">
            <span className="logo-icon">🛡️</span>
            <h1>SupplyGuard AI</h1>
          </div>
          <span className="header-subtitle">Node Detail</span>
        </div>
      </header>
      <div className="dashboard-content">
        <Sidebar />
        <main className="dashboard-main">
          <div className="node-detail-page">
            <Link href="/" className="back-link">← Back to Map</Link>

            <div className="node-detail-header">
              <div className="node-detail-icon">{typeConfig?.icon ?? '●'}</div>
              <div>
                <div className="node-detail-title">{node.name}</div>
                <div className="node-detail-subtitle">
                  <span className="node-detail-badge">{node.type}</span>
                  <span>Tier {node.tier}</span>
                  {node.location && <span>{node.location.country}</span>}
                  <span>Centrality: {node.centrality.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="node-detail-grid">
              <div className="node-detail-sidebar">
                {/* Risk Gauge */}
                <div className="risk-gauge-card">
                  <svg className="risk-gauge-svg" viewBox="0 0 128 128">
                    <circle className="risk-gauge-track" cx="64" cy="64" r="56" />
                    <circle
                      className="risk-gauge-fill"
                      cx="64"
                      cy="64"
                      r="56"
                      stroke={riskToColor(risk)}
                      strokeDasharray={circumference}
                      strokeDashoffset={dashoffset}
                      transform="rotate(-90 64 64)"
                    />
                    <text className="risk-gauge-label" x="64" y="60" textAnchor="middle">
                      {riskPercent}%
                    </text>
                    <text className="risk-gauge-sublabel" x="64" y="78" textAnchor="middle">
                      Risk Score
                    </text>
                  </svg>
                </div>

                {/* Upstream */}
                <div className="connections-card">
                  <h3>⬆ Upstream ({upstream.length})</h3>
                  {upstream.length === 0 ? (
                    <p style={{ color: '#6B7280', fontSize: 12 }}>No upstream connections</p>
                  ) : (
                    upstream.map((c) => (
                      <Link href={`/node/${c.id}`} key={c.id} className="connection-item">
                        <span className="connection-name">
                          {NODE_TYPE_CONFIG[c.node!.type]?.icon} {c.node!.name}
                        </span>
                        <span
                          className="connection-risk"
                          style={{
                            background: `${riskToColor(riskScores[c.id] ?? 0)}22`,
                            color: riskToColor(riskScores[c.id] ?? 0),
                          }}
                        >
                          {Math.round((riskScores[c.id] ?? 0) * 100)}%
                        </span>
                      </Link>
                    ))
                  )}
                </div>

                {/* Downstream */}
                <div className="connections-card">
                  <h3>⬇ Downstream ({downstream.length})</h3>
                  {downstream.length === 0 ? (
                    <p style={{ color: '#6B7280', fontSize: 12 }}>No downstream connections</p>
                  ) : (
                    downstream.map((c) => (
                      <Link href={`/node/${c.id}`} key={c.id} className="connection-item">
                        <span className="connection-name">
                          {NODE_TYPE_CONFIG[c.node!.type]?.icon} {c.node!.name}
                        </span>
                        <span
                          className="connection-risk"
                          style={{
                            background: `${riskToColor(riskScores[c.id] ?? 0)}22`,
                            color: riskToColor(riskScores[c.id] ?? 0),
                          }}
                        >
                          {Math.round((riskScores[c.id] ?? 0) * 100)}%
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* Mini Graph */}
              <div ref={containerRef} className="mini-graph-container">
                <svg ref={miniGraphRef} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
