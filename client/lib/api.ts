const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function fetchGraph() {
  const res = await fetch(`${API_URL}/graph`);
  if (!res.ok) throw new Error('Failed to fetch graph');
  return res.json();
}

export async function fetchRisks() {
  const res = await fetch(`${API_URL}/risks`);
  if (!res.ok) throw new Error('Failed to fetch risks');
  return res.json();
}

export async function fetchDisruptions() {
  const res = await fetch(`${API_URL}/disruptions`);
  if (!res.ok) throw new Error('Failed to fetch disruptions');
  return res.json();
}

export async function triggerSimulation(
  nodeId: string,
  disruptionType: string = 'port_delay',
  severity: number = 0.8
) {
  const res = await fetch(`${API_URL}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      node_id: nodeId,
      disruption_type: disruptionType,
      severity,
    }),
  });
  if (!res.ok) throw new Error('Simulation failed');
  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${API_URL}/simulate/reset`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Reset failed');
  return res.json();
}

export async function fetchRecommendations(disruptionId: string) {
  const res = await fetch(`${API_URL}/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disruption_id: disruptionId }),
  });
  if (!res.ok) throw new Error('Failed to fetch recommendations');
  return res.json();
}
