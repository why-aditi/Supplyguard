'use client';

import { use, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import Link from 'next/link';
import { useSupplyGuardStore } from '@/lib/store';
import { riskToColor, centralityToRadius } from '@/lib/graphData';
import { NODE_TYPE_CONFIG } from '@/lib/types';
import type { GraphNode, GraphEdge } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import { inter } from '@/lib/fonts';
import {
  backLink,
  dashboardContent,
  dashboardHeader,
  dashboardMain,
  dashboardRoot,
  glassPanel,
  nodeDetailPage,
} from '@/lib/uiClasses';

export default function NodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { nodes, edges, riskScores } = useSupplyGuardStore();
  const miniGraphRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const node = nodes.find((n) => n.id === id);
  const risk = riskScores[id] ?? node?.current_risk ?? 0;

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

  useEffect(() => {
    if (!miniGraphRef.current || !containerRef.current || neighborNodes.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = 400;

    d3.select(miniGraphRef.current).selectAll('*').remove();

    const svg = d3.select(miniGraphRef.current).attr('width', width).attr('height', height);

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
      .text((d) => (d.name.length > 16 ? d.name.slice(0, 14) + '…' : d.name))
      .attr('dy', (d) => (d.id === id ? 30 : centralityToRadius(d.centrality) + 12))
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.id === id ? '#F9FAFB' : '#9CA3AF'))
      .attr('font-size', (d) => (d.id === id ? '12px' : '10px'))
      .attr('font-weight', (d) => (d.id === id ? '600' : '400'))
      .attr('font-family', inter.style.fontFamily)
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

    return () => {
      simulation.stop();
    };
  }, [id, neighborNodes, neighborEdges, riskScores]);

  if (!node) {
    return (
      <div className={dashboardRoot}>
        <div className={dashboardContent}>
          <Sidebar />
          <main className={dashboardMain}>
            <div className={nodeDetailPage}>
              <Link href="/" className={backLink}>
                ← Back to Map
              </Link>
              <h2 className="text-xl font-bold">Node not found</h2>
              <p className="mt-2 text-slate-400">No node with ID &quot;{id}&quot; exists in the graph.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const riskPercent = Math.round(risk * 100);
  const typeConfig = NODE_TYPE_CONFIG[node.type];
  const circumference = 2 * Math.PI * 56;
  const dashoffset = circumference - risk * circumference;

  return (
    <div className={dashboardRoot}>
      <header className={dashboardHeader}>
        <div className="flex items-center gap-4">
          <span className="text-2xl">🛡️</span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">SupplyGuard AI</h1>
            <span className="text-sm text-slate-400">Node Detail</span>
          </div>
        </div>
      </header>
      <div className={dashboardContent}>
        <Sidebar />
        <main className={dashboardMain}>
          <div className={nodeDetailPage}>
            <Link href="/" className={backLink}>
              ← Back to Map
            </Link>

            <div className="mb-8 flex items-center gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 text-4xl ${glassPanel}`}
              >
                {typeConfig?.icon ?? '●'}
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight">{node.name}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-400">
                  <span className="rounded bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-400">
                    {node.type}
                  </span>
                  <span>Tier {node.tier}</span>
                  {node.location && <span>{node.location.country}</span>}
                  <span>Centrality: {node.centrality.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <div className="flex flex-col gap-4">
                <div className={`rounded-2xl border border-white/10 p-6 text-center ${glassPanel}`}>
                  <svg className="mx-auto mb-3 h-40 w-40" viewBox="0 0 128 128">
                    <circle className="fill-none stroke-slate-600/30" cx="64" cy="64" r="56" strokeWidth="12" />
                    <circle
                      className="fill-none stroke-linecap-round transition-[stroke-dashoffset,stroke] duration-500"
                      cx="64"
                      cy="64"
                      r="56"
                      stroke={riskToColor(risk)}
                      strokeWidth="12"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashoffset}
                      transform="rotate(-90 64 64)"
                    />
                    <text className="fill-slate-50 text-[32px] font-bold" x="64" y="60" textAnchor="middle">
                      {riskPercent}%
                    </text>
                    <text
                      className="fill-slate-500 text-[11px] font-medium uppercase tracking-wider"
                      x="64"
                      y="78"
                      textAnchor="middle"
                    >
                      Risk Score
                    </text>
                  </svg>
                </div>

                <div className={`rounded-2xl border border-white/10 p-4 ${glassPanel}`}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                    ⬆ Upstream ({upstream.length})
                  </h3>
                  {upstream.length === 0 ? (
                    <p className="text-xs text-slate-500">No upstream connections</p>
                  ) : (
                    upstream.map((c) => (
                      <Link
                        href={`/node/${c.id}`}
                        key={c.id}
                        className="mb-1 flex items-center justify-between rounded px-3 py-2 transition-colors hover:bg-white/5"
                      >
                        <span className="text-sm text-slate-300">
                          {NODE_TYPE_CONFIG[c.node!.type]?.icon} {c.node!.name}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold"
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

                <div className={`rounded-2xl border border-white/10 p-4 ${glassPanel}`}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                    ⬇ Downstream ({downstream.length})
                  </h3>
                  {downstream.length === 0 ? (
                    <p className="text-xs text-slate-500">No downstream connections</p>
                  ) : (
                    downstream.map((c) => (
                      <Link
                        href={`/node/${c.id}`}
                        key={c.id}
                        className="mb-1 flex items-center justify-between rounded px-3 py-2 transition-colors hover:bg-white/5"
                      >
                        <span className="text-sm text-slate-300">
                          {NODE_TYPE_CONFIG[c.node!.type]?.icon} {c.node!.name}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold"
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

              <div
                ref={containerRef}
                className={`relative min-h-[400px] overflow-hidden rounded-2xl border border-white/10 ${glassPanel}`}
              >
                <svg ref={miniGraphRef} className="h-full w-full" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
