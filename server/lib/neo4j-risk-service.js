import { getNeo4jDriver } from './neo4j-client.js';

/**
 * Propagates risk through the graph using Neo4j instead of in-memory BFS.
 * 
 * @param {string} startNodeId - The ID of the disrupted node
 * @param {number} baseRisk - Initial risk score (0-1)
 * @param {number} decay - Decay factor (default 0.7)
 * @param {number} maxDepth - Max hops (default 6)
 * @returns {Promise<Object>} Map of nodeId -> { risk, depth }
 */
export async function propagateRiskNeo4j(startNodeId, baseRisk, decay = 0.7, maxDepth = 6) {
  const driver = getNeo4jDriver();
  if (!driver) throw new Error('Neo4j Driver not available');

  const session = driver.session();
  try {
    // Cypher query to find all reachable nodes up to maxDepth
    // We fetch the paths so we can calculate the multiplicative risk along each path.
    // In a supply chain, we want the *maximum* risk score reaching a node.
    const query = `
      MATCH p = (start {id: $startId})-[*1..${maxDepth}]->(target)
      WITH target, p,
           relationships(p) as rels,
           length(p) as depth
      // Calculate risk: baseRisk * PRODUCT(rels.weight) * (decay ^ depth)
      // Since Cypher doesn't have a built-in product function for lists, 
      // we'll pass the weights back or use a REDUCE function.
      UNWIND rels as r
      WITH target, depth, collect(r.weight) as weights
      RETURN target.id as nodeId, 
             depth,
             weights
    `;

    const result = await session.run(query, { startId: startNodeId });
    
    const propagation = {
      [startNodeId]: { risk: baseRisk, depth: 0 }
    };

    result.records.forEach(record => {
      const nodeId = record.get('nodeId');
      const depth = record.get('depth').toNumber();
      const weights = record.get('weights');
      
      // Calculate path risk
      let pathRisk = baseRisk;
      for (const w of weights) {
        pathRisk *= w;
      }
      pathRisk *= Math.pow(decay, depth);
      
      // Keep only the highest risk score for a node if multiple paths exist
      if (!propagation[nodeId] || pathRisk > propagation[nodeId].risk) {
        propagation[nodeId] = {
          risk: Math.round(pathRisk * 1000) / 1000,
          depth: depth
        };
      }
    });

    return propagation;
  } finally {
    await session.close();
  }
}
