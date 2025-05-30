-- Add strategy execution tracking table
CREATE TABLE IF NOT EXISTS strategy_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  strategy_id INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  error TEXT,
  execution_type TEXT NOT NULL CHECK (execution_type IN ('cron', 'manual')),
  FOREIGN KEY(strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
); 