-- Initial database schema
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  telegram_id TEXT UNIQUE,
  is_admin INTEGER DEFAULT 0 NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  enabled INTEGER DEFAULT 1 NOT NULL,
  cron TEXT DEFAULT '*/5 * * * *',
  triggers TEXT
);

CREATE TABLE IF NOT EXISTS prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  signal_hash TEXT NOT NULL,
  tg_msg_id INTEGER,
  sent_at TEXT,
  reaction TEXT
);

CREATE TABLE IF NOT EXISTS strategy_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  strategy_id INTEGER NOT NULL,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  error TEXT,
  execution_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  strategy_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT DEFAULT 'GET' NOT NULL,
  headers TEXT,
  body TEXT,
  json_path TEXT,
  output_variable TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  enabled INTEGER DEFAULT 1 NOT NULL
);

CREATE TABLE IF NOT EXISTS model_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  strategy_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  model_tier TEXT NOT NULL,
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  include_api_data INTEGER DEFAULT 1 NOT NULL,
  output_variable TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  enabled INTEGER DEFAULT 1 NOT NULL
); 