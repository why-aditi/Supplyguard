import { create } from 'zustand';
import type { GraphNode, GraphEdge, Disruption, Recommendation } from './types';

interface SupplyGuardState {
  // Graph data
  nodes: GraphNode[];
  edges: GraphEdge[];
  setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void;

  // Risk scores (live updates via WebSocket)
  riskScores: Record<string, number>;
  updateRiskScore: (nodeId: string, risk: number) => void;
  batchUpdateRiskScores: (updates: Record<string, number>) => void;
  resetRiskScores: () => void;

  // Active disruptions
  disruptions: Disruption[];
  addDisruption: (disruption: Disruption) => void;
  clearDisruptions: () => void;

  // Recommendations
  recommendations: Recommendation[];
  recommendedEdges: Array<{ source: string; target: string }>;
  setRecommendations: (recs: Recommendation[], edges: Array<{ source: string; target: string }>) => void;
  clearRecommendations: () => void;

  // UI state
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  isRecommendationDrawerOpen: boolean;
  setRecommendationDrawerOpen: (open: boolean) => void;
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
}

export const useSupplyGuardStore = create<SupplyGuardState>((set) => ({
  // Graph data
  nodes: [],
  edges: [],
  setGraphData: (nodes, edges) => set({ nodes, edges }),

  // Risk scores
  riskScores: {},
  updateRiskScore: (nodeId, risk) =>
    set((state) => ({
      riskScores: { ...state.riskScores, [nodeId]: risk },
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, current_risk: risk } : n
      ),
    })),
  batchUpdateRiskScores: (updates) =>
    set((state) => ({
      riskScores: { ...state.riskScores, ...updates },
      nodes: state.nodes.map((n) =>
        updates[n.id] !== undefined ? { ...n, current_risk: updates[n.id] } : n
      ),
    })),
  resetRiskScores: () =>
    set((state) => ({
      riskScores: {},
      nodes: state.nodes.map((n) => ({ ...n, current_risk: 0 })),
      disruptions: [],
      recommendations: [],
      recommendedEdges: [],
    })),

  // Disruptions
  disruptions: [],
  addDisruption: (disruption) =>
    set((state) => ({
      disruptions: state.disruptions.some((d) => d.id === disruption.id)
        ? state.disruptions
        : [disruption, ...state.disruptions].slice(0, 50),
    })),
  clearDisruptions: () => set({ disruptions: [] }),

  // Recommendations
  recommendations: [],
  recommendedEdges: [],
  setRecommendations: (recommendations, recommendedEdges) =>
    set({ recommendations, recommendedEdges, isRecommendationDrawerOpen: true }),
  clearRecommendations: () =>
    set({ recommendations: [], recommendedEdges: [], isRecommendationDrawerOpen: false }),

  // UI state
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  isRecommendationDrawerOpen: false,
  setRecommendationDrawerOpen: (open) => set({ isRecommendationDrawerOpen: open }),
  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
}));
