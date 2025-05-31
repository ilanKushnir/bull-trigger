-- Update flow_execution_logs to support new node types
-- SQLite doesn't support ALTER COLUMN with CHECK constraints, so we need to recreate the table

-- Create a new table with updated constraint
CREATE TABLE flow_execution_logs_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('api_call', 'model_call', 'condition_node', 'strategy_trigger_node', 'telegram_message_node')),
  step_id INTEGER NOT NULL,
  input TEXT,
  output TEXT,
  error TEXT,
  duration INTEGER,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(execution_id) REFERENCES strategy_executions(id) ON DELETE CASCADE
);

-- Copy existing data
INSERT INTO flow_execution_logs_new 
SELECT * FROM flow_execution_logs;

-- Drop old table
DROP TABLE flow_execution_logs;

-- Rename new table
ALTER TABLE flow_execution_logs_new RENAME TO flow_execution_logs; 