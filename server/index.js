import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { AISStreamWorker } from './workers/aisStreamWorker.js';
import { RSSWorker } from './workers/rssWorker.js';
import { propagateRiskNeo4j } from './lib/neo4j-risk-service.js';
import { fetchFullGraph } from './lib/neo4j-client.js';



dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// In-memory state (populated on startup)
let graphNodes = new Map();
let graphEdges = [];
const activeDisruptions = new Map(); // id -> disruption event

/**
 * Initializes the graph from Neo4j or fallback seed file.
 */
async function initializeGraph() {
  const useNeo4j = process.env.USE_NEO4J === 'true';
  let data = null;

  if (useNeo4j) {
    console.log('🔄 Fetching live graph from Neo4j...');
    data = await fetchFullGraph();
  }

  // Fallback if Neo4j is off or returned no nodes
  if (!data || data.nodes.length === 0) {
    console.log(`📡 Using fallback seed data (Neo4j ${useNeo4j ? 'is empty/down' : 'is disabled'})`);
    data = JSON.parse(
      readFileSync(join(__dirname, '..', 'data', 'seed', 'graph-seed.json'), 'utf-8')
    );
  }

  // Clear and populate
  graphNodes.clear();
  data.nodes.forEach(n => graphNodes.set(n.id, { ...n }));
  graphEdges = [...data.edges];
  
  console.log(`✅ Graph initialized: ${graphNodes.size} nodes, ${graphEdges.length} edges`);
  return true;
}


// ── Shared disruption handler (used by AIS + RSS workers) ───
function handleAutoDisruption(event, sourcePrefix) {
  const disruptionId = `${sourcePrefix}-${Date.now()}`;
  const disruption = {
    id: disruptionId,
    disruption_type: event.disruption_type,
    severity: event.severity,
    location: event.location,
    affected_node_id: event.affected_node_id,
    confidence: event.confidence,
    created_at: new Date().toISOString(),
    resolved: false,
    source: event.source || sourcePrefix,
    details: event.details,
  };
  activeDisruptions.set(disruptionId, disruption);

  // Risk propagation
  if (graphNodes.has(event.affected_node_id)) {
    const useNeo4j = process.env.USE_NEO4J === 'true';
    
    // Choose propagation engine
    const getPropagation = useNeo4j 
      ? () => propagateRiskNeo4j(event.affected_node_id, event.severity)
      : () => Promise.resolve(propagateRisk(event.affected_node_id, event.severity));

    getPropagation().then(propagation => {
      if (!propagation) return;
      for (const [nid, data] of Object.entries(propagation)) {
        const n = graphNodes.get(nid);
        if (n) {
          n.current_risk = Math.min(1.0, Math.max(n.current_risk, data.risk));
        }
      }
      broadcastRiskUpdate(propagation);
      console.log(`[RISK] Propagated to ${Object.keys(propagation).length} nodes using ${useNeo4j ? 'Neo4j' : 'Memory'}`);
    }).catch(err => {
      console.error('[RISK] Propagation failed — falling back to Memory... Error:', err.message);
      // Fallback to memory on failure
      const fallback = propagateRisk(event.affected_node_id, event.severity);
      for (const [nid, data] of Object.entries(fallback)) {
        const n = graphNodes.get(nid);
        if (n) n.current_risk = Math.min(1.0, Math.max(n.current_risk, data.risk));
      }
      broadcastRiskUpdate(fallback);
    });
  }



  broadcastDisruption(disruption);
  console.log(`[${sourcePrefix.toUpperCase()}] Disruption: ${event.disruption_type} at ${event.location} (severity: ${event.severity})`);
}

// ── AISstream Worker ────────────────────────────────
const aisWorker = new AISStreamWorker({
  apiKey: process.env.AISSTREAM_API_KEY,
  onDisruption: (event) => handleAutoDisruption(event, 'ais'),
  onVesselUpdate: (update) => {
    broadcast({ type: 'vessel_update', ...update });
  },
});

// ── RSS Ingestion Worker ────────────────────────────
const rssWorker = new RSSWorker({
  onDisruption: (event) => handleAutoDisruption(event, 'rss'),
});


// ── Express App ─────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// GET /api/graph — full graph for D3
app.get('/api/graph', (_req, res) => {
  res.json({
    nodes: Array.from(graphNodes.values()),
    edges: graphEdges,
  });
});

