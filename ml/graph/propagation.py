"""
SupplyGuard AI — NetworkX Graph Propagation Engine
BFS risk propagation with configurable decay and max depth.
"""

import networkx as nx
from collections import deque
from typing import Dict, Any


class GraphPropagationEngine:
    """
    Manages a directed supply chain graph and runs BFS risk propagation.
    """

    def __init__(self, seed_data: dict):
        self.graph = nx.DiGraph()
        self.risk_scores: Dict[str, float] = {}
        self._load_seed(seed_data)

    def _load_seed(self, seed_data: dict):
        """Load nodes and edges from seed JSON."""
        for node in seed_data.get("nodes", []):
            self.graph.add_node(
                node["id"],
                name=node["name"],
                type=node["type"],
                location=node.get("location", {}),
                tier=node.get("tier", 1),
                centrality=node.get("centrality", 0.5),
            )
            self.risk_scores[node["id"]] = node.get("current_risk", 0.0)

        for edge in seed_data.get("edges", []):
            self.graph.add_edge(
                edge["source"],
                edge["target"],
                weight=edge.get("weight", 0.5),
                lead_time_days=edge.get("lead_time_days", 0),
                transport_mode=edge.get("transport_mode", "sea"),
                annual_volume_usd=edge.get("annual_volume_usd", 0),
            )

    @property
    def node_count(self) -> int:
        return self.graph.number_of_nodes()

    @property
    def edge_count(self) -> int:
        return self.graph.number_of_edges()

    def has_node(self, node_id: str) -> bool:
        return self.graph.has_node(node_id)

    def get_risk(self, node_id: str) -> float:
        return self.risk_scores.get(node_id, 0.0)

    def propagate_risk(
        self,
        start_node_id: str,
        base_risk: float,
        decay: float = 0.7,
        max_depth: int = 6,
    ) -> Dict[str, Dict[str, Any]]:
        """
        Run BFS risk propagation from a disrupted node.
        
        Args:
            start_node_id: The disrupted node
            base_risk: Initial risk score (0.0–1.0)
            decay: Risk decay factor per hop
            max_depth: Maximum BFS depth
            
        Returns:
            Dict mapping node_id -> {risk, depth}
        """
        visited: Dict[str, Dict[str, Any]] = {}
        queue = deque([(start_node_id, base_risk, 0)])

        while queue:
            node_id, risk, depth = queue.popleft()

            if node_id in visited or risk < 0.05:
                continue

            visited[node_id] = {
                "risk": round(risk, 4),
                "depth": depth,
            }

            # Update stored risk score
            self.risk_scores[node_id] = max(
                self.risk_scores.get(node_id, 0.0), risk
            )

            if depth >= max_depth:
                continue

            # Propagate to successors
            for neighbor in self.graph.successors(node_id):
                if neighbor not in visited:
                    edge_data = self.graph[node_id][neighbor]
                    edge_weight = edge_data.get("weight", 0.5)
                    propagated_risk = risk * edge_weight * decay
                    queue.append((neighbor, propagated_risk, depth + 1))

        return visited

    def reset_risks(self):
        """Reset all risk scores to 0."""
        for node_id in self.risk_scores:
            self.risk_scores[node_id] = 0.0

    def get_alternate_routes(
        self, disrupted_nodes: set, target_node: str
    ) -> list:
        """Find paths to target that avoid disrupted nodes."""
        alternates = []
        for source in self.graph.nodes():
            if source in disrupted_nodes or source == target_node:
                continue
            try:
                paths = list(
                    nx.all_simple_paths(
                        self.graph, source, target_node, cutoff=4
                    )
                )
                for path in paths:
                    # Check if path avoids disrupted nodes
                    if not any(n in disrupted_nodes for n in path[1:-1]):
                        alternates.append({
                            "path": path,
                            "hops": len(path) - 1,
                        })
            except nx.NodeNotFound:
                continue

        return sorted(alternates, key=lambda x: x["hops"])[:10]
