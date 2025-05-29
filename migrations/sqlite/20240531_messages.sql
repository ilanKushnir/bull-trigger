-- Messages table for signal dispatch tracking
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  signal_hash TEXT NOT NULL,
  tg_msg_id INTEGER,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
); 