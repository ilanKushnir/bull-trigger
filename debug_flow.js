const Database = require('better-sqlite3');
const path = require('path');

const DB_FILE = path.resolve(__dirname, 'backend/database.sqlite');
const db = new Database(DB_FILE);

// Get flow edges for strategy 100
const flowEdges = db.prepare('SELECT * FROM flow_edges WHERE strategy_id = ?').all(100);
console.log('🔗 Flow edges:', flowEdges);

// Build edge map like in the code
const edgeMap = new Map();
flowEdges.forEach(edge => {
  const sourceKey = `${edge.source_node_id}:${edge.source_handle || 'default'}`;
  if (!edgeMap.has(sourceKey)) {
    edgeMap.set(sourceKey, []);
  }
  edgeMap.get(sourceKey).push(edge);
});

console.log('\n🎯 Edge map:');
for (const [key, edges] of edgeMap.entries()) {
  console.log(`  ${key} → [${edges.map(e => e.target_node_id).join(', ')}]`);
}

// Test condition result scenarios
console.log('\n🧪 Testing condition results:');

// When condition is TRUE
const trueKey = 'condition_node_5:true';
const trueEdges = edgeMap.get(trueKey) || [];
console.log(`  If condition_node_5 = TRUE, edges: ${trueKey} → [${trueEdges.map(e => e.target_node_id).join(', ')}]`);

// When condition is FALSE  
const falseKey = 'condition_node_5:false';
const falseEdges = edgeMap.get(falseKey) || [];
console.log(`  If condition_node_5 = FALSE, edges: ${falseKey} → [${falseEdges.map(e => e.target_node_id).join(', ')}]`);

db.close(); 