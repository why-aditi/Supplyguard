'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useSupplyGuardStore } from '@/lib/store';
import {
  riskToColor,
  volumeToWidth,
  geoMapNodeRadiusForNode,
} from '@/lib/graphData';
import type { GraphNode, GraphEdge, DisruptionType } from '@/lib/types';
import { DISRUPTION_TYPE_LABELS, NODE_TYPE_CONFIG } from '@/lib/types';
import NodeTooltip from './NodeTooltip';

/** Basemap: Natural Earth 110m admin-0 countries (public domain), served from /public/geo/ */
const WORLD_GEOJSON_PATH = '/geo/world-countries-110m.json';
/** Natural Earth 110m admin-1 states/provinces (public domain) — lazy-loaded. */
const ADMIN1_GEOJSON_PATH = '/geo/world-admin1-110m.json';

/** Lets projection.fitSize run if the real GeoJSON fetch fails (offline / transient network). */
const FALLBACK_WORLD_GEO: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-180, -85],
            [180, -85],
            [180, 85],
            [-180, 85],
            [-180, -85],
          ],
        ],
      },
    },
  ],
};

async function fetchGeoJsonWithRetry(
  path: string,
  attempts = 4
): Promise<GeoJSON.FeatureCollection> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(path, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as GeoJSON.FeatureCollection;
    } catch (e) {
      last = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 200 * (i + 1)));
      }
    }
  }
  throw last;
}

function edgeKey(d: GraphEdge): string {
  const sId = typeof d.source === 'string' ? d.source : d.source.id;
  const tId = typeof d.target === 'string' ? d.target : d.target.id;
  return `${sId}->${tId}`;
}

/** Tip at origin, opens along +x — scaled in map units with stroke (see transformForMidArrow). */
const EDGE_ARROW_PATH = 'M0,0L10,-4L10,4Z';

/** Arrow size vs edge base width (matches prior marker ~6× stroke feel). */
const ARROW_SCALE_FROM_STROKE = 0.55;

function transformForMidArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  baseW: number,
  k: number
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const scale = (ARROW_SCALE_FROM_STROKE * baseW) / k;
  return `translate(${mx},${my}) rotate(${angleDeg}) scale(${scale})`;
}

const ZOOM_STEP = 1.25;

/** Start fetching admin-1 GeoJSON once zoom scale passes this (avoids blocking first paint). */
const ADMIN1_FETCH_K = 1.12;
/** Below this scale, internal boundaries stay hidden. */
const ADMIN1_K0 = 1.35;
/** At and above this scale, admin-1 boundaries are fully visible. */
const ADMIN1_K1 = 3.4;

/** Matches DisruptionBanner feed source badges (Tailwind-only). */
const FEED_SOURCE_BADGE: Record<string, { icon: string; label: string; badgeClass: string }> = {
  aisstream: { icon: '📡', label: 'AIS', badgeClass: 'bg-blue-500/15 text-blue-400' },
  ais: { icon: '📡', label: 'AIS', badgeClass: 'bg-blue-500/15 text-blue-400' },
  rss: { icon: '📰', label: 'RSS', badgeClass: 'bg-amber-500/15 text-amber-400' },
  simulated: { icon: '🎮', label: 'SIM', badgeClass: 'bg-violet-500/15 text-violet-400' },
};

function admin1LayerOpacity(k: number): number {
  if (k <= ADMIN1_K0) return 0;
  if (k >= ADMIN1_K1) return 1;
  return (k - ADMIN1_K0) / (ADMIN1_K1 - ADMIN1_K0);
}

/** Base stroke width in map units before dividing by zoom k (matches former CSS for recommended). */
const RECOMMENDED_ROUTE_STROKE = 3;

