-- Add API calls table for strategy flows
CREATE TABLE IF NOT EXISTS api_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  strategy_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  headers TEXT,
  body TEXT,
  json_path TEXT,
  output_variable TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

-- Add model calls table for strategy flows
CREATE TABLE IF NOT EXISTS model_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  strategy_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  model_tier TEXT NOT NULL CHECK (model_tier IN ('cheap', 'deep')),
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  include_api_data INTEGER NOT NULL DEFAULT 1,
  output_variable TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

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