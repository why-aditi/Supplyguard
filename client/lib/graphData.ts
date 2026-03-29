import type { GraphNode, GraphEdge } from './types';

import { fetchGraph } from './api';

/** Ports render smaller than other node types on the geographic map */
const GEO_MAP_PORT_RADIUS_FACTOR = 0.6;

// Cached data from the server API
let _cachedData: { nodes: GraphNode[]; edges: GraphEdge[] } | null = null;

async function loadSeedData(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  if (_cachedData) return _cachedData;
  try {
    _cachedData = await fetchGraph();
    return _cachedData!;
  } catch (err) {
    console.error('Failed to fetch live graph, falling back to static seed:', err);
    const res = await fetch('/graph-seed.json');
    _cachedData = await res.json();
    return _cachedData!;
  }
}


// For synchronous access, we pre-load via the store init
let _nodes: GraphNode[] = [];
let _edges: GraphEdge[] = [];

export function setSeedData(nodes: GraphNode[], edges: GraphEdge[]) {
  _nodes = nodes;
  _edges = edges;
}

export function getNodes(): GraphNode[] {
  return _nodes;
}

export function getEdges(): GraphEdge[] {
  return _edges;
}

export { loadSeedData };

export function getNodeById(id: string): GraphNode | undefined {
  return getNodes().find((n) => n.id === id);
}

export function getConnectedEdges(nodeId: string): GraphEdge[] {
  return getEdges().filter(
    (e) => {
      const sourceId = typeof e.source === 'string' ? e.source : e.source;
      const targetId = typeof e.target === 'string' ? e.target : e.target;
      return sourceId === nodeId || targetId === nodeId;
    }
  );
}

/** Risk score → color (green → amber → red) */
export function riskToColor(risk: number): string {
  if (risk <= 0) return '#16A34A';
  if (risk >= 1) return '#DC2626';
  if (risk <= 0.5) {
    // Green (#16A34A) → Amber (#F59E0B)
    const t = risk / 0.5;
    const r = Math.round(22 + (245 - 22) * t);
    const g = Math.round(163 + (158 - 163) * t);
    const b = Math.round(74 + (11 - 74) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    // Amber (#F59E0B) → Red (#DC2626)
    const t = (risk - 0.5) / 0.5;
    const r = Math.round(245 + (220 - 245) * t);
    const g = Math.round(158 + (38 - 158) * t);
    const b = Math.round(11 + (38 - 11) * t);
    return `rgb(${r},${g},${b})`;
  }
}

/** Normalize volume for edge width (1px–4px) */
export function volumeToWidth(volume: number): number {
  if (volume <= 0) return 1;
  const maxVol = 60000000000; // 60B USD
  return 1 + (Math.min(volume, maxVol) / maxVol) * 3;
}

/** Node radius from centrality */
export function centralityToRadius(centrality: number): number {
  return 8 + centrality * 12;
}

/** Compact markers for geographic world map (readable at full-world zoom) */
export function geoMapNodeRadius(centrality: number): number {
  return 2.5 + centrality * 3.5;
}

/** Same as geoMapNodeRadius but ports use a smaller factor for readability */
export function geoMapNodeRadiusForNode(node: GraphNode): number {
  const base = geoMapNodeRadius(node.centrality);
  if (node.type === 'port') return base * GEO_MAP_PORT_RADIUS_FACTOR;
  return base;
}

/** Transport mode colors */
export const TRANSPORT_MODE_DASH: Record<string, string> = {
  sea: '0',       // solid
  air: '6 3',     // dashed
  road: '3 3',    // dotted
  rail: '8 4 2 4' // dash-dot
};

/** Format USD amount */
export function formatUSD(amount: number): string {
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(0)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(0)}K`;
  return `$${amount}`;
}
