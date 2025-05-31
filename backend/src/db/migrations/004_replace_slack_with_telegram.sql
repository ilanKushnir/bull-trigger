-- Replace slack_message_nodes with telegram_message_nodes

-- Drop the old slack table if it exists
DROP TABLE IF EXISTS slack_message_nodes;

-- Create the new telegram message nodes table
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