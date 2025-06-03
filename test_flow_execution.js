// Simple test to check if flow-based execution works correctly
const Database = require('better-sqlite3');
const path = require('path');

const DB_FILE = path.resolve(__dirname, 'backend/database.sqlite');
const db = new Database(DB_FILE);

function getFlowEdges(strategyId) {
  return db.prepare('SELECT * FROM flow_edges WHERE strategy_id = ? ORDER BY created_at').all(strategyId);
}

function getConditionNodesByStrategy(strategyId) {
  const rows = db.prepare(`
    SELECT 
      id, 
      strategy_id as strategyId, 
      name, 
      condition_type as conditionType, 
      left_operand as leftOperand, 
      operator, 
      right_operand as rightOperand, 
      true_output_variable as trueOutputVariable, 
      false_output_variable as falseOutputVariable, 
      order_index as orderIndex, 
      enabled 
    FROM strategy_nodes_conditions 
    WHERE strategy_id = ? 
    ORDER BY order_index ASC
  `).all(strategyId);
  
  return rows.map(row => ({
    ...row,
    enabled: Boolean(row.enabled)
  }));
}

function getTelegramMessageNodesByStrategy(strategyId) {
  const rows = db.prepare(`
    SELECT 
      id, 
      strategy_id as strategyId, 
      name, 
      chat_id as chatId, 
      message_template as messageTemplate, 
      include_api_data as includeApiData, 
      only_if_variable as onlyIfVariable, 
      message_type as messageType, 
      parse_mode as parseMode, 
      order_index as orderIndex, 
      enabled 
    FROM strategy_nodes_telegram 
    WHERE strategy_id = ? 
    ORDER BY order_index ASC
  `).all(strategyId);
  
  return rows.map(row => ({
    ...row,
    enabled: Boolean(row.enabled),
    includeApiData: Boolean(row.includeApiData)
  }));
}

function simulateFlowExecution(strategyId) {
  console.log(`\n🧪 Testing flow execution for strategy ${strategyId}`);
  
  // Check flow edges
  const flowEdges = getFlowEdges(strategyId);
  console.log(`🔍 Found ${flowEdges.length} flow edges`);
  
  if (flowEdges.length > 0) {
    console.log(`✅ Should use flow-based execution`);
    
    // Get nodes
    const conditionNodes = getConditionNodesByStrategy(strategyId);
    const telegramMessageNodes = getTelegramMessageNodesByStrategy(strategyId);
    
    console.log(`📊 Nodes: ${conditionNodes.length} condition, ${telegramMessageNodes.length} telegram`);
    
    // Create node map
    const allNodes = new Map();
    conditionNodes.forEach(node => allNodes.set(`condition_node_${node.id}`, { ...node, type: 'condition_node' }));
    telegramMessageNodes.forEach(node => allNodes.set(`telegram_message_node_${node.id}`, { ...node, type: 'telegram_message_node' }));
    
    console.log(`🗂️ Node map: ${Array.from(allNodes.keys()).join(', ')}`);
    
    // Build edge map
    const edgeMap = new Map();
    flowEdges.forEach(edge => {
      const sourceKey = `${edge.source_node_id}:${edge.source_handle || 'default'}`;
      if (!edgeMap.has(sourceKey)) {
        edgeMap.set(sourceKey, []);
      }
      edgeMap.get(sourceKey).push(edge);
    });
    
    console.log(`🎯 Edge map:`);
    for (const [key, edges] of edgeMap.entries()) {
      console.log(`  ${key} → [${edges.map(e => e.target_node_id).join(', ')}]`);
    }
    
    // Simulate condition evaluation
    console.log(`\n🔍 Simulating condition evaluation:`);
    const conditionResult = true; // 5 > 2 = true
    console.log(`  Condition result: ${conditionResult}`);
    
    // Find next nodes based on condition result
    const currentNodeId = 'condition_node_5';
    const handleId = conditionResult ? 'true' : 'false';
    const edgeKey = `${currentNodeId}:${handleId}`;
    const nextEdges = edgeMap.get(edgeKey) || [];
    
    console.log(`  Looking for edges: ${edgeKey}`);
    console.log(`  Found edges: [${nextEdges.map(e => e.target_node_id).join(', ')}]`);
    
    if (nextEdges.length === 1) {
      console.log(`✅ Correct! Only ${nextEdges[0].target_node_id} should be executed`);
    } else {
      console.log(`❌ Wrong! Expected 1 edge, found ${nextEdges.length}`);
    }
    
  } else {
    console.log(`⚠️ Would use legacy order-based execution`);
  }
}

// Test strategy 100
simulateFlowExecution(100);

db.close(); 