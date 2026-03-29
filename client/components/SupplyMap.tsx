'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useSupplyGuardStore } from '@/lib/store';
import {
  riskToColor,
  volumeToWidth,
  centralityToRadius,
} from '@/lib/graphData';
import type { GraphNode, GraphEdge } from '@/lib/types';
import { NODE_TYPE_CONFIG } from '@/lib/types';
import NodeTooltip from './NodeTooltip';

interface TooltipState {
  node: GraphNode;
  x: number;
  y: number;
}

export default function SupplyMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const { nodes, edges, riskScores, recommendedEdges, selectedNodeId, setSelectedNodeId } =
    useSupplyGuardStore();

  const getNodeRisk = useCallback(
    (nodeId: string) => riskScores[nodeId] ?? 0,
    [riskScores]
  );

  // Initialize D3 simulation
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Defs for gradients and filters
    const defs = svg.append('defs');

    // Glow filter for disrupted nodes
    const glowFilter = defs.append('filter').attr('id', 'glow');
    glowFilter
      .append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow marker for directed edges
    defs
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#4B5563');

    // Zoom behavior
    const zoomGroup = svg.append('g');
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Copy data so D3 can mutate
    const simNodes: GraphNode[] = nodes.map((n) => ({ ...n }));
    const simEdges: GraphEdge[] = edges.map((e) => ({ ...e }));

    // Edge group
    const edgeGroup = zoomGroup.append('g').attr('class', 'edges');
    const edgeElements = edgeGroup
      .selectAll<SVGLineElement, GraphEdge>('line')
      .data(simEdges)
      .join('line')
      .attr('stroke', '#374151')
      .attr('stroke-width', (d) => volumeToWidth(d.annual_volume_usd))
      .attr('stroke-opacity', 0.4)
      .attr('marker-end', 'url(#arrowhead)');

    // Node group
    const nodeGroup = zoomGroup.append('g').attr('class', 'nodes');
    const nodeElements = nodeGroup
      .selectAll<SVGGElement, GraphNode>('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulationRef.current?.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circles
    nodeElements
      .append('circle')
      .attr('r', (d) => centralityToRadius(d.centrality))
      .attr('fill', (d) => riskToColor(d.current_risk))
      .attr('stroke', (d) => NODE_TYPE_CONFIG[d.type]?.color ?? '#6B7280')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9);

    // Node labels (small text)
    nodeElements
      .append('text')
      .text((d) => {
        const name = d.name;
        return name.length > 18 ? name.slice(0, 16) + '…' : name;
      })
      .attr('dy', (d) => centralityToRadius(d.centrality) + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#D1D5DB')
      .attr('font-size', '10px')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('pointer-events', 'none');

    // Node type icon
    nodeElements
      .append('text')
      .text((d) => NODE_TYPE_CONFIG[d.type]?.icon ?? '●')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', (d) => `${Math.max(10, centralityToRadius(d.centrality) * 0.9)}px`)
      .attr('pointer-events', 'none');

    // Hover handlers
    nodeElements
      .on('mouseenter', (event, d) => {
        const [x, y] = d3.pointer(event, container);
        setTooltip({ node: d, x, y });
      })
      .on('mouseleave', () => {
        setTooltip(null);
      })
      .on('click', (_event, d) => {
        setSelectedNodeId(d.id === selectedNodeId ? null : d.id);
      });

    // Force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphEdge>(simEdges)
          .id((d) => d.id)
          .distance(120)
          .strength((d) => (typeof d.weight === 'number' ? d.weight * 0.3 : 0.1))
      )
      .force('charge', d3.forceManyBody().strength(-300).distanceMax(500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d) => centralityToRadius((d as GraphNode).centrality) + 5))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05))
      .alphaDecay(0.02)
      .on('tick', () => {
        edgeElements
          .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
          .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
          .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
          .attr('y2', (d) => (d.target as GraphNode).y ?? 0);

        nodeElements.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // Update node colors + ripple animation when risk scores change
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    svg
      .selectAll<SVGGElement, GraphNode>('.nodes g')
      .each(function (d) {
        const group = d3.select(this);
        const risk = getNodeRisk(d.id);
        const prevRisk = d.current_risk || 0;

        // Animate circle color
        group
          .select('circle')
          .transition()
          .duration(800)
          .ease(d3.easeCubicInOut)
          .attr('fill', riskToColor(risk))
          .attr('filter', risk > 0.6 ? 'url(#glow)' : 'none');

        // Add throb class for high-risk nodes
        if (risk > 0.6) {
          group.classed('node-disrupted', true);
        } else {
          group.classed('node-disrupted', false);
        }

        // Spawn ripple ring when risk increases significantly
        if (risk > prevRisk + 0.1 && risk > 0.3) {
          const ripple = group
            .append('circle')
            .attr('class', 'ripple-ring')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 12);

          // Remove after animation completes
          setTimeout(() => ripple.remove(), 1200);
        }

        d.current_risk = risk;
      });
  }, [riskScores, getNodeRisk]);

  // Update edge colors for disrupted / recommended edges
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    const recommendedSet = new Set(
      recommendedEdges.map((e) => `${e.source}->${e.target}`)
    );

    svg
      .selectAll<SVGLineElement, GraphEdge>('.edges line')
      .each(function (d) {
        const line = d3.select(this);
        const sId = typeof d.source === 'string' ? d.source : d.source.id;
        const tId = typeof d.target === 'string' ? d.target : d.target.id;
        const key = `${sId}->${tId}`;
        const isRecommended = recommendedSet.has(key);

        // Toggle route-recommended class for green trace animation
        line.classed('route-recommended', isRecommended);

        if (!isRecommended) {
          const sourceRisk = getNodeRisk(sId);
          const targetRisk = getNodeRisk(tId);
          const isDisrupted = sourceRisk > 0.5 || targetRisk > 0.5;

          line
            .transition()
            .duration(800)
            .ease(d3.easeCubicInOut)
            .attr('stroke', isDisrupted ? '#EF4444' : '#374151')
            .attr('stroke-opacity', sourceRisk > 0.3 || targetRisk > 0.3 ? 0.7 : 0.4)
            .attr('stroke-width', isDisrupted ? 2.5 : volumeToWidth(d.annual_volume_usd));
        }
      });
  }, [riskScores, recommendedEdges, getNodeRisk]);

  return (
    <div ref={containerRef} className="supply-map-container">
      <svg ref={svgRef} />
      {tooltip && (
        <NodeTooltip
          node={tooltip.node}
          risk={getNodeRisk(tooltip.node.id)}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </div>
  );
}