// GET /api/risks — current risk scores
app.get('/api/risks', (_req, res) => {
  const risks = {};
  for (const [id, node] of graphNodes) {
    risks[id] = node.current_risk;
  }
  res.json(risks);
});

// GET /api/disruptions — active disruption events
app.get('/api/disruptions', (_req, res) => {
  res.json(Array.from(activeDisruptions.values()));
});

// POST /api/simulate — trigger a disruption
app.post('/api/simulate', async (req, res) => {
  const {
    node_id,
    disruption_type = 'port_delay',
    severity = 0.8,
    origin_node_id,
    dest_node_id,
  } = req.body;

  if (!node_id || !graphNodes.has(node_id)) {
    return res.status(400).json({ error: 'Invalid node_id' });
  }

  const hasO = origin_node_id != null && String(origin_node_id).trim() !== '';
  const hasD = dest_node_id != null && String(dest_node_id).trim() !== '';
  if (hasO !== hasD) {
    return res.status(400).json({
      error: 'Provide both origin_node_id and dest_node_id, or omit both.',
    });
  }
  if (hasO && hasD) {
    if (origin_node_id === dest_node_id) {
      return res.status(400).json({ error: 'origin and destination must differ' });
    }
    if (!graphNodes.has(origin_node_id) || !graphNodes.has(dest_node_id)) {
      return res.status(400).json({ error: 'Invalid origin_node_id or dest_node_id' });
    }
  }

  const disruptionId = `dis-${Date.now()}`;
  const node = graphNodes.get(node_id);

  // Create disruption event
  const disruption = {
    id: disruptionId,
    disruption_type,
    severity,
    location: node.location?.country || '',
    affected_node_id: node_id,
    confidence: 0.92,
    created_at: new Date().toISOString(),
    resolved: false,
  };
  if (hasO && hasD) {
    disruption.origin_node_id = origin_node_id;
    disruption.dest_node_id = dest_node_id;
    disruption.origin_name = graphNodes.get(origin_node_id).name;
    disruption.dest_name = graphNodes.get(dest_node_id).name;
  }
  activeDisruptions.set(disruptionId, disruption);

  try {
    // Simulation logic
    const useNeo4j = process.env.USE_NEO4J === 'true';
    const propagationResult = useNeo4j 
      ? await propagateRiskNeo4j(node_id, severity)
      : propagateRisk(node_id, severity);

    // Update node risk scores
    for (const [nid, data] of Object.entries(propagationResult)) {
      const n = graphNodes.get(nid);
      if (n) {
        n.current_risk = Math.min(1.0, Math.max(n.current_risk, data.risk));
      }
    }

    // Broadcast via WebSocket
    broadcastRiskUpdate(propagationResult);
    broadcastDisruption(disruption);

    // Try to get LLM recommendations
    let recommendations = null;
    try {
      recommendations = await getRecommendations(disruption, propagationResult);
    } catch (err) {
      console.warn('LLM recommendations unavailable:', err.message);
    }

    res.json({
      disruption,
      propagation: propagationResult,
      recommendations,
      engine: useNeo4j ? 'neo4j' : 'memory'
    });
  } catch (err) {
    console.error('[SIMULATE] Critical failure:', err.stack);
    res.status(500).json({ error: 'Simulation failed', message: err.message });
  }


});

