import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getNeo4jDriver, closeNeo4jDriver } from '../lib/neo4j-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DATA_PATH = join(__dirname, '../../data/seed/graph-seed.json');

async function hydrate() {
  const driver = getNeo4jDriver();
  if (!driver) return;

  const session = driver.session();
  const seedData = JSON.parse(readFileSync(SEED_DATA_PATH, 'utf-8'));

  try {
    console.log('--- 🛡️ SupplyGuard Neo4j Hydration Start ---');

    if (process.env.NEO4J_CLEAR === 'true') {
      console.log('NEO4J_CLEAR=true — removing all nodes and relationships...');
      await session.run('MATCH (n) DETACH DELETE n');
    }

    // Create Nodes
    console.log(`Ingesting ${seedData.nodes.length} nodes...`);
    for (const node of seedData.nodes) {
      // Map node type to a Capitalized Label (e.g., 'port' -> ':Port')
      const label = node.type.charAt(0).toUpperCase() + node.type.slice(1);
      
      const query = `
        MERGE (n:${label} {id: $id})
        SET n.name = $name,
            n.lat = $lat,
            n.lng = $lng,
            n.country = $country,
            n.tier = $tier,
            n.centrality = $centrality,
            n.current_risk = $current_risk
      `;

      await session.run(query, {
        id: node.id,
        name: node.name,
        lat: node.location?.lat || 0,
        lng: node.location?.lng || 0,
        country: node.location?.country || 'Unknown',
        tier: node.tier || 3,
        centrality: node.centrality || 0,
        current_risk: node.current_risk || 0
      });
    }

    // 4. Create Edges (Relationships)
    console.log(`Ingesting ${seedData.edges.length} edges...`);
    for (const edge of seedData.edges) {
      const query = `
        MATCH (a {id: $source})
        MATCH (b {id: $target})
        MERGE (a)-[r:SHIPS_TO {
          mode: $mode,
          weight: $weight,
          lead_time: $lead_time,
          volume: $volume
        }]->(b)
      `;

      await session.run(query, {
        source: edge.source,
        target: edge.target,
        mode: edge.transport_mode,
        weight: edge.weight,
        lead_time: edge.lead_time_days,
        volume: edge.annual_volume_usd || 0
      });
    }

    console.log('--- ✅ Hydration Complete ---');
    
    // Quick verify
    const result = await session.run('MATCH (n) RETURN count(n) as count');
    console.log(`Final Node Count in Neo4j: ${result.records[0].get('count').toNumber()}`);

  } catch (error) {
    console.error('❌ Hydration failed:', error.message);
  } finally {
    await session.close();
    await closeNeo4jDriver();
  }
}

hydrate().catch(console.error);
