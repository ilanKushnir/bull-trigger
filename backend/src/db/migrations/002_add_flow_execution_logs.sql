-- Add flow execution logs table
CREATE TABLE IF NOT EXISTS flow_execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('api_call', 'model_call')),
  step_id INTEGER NOT NULL,
  input TEXT,
  output TEXT,
  error TEXT,
  duration INTEGER,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(execution_id) REFERENCES strategy_executions(id) ON DELETE CASCADE
); 