function baseEdgeStrokeWidthMapUnits(
  d: GraphEdge,
  getR: (id: string) => number,
  isRecommended: boolean
): number {
  if (isRecommended) return RECOMMENDED_ROUTE_STROKE;
  const sId = typeof d.source === 'string' ? d.source : d.source.id;
  const tId = typeof d.target === 'string' ? d.target : d.target.id;
  const sourceRisk = getR(sId);
  const targetRisk = getR(tId);
  const isDisrupted = sourceRisk > 0.5 || targetRisk > 0.5;
  return isDisrupted ? 2.5 : volumeToWidth(d.annual_volume_usd);
}

interface TooltipState {
  node: GraphNode;
  x: number;
  y: number;
}

function projectNodes(
  simNodes: GraphNode[],
  projection: d3.GeoProjection
): Map<string, GraphNode> {
  const nodeById = new Map<string, GraphNode>();
  for (const n of simNodes) {
    const lng = n.location?.lng ?? 0;
    const lat = n.location?.lat ?? 0;
    const p = projection([lng, lat]);
    if (p) {
      n.x = p[0];
      n.y = p[1];
    } else {
      n.x = 0;
      n.y = 0;
    }
    nodeById.set(n.id, n);
  }
  return nodeById;
}

export default function SupplyMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  /** Current d3 zoom scale k; used to keep edge/marker screen thickness ~constant. */
  const zoomKRef = useRef(1);
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const { nodes, edges, riskScores, recommendedEdges, selectedNodeId, setSelectedNodeId, wsConnected, disruptions } =
    useSupplyGuardStore();

  const latestIntel = disruptions.find((d) => !d.resolved);
  const rawSource = latestIntel ? (latestIntel as { source?: string }).source : undefined;
  const sourceBadge =
    (rawSource ? FEED_SOURCE_BADGE[rawSource] : undefined) ??
    (latestIntel ? FEED_SOURCE_BADGE.simulated : FEED_SOURCE_BADGE.ais);
  const typeLabel = latestIntel
    ? (DISRUPTION_TYPE_LABELS[latestIntel.disruption_type as DisruptionType] ??
        latestIntel.disruption_type.replace(/_/g, ' '))
    : '';

  const riskScoresRef = useRef(riskScores);
  const recommendedEdgesRef = useRef(recommendedEdges);
  riskScoresRef.current = riskScores;
  recommendedEdgesRef.current = recommendedEdges;

  const getNodeRisk = useCallback(
    (nodeId: string) => riskScores[nodeId] ?? 0,
    [riskScores]
  );

  const applyRiskAndEdgesToSvg = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const scores = riskScoresRef.current;
    const getR = (id: string) => scores[id] ?? 0;
    const recommendedSet = new Set(
      recommendedEdgesRef.current.map((e) => `${e.source}->${e.target}`)
    );

    svg.selectAll<SVGGElement, GraphNode>('.nodes g').each(function (this: SVGGElement, d: GraphNode) {
      const group = d3.select(this);
      const risk = getR(d.id);
      const prevRisk = d.current_risk || 0;

      group
        .select('.node-main')
        .transition()
        .duration(800)
        .ease(d3.easeCubicInOut)
        .attr('fill', riskToColor(risk))
        .attr('filter', risk > 0.6 ? 'url(#critical-glow)' : 'none');

      group
        .select('.node-radar')
        .transition()
        .duration(800)
        .attr('stroke-opacity', risk > 0.3 ? 0.6 : 0.2)
        .attr('r', () => geoMapNodeRadiusForNode(d) + (risk > 0.5 ? 3 : 2));

      group.classed('node-disrupted', risk > 0.6);

      if (risk > prevRisk + 0.1 && risk > 0.3) {
        const ripple = group
          .append('circle')
          .attr('class', 'ripple-ring')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', 8);
        setTimeout(() => ripple.remove(), 1200);
      }

      d.current_risk = risk;
    });

    const kz = zoomKRef.current;
    svg.selectAll<SVGLineElement, GraphEdge>('.edges line').each(function (d) {
      const line = d3.select(this);
      const sId = typeof d.source === 'string' ? d.source : d.source.id;
      const tId = typeof d.target === 'string' ? d.target : d.target.id;
      const key = `${sId}->${tId}`;
      const isRecommended = recommendedSet.has(key);
      line.classed('route-recommended', isRecommended);
      const baseW = baseEdgeStrokeWidthMapUnits(d, getR, isRecommended);
      if (!isRecommended) {
        const sourceRisk = getR(sId);
        const targetRisk = getR(tId);
        const isDisrupted = sourceRisk > 0.5 || targetRisk > 0.5;
        line
          .transition()
          .duration(800)
          .ease(d3.easeCubicInOut)
          .attr('stroke', isDisrupted ? '#EF4444' : '#374151')
          .attr('stroke-opacity', sourceRisk > 0.3 || targetRisk > 0.3 ? 0.7 : 0.4)
          .attr('stroke-width', baseW / kz);
      } else {
        line.transition().duration(800).ease(d3.easeCubicInOut).attr('stroke-width', baseW / kz);
      }
    });

    svg.selectAll<SVGPathElement, GraphEdge>('.edge-arrows path.edge-arrow-mid').each(function (d) {
      const path = d3.select(this);
      const line = svg
        .selectAll<SVGLineElement, GraphEdge>('.edges line')
        .filter((ed) => edgeKey(ed) === edgeKey(d));
      if (line.empty()) return;
      const x1 = +line.attr('x1');
      const y1 = +line.attr('y1');
      const x2 = +line.attr('x2');
      const y2 = +line.attr('y2');
      const sId = typeof d.source === 'string' ? d.source : d.source.id;
      const tId = typeof d.target === 'string' ? d.target : d.target.id;
      const isRecommended = recommendedSet.has(`${sId}->${tId}`);
      path.classed('route-recommended', isRecommended);
      const baseW = baseEdgeStrokeWidthMapUnits(d, getR, isRecommended);
      const tf = transformForMidArrow(x1, y1, x2, y2, baseW, kz);
      if (!isRecommended) {
        const sourceRisk = getR(sId);
        const targetRisk = getR(tId);
        const isDisrupted = sourceRisk > 0.5 || targetRisk > 0.5;
        path
          .transition()
          .duration(800)
          .ease(d3.easeCubicInOut)
          .attr('fill', isDisrupted ? '#EF4444' : '#374151')
          .attr('opacity', sourceRisk > 0.3 || targetRisk > 0.3 ? 0.7 : 0.4)
          .attr('transform', tf);
      } else {
        path
          .transition()
          .duration(800)
          .ease(d3.easeCubicInOut)
          .attr('fill', '#10B981')
          .attr('opacity', 0.95)
          .attr('transform', tf);
      }
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setMapSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setMapSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Geographic map: basemap + fixed lat/lng node positions
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width < 1 || height < 1) return;

    let cancelled = false;

    const runMapInit = async () => {
      let worldGeo: GeoJSON.FeatureCollection;
      try {
        worldGeo = await fetchGeoJsonWithRetry(WORLD_GEOJSON_PATH);
      } catch (err) {
        console.warn('[SupplyMap] World map GeoJSON unavailable — using fallback bounds.', err);
        worldGeo = FALLBACK_WORLD_GEO;
      }
      if (cancelled || !svgRef.current) return;

      try {
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3
          .select(svgRef.current)
          .attr('width', width)
          .attr('height', height);

        const defs = svg.append('defs');

        const glowFilter = defs.append('filter').attr('id', 'neon-glow')
          .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
        glowFilter.append('feGaussianBlur').attr('stdDeviation', '3.5').attr('result', 'blur');
        glowFilter.append('feFlood').attr('flood-color', '#06B6D4').attr('flood-opacity', '0.5').attr('result', 'color');
        glowFilter.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow');
        const feMerge = glowFilter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'glow');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        const pulseFilter = defs.append('filter').attr('id', 'critical-glow')
          .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
        pulseFilter.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'blur');
        pulseFilter.append('feFlood').attr('flood-color', '#F43F5E').attr('flood-opacity', '0.7').attr('result', 'color');
        pulseFilter.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow');
        const feMergePulse = pulseFilter.append('feMerge');
        feMergePulse.append('feMergeNode').attr('in', 'glow');
        feMergePulse.append('feMergeNode').attr('in', 'SourceGraphic');

        defs
          .append('marker')
          .attr('id', 'arrowhead')
          .attr('markerUnits', 'strokeWidth')
          .attr('viewBox', '0 -5 10 10')
          .attr('refX', 10)
          .attr('refY', 0)
          .attr('markerWidth', 6)
          .attr('markerHeight', 6)
          .attr('orient', 'auto')
          .append('path')
          .attr('d', 'M0,-5L10,0L0,5')
          .attr('fill', '#4B5563');

        const projection = d3.geoNaturalEarth1();
        const path = d3.geoPath(projection);
        projection.fitSize([width, height], worldGeo);

        const zoomGroup = svg.append('g');

        const basemap = zoomGroup.append('g').attr('class', 'map-basemap');
        basemap
          .selectAll<SVGPathElement, GeoJSON.Feature>('path.land')
          .data(worldGeo.features)
          .join('path')
          .attr('class', 'land')
          .attr('d', (d) => path(d) ?? '')
          .attr('fill', '#1e293b')
          .attr('fill-opacity', 0.85)
          .attr('stroke', '#334155')
          .attr('stroke-width', 0.55)
          .attr('stroke-opacity', 0.6)
          .attr('vector-effect', 'non-scaling-stroke');

        const admin1Group = zoomGroup
          .append('g')
          .attr('class', 'map-basemap-admin1')
          .attr('pointer-events', 'none')
          .style('opacity', 0);

        let admin1PathsRendered = false;

        const applyAdmin1ZoomStyle = (k: number) => {
          const t = admin1LayerOpacity(k);
          admin1Group.style('opacity', String(t));
          basemap
            .selectAll<SVGPathElement, GeoJSON.Feature>('path.land')
            .attr('stroke-opacity', 0.22 + 0.38 * (1 - t));
        };

        /** Counter-scale pins by 1/k so marker screen size stays ~constant (Google Maps–style). */
        let syncNodePinScale: (k: number) => void = () => {};
        /** Scale edge stroke inversely with k; midpoint arrows scale with stroke. */
        let syncEdgeAndMarkerZoom: (k: number) => void = () => {};

        let admin1FetchStarted = false;
        const loadAdmin1Boundaries = () => {
          if (admin1FetchStarted) return;
          admin1FetchStarted = true;
          fetchGeoJsonWithRetry(ADMIN1_GEOJSON_PATH, 3)
            .then((adminGeo) => {
              if (cancelled || !svgRef.current) return;
              admin1Group
                .selectAll<SVGPathElement, GeoJSON.Feature>('path.admin1')
                .data(adminGeo.features)
                .join('path')
                .attr('class', 'admin1')
                .attr('d', (d) => path(d) ?? '')
                .attr('fill', 'none')
                .attr('stroke', '#64748b')
                .attr('stroke-width', 0.5)
                .attr('vector-effect', 'non-scaling-stroke');
              admin1PathsRendered = true;
              applyAdmin1ZoomStyle(d3.zoomTransform(svgRef.current).k);
            })
            .catch((err) => {
              console.warn('[SupplyMap] Admin-1 boundaries skipped.', err);
              admin1FetchStarted = false;
            });
        };

        const zoom = d3
          .zoom<SVGSVGElement, unknown>()
          .scaleExtent([1, 12])
          .on('zoom', (event) => {
            const k = event.transform.k;
            zoomKRef.current = k;
            zoomGroup.attr('transform', event.transform);
            applyAdmin1ZoomStyle(k);
            if (!admin1PathsRendered && k >= ADMIN1_FETCH_K) {
              loadAdmin1Boundaries();
            }
            syncNodePinScale(k);
            syncEdgeAndMarkerZoom(k);
          });
        svg.call(zoom);
        zoomBehaviorRef.current = zoom;
        const kInitial = svgRef.current ? d3.zoomTransform(svgRef.current).k : 1;
        zoomKRef.current = kInitial;
        applyAdmin1ZoomStyle(kInitial);

        const simNodes: GraphNode[] = nodes.map((n) => ({ ...n }));
        const nodeById = projectNodes(simNodes, projection);

        /** Node center to node center (arrow sits at midpoint). */
        function edgeLineEndpoints(
          d: GraphEdge,
          _k: number
        ): { x1: number; y1: number; x2: number; y2: number } {
          const sId = typeof d.source === 'string' ? d.source : d.source.id;
          const tId = typeof d.target === 'string' ? d.target : d.target.id;
          const s = nodeById.get(sId);
          const t = nodeById.get(tId);
          if (!s || !t || s.x === undefined || s.y === undefined || t.x === undefined || t.y === undefined) {
            return { x1: s?.x ?? 0, y1: s?.y ?? 0, x2: t?.x ?? 0, y2: t?.y ?? 0 };
          }
          return {
            x1: s.x,
            y1: s.y,
            x2: t.x,
            y2: t.y,
          };
        }

        const simEdges: GraphEdge[] = edges.map((e) => ({ ...e }));

        const recommendedSetInitial = new Set(
          recommendedEdgesRef.current.map((e) => `${e.source}->${e.target}`)
        );

        const edgeGroup = zoomGroup.append('g').attr('class', 'edges');
        edgeGroup
          .selectAll<SVGLineElement, GraphEdge>('line')
          .data(simEdges)
          .join('line')
          .attr('stroke', '#374151')
          .attr('stroke-width', (d) => {
            const sId = typeof d.source === 'string' ? d.source : d.source.id;
            const tId = typeof d.target === 'string' ? d.target : d.target.id;
            const isRec = recommendedSetInitial.has(`${sId}->${tId}`);
            const getR = (id: string) => riskScoresRef.current[id] ?? 0;
            return (
              baseEdgeStrokeWidthMapUnits(d, getR, isRec) / zoomKRef.current
            );
          })
          .attr('stroke-opacity', 0.4)
          .attr('x1', (d) => edgeLineEndpoints(d, zoomKRef.current).x1)
          .attr('y1', (d) => edgeLineEndpoints(d, zoomKRef.current).y1)
          .attr('x2', (d) => edgeLineEndpoints(d, zoomKRef.current).x2)
          .attr('y2', (d) => edgeLineEndpoints(d, zoomKRef.current).y2);

        const edgeArrowGroup = zoomGroup
          .append('g')
          .attr('class', 'edge-arrows')
          .attr('pointer-events', 'none');
        edgeArrowGroup
          .selectAll<SVGPathElement, GraphEdge>('path.edge-arrow-mid')
          .data(simEdges)
          .join('path')
          .attr('class', 'edge-arrow-mid')
          .attr('d', EDGE_ARROW_PATH)
          .attr('fill', (d) => {
            const sId = typeof d.source === 'string' ? d.source : d.source.id;
            const tId = typeof d.target === 'string' ? d.target : d.target.id;
            const isRec = recommendedSetInitial.has(`${sId}->${tId}`);
            if (isRec) return '#10B981';
            const getR = (id: string) => riskScoresRef.current[id] ?? 0;
            const sr = getR(sId);
            const tr = getR(tId);
            return sr > 0.5 || tr > 0.5 ? '#EF4444' : '#374151';
          })
          .attr('opacity', (d) => {
            const sId = typeof d.source === 'string' ? d.source : d.source.id;
            const tId = typeof d.target === 'string' ? d.target : d.target.id;
            const isRec = recommendedSetInitial.has(`${sId}->${tId}`);
            if (isRec) return 0.95;
            const getR = (id: string) => riskScoresRef.current[id] ?? 0;
            const sr = getR(sId);
            const tr = getR(tId);
            return sr > 0.3 || tr > 0.3 ? 0.7 : 0.4;
          })
          .attr('transform', (d) => {
            const ep = edgeLineEndpoints(d, zoomKRef.current);
            const sId = typeof d.source === 'string' ? d.source : d.source.id;
            const tId = typeof d.target === 'string' ? d.target : d.target.id;
            const isRec = recommendedSetInitial.has(`${sId}->${tId}`);
            const getR = (id: string) => riskScoresRef.current[id] ?? 0;
            const baseW = baseEdgeStrokeWidthMapUnits(d, getR, isRec);
            return transformForMidArrow(
              ep.x1,
              ep.y1,
              ep.x2,
              ep.y2,
              baseW,
              zoomKRef.current
            );
          });

        const nodeGroup = zoomGroup.append('g').attr('class', 'nodes');
        const nodeElements = nodeGroup
          .selectAll<SVGGElement, GraphNode>('g')
          .data(simNodes)
          .join('g')
          .attr('cursor', 'pointer')
          .attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0}) scale(1)`);

        syncNodePinScale = (k: number) => {
          nodeGroup
            .selectAll<SVGGElement, GraphNode>('g')
            .attr(
              'transform',
              (d) => `translate(${d.x ?? 0},${d.y ?? 0}) scale(${1 / k})`
            );
        };
        if (svgRef.current) {
          const kk = d3.zoomTransform(svgRef.current).k;
          syncNodePinScale(kk);
        }

        syncEdgeAndMarkerZoom = (k: number) => {
          const getR = (id: string) => riskScoresRef.current[id] ?? 0;
          const recSet = new Set(
            recommendedEdgesRef.current.map((e) => `${e.source}->${e.target}`)
          );
          edgeGroup.selectAll<SVGLineElement, GraphEdge>('line').each(function (d) {
            const sId = typeof d.source === 'string' ? d.source : d.source.id;
            const tId = typeof d.target === 'string' ? d.target : d.target.id;
            const isRec = recSet.has(`${sId}->${tId}`);
            const baseW = baseEdgeStrokeWidthMapUnits(d, getR, isRec);
            const ep = edgeLineEndpoints(d, k);
            d3.select(this)
              .attr('stroke-width', baseW / k)
              .attr('x1', ep.x1)
              .attr('y1', ep.y1)
              .attr('x2', ep.x2)
              .attr('y2', ep.y2);
          });
          edgeArrowGroup.selectAll<SVGPathElement, GraphEdge>('path.edge-arrow-mid').each(function (d) {
            const sId = typeof d.source === 'string' ? d.source : d.source.id;
            const tId = typeof d.target === 'string' ? d.target : d.target.id;
            const isRec = recSet.has(`${sId}->${tId}`);
            const baseW = baseEdgeStrokeWidthMapUnits(d, getR, isRec);
            const ep = edgeLineEndpoints(d, k);
            d3.select(this).attr(
              'transform',
              transformForMidArrow(ep.x1, ep.y1, ep.x2, ep.y2, baseW, k)
            );
          });
        };
        if (svgRef.current) {
          syncEdgeAndMarkerZoom(d3.zoomTransform(svgRef.current).k);
        }

        nodeElements
          .append('circle')
          .attr('class', 'node-radar')
          .attr('r', (d) => geoMapNodeRadiusForNode(d) + 2)
          .attr('fill', 'none')
          .attr('stroke', (d) => NODE_TYPE_CONFIG[d.type]?.color ?? 'var(--accent-cyan)')
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.2)
          .attr('stroke-dasharray', '2 2');

        nodeElements
          .append('circle')
          .attr('class', 'node-main')
          .attr('r', (d) => geoMapNodeRadiusForNode(d))
          .attr('fill', (d) => riskToColor(d.current_risk))
          .attr('stroke', (d) => NODE_TYPE_CONFIG[d.type]?.color ?? 'var(--accent-cyan)')
          .attr('stroke-width', 1.5)
          .attr('fill-opacity', 0.85);

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

        requestAnimationFrame(() => {
          applyRiskAndEdgesToSvg();
        });
      } catch (err) {
        console.error('[SupplyMap] Map init failed', err);
      }
    };

    void runMapInit();

    return () => {
      cancelled = true;
      zoomBehaviorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, mapSize.w, mapSize.h, applyRiskAndEdgesToSvg]);

  useEffect(() => {
    applyRiskAndEdgesToSvg();
  }, [riskScores, recommendedEdges, applyRiskAndEdgesToSvg]);

  const handleZoomIn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const el = svgRef.current;
    const z = zoomBehaviorRef.current;
    if (!el || !z) return;
    d3.select(el).transition().duration(200).call(z.scaleBy, ZOOM_STEP);
  }, []);

  const handleZoomOut = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const el = svgRef.current;
    const z = zoomBehaviorRef.current;
    if (!el || !z) return;
    d3.select(el).transition().duration(200).call(z.scaleBy, 1 / ZOOM_STEP);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-[radial-gradient(ellipse_at_center,#0f172a_0%,#020617_100%)] [&_svg]:h-full [&_svg]:w-full"
    >
      <div
        className="pointer-events-none absolute bottom-4 left-4 z-[4] rounded-[10px] border border-cyan-500/20 bg-gradient-to-br from-slate-800/95 to-slate-900/95 px-3 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-md"
        aria-live="polite"
      >
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${wsConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.65)]' : 'bg-slate-500/60'}`}
            aria-hidden
          />
          <span
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-tech text-[10px] font-bold uppercase tracking-wide ${sourceBadge.badgeClass}`}
          >
            {sourceBadge.icon} {sourceBadge.label.toUpperCase()}
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            {wsConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        {latestIntel ? (
          <p className="mt-1 max-w-[min(92vw,420px)] font-mono text-[10px] leading-snug text-slate-300">
            <span className="text-cyan-400/90 tabular-nums">
              [{new Date(latestIntel.created_at).toLocaleTimeString()}]
            </span>{' '}
            {typeLabel.toUpperCase()} DETECTED AT{' '}
            {(latestIntel.location || latestIntel.affected_node_id).toUpperCase()}{' '}
            <span className="text-rose-400/95 font-semibold">
              {(latestIntel.severity * 100).toFixed(0)}% CRITICALITY
            </span>
          </p>
        ) : (
          <p className="font-mono text-[10px] text-slate-500 mt-1">No active intelligence events</p>
        )}
      </div>
      <div
        className="absolute bottom-4 right-4 z-[4] flex flex-col overflow-hidden rounded-[10px] border border-cyan-500/20 bg-gradient-to-br from-slate-800/95 to-slate-900/95 shadow-[0_4px_24px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-md"
        role="group"
        aria-label="Map zoom"
      >
        <button
          type="button"
          className="flex h-10 w-10 cursor-pointer items-center justify-center border-b border-slate-500/20 text-slate-300 transition-colors hover:bg-cyan-500/10 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-500/60 active:bg-cyan-500/20"
          onClick={handleZoomIn}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M8 3v10M3 8h10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="flex h-10 w-10 cursor-pointer items-center justify-center text-slate-300 transition-colors hover:bg-cyan-500/10 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-500/60 active:bg-cyan-500/20"
          onClick={handleZoomOut}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M3 8h10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
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