// POST /api/recommendations — get LLM rerouting for a disruption
app.post('/api/recommendations', async (req, res) => {
  const { disruption_id } = req.body;
  const disruption = activeDisruptions.get(disruption_id);

  if (!disruption) {
    return res.status(404).json({ error: 'Disruption not found' });
  }

  try {
    const propagation = propagateRisk(disruption.affected_node_id, disruption.severity);
    const recs = await getRecommendations(disruption, propagation);
    res.json(recs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate recommendations', message: err.message });
  }
});

// DELETE /api/simulate/reset — clear all disruptions
app.delete('/api/simulate/reset', (_req, res) => {
  activeDisruptions.clear();
  for (const [, node] of graphNodes) {
    node.current_risk = 0.0;
  }
  broadcastReset();
  res.json({ status: 'reset' });
});

// POST /api/graph/refresh — reload graph from Neo4j
app.post('/api/graph/refresh', async (_req, res) => {
  try {
    await initializeGraph();
    broadcast({ type: 'graph_reload' }); // Notify frontend to refetch graph
    res.json({ status: 'ok', nodes: graphNodes.size, edges: graphEdges.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to refresh graph', message: err.message });
  }
});

// GET /api/ais/status — AISstream connection status

app.get('/api/ais/status', (_req, res) => {
  res.json(aisWorker.getStatus());
});

// GET /api/rss/status — RSS ingestion status
app.get('/api/rss/status', (_req, res) => {
  res.json(rssWorker.getStatus());
});

// ── BFS Risk Propagation ────────────────────────────
function propagateRisk(startNodeId, baseRisk, decay = 0.7, maxDepth = 6) {
  const adjacency = buildAdjacency();
  const visited = {};
  const queue = [{ nodeId: startNodeId, risk: baseRisk, depth: 0 }];

  while (queue.length > 0) {
    const { nodeId, risk, depth } = queue.shift();
    if (visited[nodeId] || risk < 0.05) continue;

    visited[nodeId] = { risk: Math.round(risk * 1000) / 1000, depth };

    if (depth >= maxDepth) continue;

    const neighbors = adjacency.get(nodeId) || [];
    for (const { target, weight } of neighbors) {
      if (!visited[target]) {
        const propagated = risk * weight * decay;
        queue.push({ nodeId: target, risk: propagated, depth: depth + 1 });
      }
    }
  }

  return visited;
}

function buildAdjacency() {
  const adj = new Map();
  for (const edge of graphEdges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source).push({ target: edge.target, weight: edge.weight });
  }
  return adj;
}

/** Predecessors in the original directed graph (for distance-to-destination BFS). */
function buildReverseAdjacency() {
  const adj = new Map();
  for (const edge of graphEdges) {
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.target).push(edge.source);
  }
  return adj;
}

function bfsHopDistancesFrom(startId) {
  const dist = new Map();
  const queue = [startId];
  dist.set(startId, 0);
  const adj = buildAdjacency();
  while (queue.length > 0) {
    const u = queue.shift();
    const d = dist.get(u);
    for (const { target } of adj.get(u) || []) {
      if (!dist.has(target)) {
        dist.set(target, d + 1);
        queue.push(target);
      }
    }
  }
  return dist;
}

/** Shortest hop distance from each node to destId in the directed graph. */
function bfsHopDistancesToDest(destId) {
  const dist = new Map();
  const queue = [destId];
  dist.set(destId, 0);
  const radj = buildReverseAdjacency();
  while (queue.length > 0) {
    const u = queue.shift();
    const d = dist.get(u);
    for (const pred of radj.get(u) || []) {
      if (!dist.has(pred)) {
        dist.set(pred, d + 1);
        queue.push(pred);
      }
    }
  }
  return dist;
}

function edgeToAlternateRoute(e) {
  return {
    source_node_id: e.source,
    target_node_id: e.target,
    from: graphNodes.get(e.source)?.name || e.source,
    to: graphNodes.get(e.target)?.name || e.target,
    mode: e.transport_mode,
    lead_time_days: e.lead_time_days,
  };
}

/** Attach graph edge ids to LLM rows when missing; match by exact route string or name substring. */
function enrichRecommendationsWithEdgeIds(recommendations, alternateRoutesFull) {
  if (!alternateRoutesFull?.length || !recommendations?.length) return recommendations;
  return recommendations.map((rec) => {
    if (rec.source_node_id && rec.target_node_id) return rec;
    const routeStr = (rec.route || '').trim();
    const exact = alternateRoutesFull.find(
      (ar) => `${ar.from} → ${ar.to} (${ar.mode})` === routeStr
    );
    if (exact) {
      return {
        ...rec,
        source_node_id: exact.source_node_id,
        target_node_id: exact.target_node_id,
      };
    }
    const fuzzy = alternateRoutesFull.find((ar) => {
      const r = routeStr.toLowerCase();
      return r.includes(String(ar.from).toLowerCase()) && r.includes(String(ar.to).toLowerCase());
    });
    if (fuzzy) {
      return {
        ...rec,
        source_node_id: fuzzy.source_node_id,
        target_node_id: fuzzy.target_node_id,
      };
    }
    return rec;
  });
}

function computeLegacyAlternateRoutes(propagation) {
  const disruptedIds = new Set(Object.keys(propagation));
  return graphEdges
    .filter((e) => !disruptedIds.has(e.source) || !disruptedIds.has(e.target))
    .slice(0, 10)
    .map((e) => edgeToAlternateRoute(e));
}

/**
 * Edges that lie on shortest path(s) from origin to dest; if too few, add one-hop detour edges (length L+1).
 */
function computeOdAlternateRoutes(originId, destId) {
  const distFrom = bfsHopDistancesFrom(originId);
  const distToDest = bfsHopDistancesToDest(destId);

  if (!distFrom.has(destId)) {
    return { routes: [], unreachable: true, shortestLen: null };
  }

  const L = distFrom.get(destId);
  const seen = new Set();
  const out = [];

  function collectForLength(len) {
    for (const e of graphEdges) {
      const du = distFrom.get(e.source);
      const dv = distToDest.get(e.target);
      if (du === undefined || dv === undefined) continue;
      if (du + 1 + dv !== len) continue;
      const key = `${e.source}|${e.target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(edgeToAlternateRoute(e));
    }
  }

  collectForLength(L);
  if (out.length < 5) {
    collectForLength(L + 1);
  }

  return { routes: out.slice(0, 15), unreachable: false, shortestLen: L };
}

// ── LLM Recommendation Engine ───────────────────────
async function getRecommendations(disruption, propagation) {
  const affectedNodes = Object.entries(propagation)
    .map(([id, data]) => ({
      id,
      name: graphNodes.get(id)?.name || id,
      risk: data.risk,
      depth: data.depth,
    }))
    .sort((a, b) => b.risk - a.risk);

  let alternateRoutes;
  let odContext = null;

  if (disruption.origin_node_id && disruption.dest_node_id) {
    const od = computeOdAlternateRoutes(
      disruption.origin_node_id,
      disruption.dest_node_id
    );
    alternateRoutes = od.routes;
    odContext = {
      originName:
        disruption.origin_name ||
        graphNodes.get(disruption.origin_node_id)?.name ||
        disruption.origin_node_id,
      destName:
        disruption.dest_name ||
        graphNodes.get(disruption.dest_node_id)?.name ||
        disruption.dest_node_id,
      unreachable: od.unreachable,
      shortestLen: od.shortestLen,
    };
  } else {
    alternateRoutes = computeLegacyAlternateRoutes(propagation);
  }

  const prompt = buildPrompt(disruption, affectedNodes, alternateRoutes, odContext);

  // Try Gemini first, then Grok
  let result;
  let llmSource = 'gemini';

  try {
    result = await callGemini(prompt);
    console.log('✅ Gemini recommendation successful');
  } catch (err) {
    console.warn('Gemini failed, trying Groq:', err.message);
    llmSource = 'groq';
    try {
      result = await callGroq(prompt);
      console.log('✅ Groq fallback successful');
    } catch (groqErr) {
      console.warn('❌ Groq also failed:', groqErr.message);
      // Return graph-computed fallback
      return {
        disruption_id: disruption.id,
        llm_source: 'fallback',
        recommendations: alternateRoutes.slice(0, 3).map((r, i) => ({
          rank: i + 1,
          route: `${r.from} → ${r.to} (${r.mode})`,
          source_node_id: r.source_node_id,
          target_node_id: r.target_node_id,
          reasoning: 'Graph-computed alternate route (LLM unavailable)',
          cost_delta_percent: Math.round(Math.random() * 30 + 5),
          lead_time_delta_days: r.lead_time_days,
          risk_reduction_percent: Math.round(Math.random() * 40 + 20),
          confidence: 'medium',
        })),
      };
    }
  }



  // Parse and validate
  try {
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    const rawRecs = (parsed.recommendations || []).map((r) => ({
      ...r,
      llm_source: llmSource,
    }));
    const recs = enrichRecommendationsWithEdgeIds(rawRecs, alternateRoutes);
    return {
      disruption_id: disruption.id,
      llm_source: llmSource,
      recommendations: recs.slice(0, 3),
    };
  } catch (parseErr) {
    console.error('Failed to parse LLM response:', parseErr.message);
    return {
      disruption_id: disruption.id,
      llm_source: 'fallback',
      recommendations: [],
    };
  }
}

function buildPrompt(disruption, affectedNodes, alternateRoutes, odContext) {
  const shipmentBlock = odContext
    ? odContext.unreachable
      ? `SHIPMENT LEG: origin = ${odContext.originName} → destination = ${odContext.destName}
There is no directed path in the network graph between this origin and destination. Suggest practical mitigations using the disruption and affected nodes below; you may not have graph-edge alternates for this OD pair.

`
      : `SHIPMENT LEG: origin = ${odContext.originName} → destination = ${odContext.destName} (shortest hop count = ${odContext.shortestLen})
The listed routes are edges on shortest path(s) between origin and destination (and optionally one-hop detours), pre-computed by the graph engine.

`
    : '';

  return `You are a supply chain risk analyst. A disruption has been detected.

DISRUPTION: ${disruption.disruption_type} at ${disruption.location || disruption.affected_node_id} — severity ${disruption.severity}/1.0

${shipmentBlock}AFFECTED NODES (from graph propagation):
${JSON.stringify(affectedNodes.slice(0, 15), null, 2)}

AVAILABLE ALTERNATE ROUTES (pre-computed by graph engine):
${JSON.stringify(alternateRoutes, null, 2)}

Return ONLY valid JSON — no preamble, no markdown:
{
  "recommendations": [
    {
      "rank": 1,
      "source_node_id": "graph node id from AVAILABLE ALTERNATE ROUTES list (copy exactly)",
      "target_node_id": "graph node id from AVAILABLE ALTERNATE ROUTES list (copy exactly)",
      "route": "Description of rerouting path (should match a listed alternate when possible)",
      "reasoning": "Why this route is recommended",
      "cost_delta_percent": 12,
      "lead_time_delta_days": 3,
      "risk_reduction_percent": 45,
      "confidence": "high"
    }
  ]
}

Provide exactly 3 ranked recommendations. Prefer edges from AVAILABLE ALTERNATE ROUTES and copy their source_node_id and target_node_id when applicable. Be specific about ports, carriers, and transport modes.`;
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '8000', 10);

  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini timeout')), timeoutMs)
    ),
  ]);

  return result.response.text();
}

async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  const resp = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  return resp.choices[0].message.content;
}

// ── WebSocket Server ────────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  console.log(`WS client connected (total: ${wsClients.size})`);

  // Send current state on connect
  ws.send(
    JSON.stringify({
      type: 'init',
      risks: Object.fromEntries(
        Array.from(graphNodes.entries()).map(([id, n]) => [id, n.current_risk])
      ),
      disruptions: Array.from(activeDisruptions.values()),
    })
  );

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`WS client disconnected (total: ${wsClients.size})`);
  });
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of wsClients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

function broadcastRiskUpdate(propagation) {
  const timestamp = new Date().toISOString();
  // Send updates one by one with small delays for animation effect
  const entries = Object.entries(propagation).sort((a, b) => a[1].depth - b[1].depth);
  
  entries.forEach(([nodeId, data], i) => {
    setTimeout(() => {
      broadcast({
        type: 'risk_update',
        node_id: nodeId,
        risk_score: data.risk,
        depth: data.depth,
        timestamp,
      });
    }, i * 400); // 400ms per hop for ripple animation
  });
}

function broadcastDisruption(disruption) {
  broadcast({ type: 'disruption', ...disruption });
}

function broadcastReset() {
  broadcast({ type: 'reset' });
}

// ── Start Server ────────────────────────────────────
async function startServer() {
  // 1. Initialize Graph FIRST
  await initializeGraph();

  server.listen(PORT, () => {
    console.log(`\u{1f6e1}\ufe0f  SupplyGuard API running on http://localhost:${PORT}`);
    console.log(`\u{1f4e1} WebSocket on ws://localhost:${PORT}/ws`);
    console.log(`\u{1f4ca} ${graphNodes.size} nodes, ${graphEdges.length} edges loaded`);
    console.log(`\u{1f5d3}\ufe0f  Config: [Neo4j: ${process.env.USE_NEO4J === 'true' ? 'Enabled' : 'Disabled (In-Memory)'}] [AIS: ${process.env.AISSTREAM_ENABLED !== 'false' ? 'Active' : 'Off'}]`);

    // Start AIS tracking if enabled
    if (process.env.AISSTREAM_ENABLED !== 'false') {
      aisWorker.start();
    }

    // Start RSS ingestion
    rssWorker.start();

    console.log('');
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

