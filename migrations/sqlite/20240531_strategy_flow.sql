-- Strategy calls (nodes)
CREATE TABLE IF NOT EXISTS strategy_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  strategy_id INTEGER NOT NULL,
  order_idx INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('api','model')),
  config_json TEXT NOT NULL,
  FOREIGN KEY(strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

-- Trigger edges between calls and other strategies
CREATE TABLE IF NOT EXISTS strategy_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  src_call_id INTEGER NOT NULL,
  dst_strategy_id INTEGER NOT NULL,
  FOREIGN KEY(src_call_id) REFERENCES strategy_calls(id) ON DELETE CASCADE,
  FOREIGN KEY(dst_strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
); 