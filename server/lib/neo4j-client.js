import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../..', '.env') });

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

let driver;

export const getNeo4jDriver = () => {
  if (!driver) {
    if (!uri || !user || !password) {
      console.error('Neo4j credentials missing in .env');
      return null;
    }
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
};

export const closeNeo4jDriver = async () => {
  if (driver) {
    await driver.close();
    driver = null;
  }
};

/**
 * Fetches the entire supply chain graph from Neo4j.
 * Formats data for the D3.js frontend (nodes and edges).
 */
export const fetchFullGraph = async () => {
  const driverInstance = getNeo4jDriver();
  if (!driverInstance) return null;

  const session = driverInstance.session();
  try {
    const result = await session.run(`
      MATCH (n)
      OPTIONAL MATCH (n)-[r:SHIPS_TO]->(m)
      RETURN n, r, m
    `);

    const nodesMap = new Map();
    const edges = [];
    const edgeKeys = new Set(); // To avoid duplicate edges from OPTIONAL MATCH

    result.records.forEach((record) => {
      const nodeA = record.get('n');
      const rel = record.get('r');
      const nodeB = record.get('m');

      // Process Node A
      if (nodeA && !nodesMap.has(nodeA.properties.id)) {
        const { id, name, lat, lng, country, tier, centrality, current_risk, ...otherProps } = nodeA.properties;
        nodesMap.set(id, {
          id,
          name,
          location: { lat, lng, country },
          tier,
          centrality,
          current_risk,
          ...otherProps,
          type: nodeA.labels[0].toLowerCase(),
        });
      }

      // Process Node B (Target)
      if (nodeB && !nodesMap.has(nodeB.properties.id)) {
        const { id, name, lat, lng, country, tier, centrality, current_risk, ...otherProps } = nodeB.properties;
        nodesMap.set(id, {
          id,
          name,
          location: { lat, lng, country },
          tier,
          centrality,
          current_risk,
          ...otherProps,
          type: nodeB.labels[0].toLowerCase(),
        });
      }


      // Process Relationship
      if (rel && nodeA && nodeB) {
        const edgeId = `${nodeA.properties.id}-${nodeB.properties.id}`;
        if (!edgeKeys.has(edgeId)) {
          edgeKeys.add(edgeId);
          edges.push({
            source: nodeA.properties.id,
            target: nodeB.properties.id,
            weight: rel.properties.weight,
            lead_time_days: rel.properties.lead_time,
            transport_mode: rel.properties.mode,
            annual_volume_usd: rel.properties.volume,
          });
        }
      }
    });

    return {
      nodes: Array.from(nodesMap.values()),
      edges: edges,
    };
  } catch (error) {
    console.error('❌ Failed to fetch graph from Neo4j:', error.message);
    return null;
  } finally {
    await session.close();
  }
};

