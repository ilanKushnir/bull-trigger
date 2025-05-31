-- Add new node types for enhanced strategy flows

CREATE TABLE IF NOT EXISTS condition_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  strategy_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL, -- 'api_result', 'model_response', 'variable_value'
  left_operand TEXT NOT NULL, -- Variable name or JSONPath
  operator TEXT NOT NULL, -- '==', '!=', '>', '<', '>=', '<=', 'contains', 'startsWith', 'endsWith'
  right_operand TEXT NOT NULL, -- Value to compare against
  true_output_variable TEXT, -- Variable to set if condition is true
  false_output_variable TEXT, -- Variable to set if condition is false
  order_index INTEGER NOT NULL,
  enabled INTEGER DEFAULT 1 NOT NULL
);

CREATE TABLE IF NOT EXISTS strategy_trigger_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  strategy_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  target_strategy_id INTEGER NOT NULL,
  condition_variable TEXT, -- Optional: only trigger if this variable is truthy
  pass_variables TEXT, -- JSON array of variable names to pass to target strategy
  wait_for_completion INTEGER DEFAULT 0 NOT NULL,
  output_variable TEXT, -- Variable to store result if waiting for completion
  order_index INTEGER NOT NULL,
  enabled INTEGER DEFAULT 1 NOT NULL
);

CREATE TABLE IF NOT EXISTS telegram_message_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  strategy_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  chat_id TEXT NOT NULL, -- Telegram chat ID or channel username (e.g., @mychannel or -1001234567890)
  message_template TEXT NOT NULL, -- Message template with variable interpolation
  include_api_data INTEGER DEFAULT 0 NOT NULL,
  only_if_variable TEXT, -- Optional: only send if this variable is truthy
  message_type TEXT DEFAULT 'info' NOT NULL, -- 'info', 'success', 'warning', 'error'
  parse_mode TEXT DEFAULT 'Markdown' NOT NULL, -- 'Markdown', 'HTML', or 'none'
  order_index INTEGER NOT NULL,
  enabled INTEGER DEFAULT 1 NOT NULL
); 