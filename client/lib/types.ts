// SupplyGuard AI — Shared TypeScript Types

export interface GraphNode {
  id: string;
  name: string;
  type: 'port' | 'factory' | 'warehouse' | 'supplier' | 'carrier';
  location: {
    lat: number;
    lng: number;
    country: string;
  };
  current_risk: number;
  tier: 1 | 2 | 3 | 4;
  centrality: number;
  // D3 simulation properties
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
  lead_time_days: number;
  transport_mode: 'sea' | 'air' | 'road' | 'rail';
  annual_volume_usd: number;
}

export interface RiskUpdate {
  node_id: string;
  risk_score: number;
  timestamp: string;
}

export interface Disruption {
  id: string;
  disruption_type: DisruptionType;
  severity: number;
  location: string;
  affected_node_id: string;
  confidence: number;
  created_at: string;
  resolved: boolean;
  /** When set with dest_node_id, rerouting uses OD-scoped graph paths */
  origin_node_id?: string;
  dest_node_id?: string;
  origin_name?: string;
  dest_name?: string;
}

export type DisruptionType =
  | 'port_delay'
  | 'weather_event'
  | 'supplier_failure'
  | 'geopolitical'
  | 'transport_strike'
  | 'customs_delay'
  | 'none';

export interface Recommendation {
  rank: number;
  route: string;
  reasoning: string;
  cost_delta_percent: number;
  lead_time_delta_days: number;
  risk_reduction_percent: number;
  confidence: 'high' | 'medium' | 'low';
  llm_source?: 'gemini' | 'groq' | 'fallback';
  /** Graph edge endpoints for map highlight when user selects this card */
  source_node_id?: string;
  target_node_id?: string;
}

export interface RecommendationResponse {
  disruption_id: string;
  recommendations: Recommendation[];
  llm_source: 'gemini' | 'groq' | 'fallback';
}

export interface PropagationResult {
  [nodeId: string]: {
    risk: number;
    depth: number;
  };
}

// Node type display config
export const NODE_TYPE_CONFIG: Record<
  GraphNode['type'],
  { icon: string; label: string; color: string }
> = {
  port: { icon: '⚓', label: 'Port', color: '#3B82F6' },
  factory: { icon: '🏭', label: 'Factory', color: '#8B5CF6' },
  warehouse: { icon: '📦', label: 'Warehouse', color: '#F59E0B' },
  supplier: { icon: '🔧', label: 'Supplier', color: '#10B981' },
  carrier: { icon: '🚢', label: 'Carrier', color: '#EC4899' },
};

export const DISRUPTION_TYPE_LABELS: Record<DisruptionType, string> = {
  port_delay: 'Port Delay',
  weather_event: 'Weather Event',
  supplier_failure: 'Supplier Failure',
  geopolitical: 'Geopolitical',
  transport_strike: 'Transport Strike',
  customs_delay: 'Customs Delay',
  none: 'None',
};
