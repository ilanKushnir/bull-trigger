-- Add flow edges table for storing visual flow connections

CREATE TABLE IF NOT EXISTS flow_edges (
  id TEXT PRIMARY KEY, -- Edge ID (e.g., "node1-node2")
  strategy_id INTEGER NOT NULL,
  source_node_id TEXT NOT NULL, -- Source node ID
  target_node_id TEXT NOT NULL, -- Target node ID
  source_handle TEXT DEFAULT 'default' NOT NULL, -- Source handle ID ('true', 'false', 'default')
  target_handle TEXT DEFAULT 'default' NOT NULL, -- Target handle ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_flow_edges_strategy ON flow_edges(strategy_id);
CREATE INDEX IF NOT EXISTS idx_flow_edges_source ON flow_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_flow_edges_target ON flow_edges(target_node_id); 