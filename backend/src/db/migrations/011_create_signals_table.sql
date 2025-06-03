-- Create signals table
CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('LONG', 'SHORT')),
    symbol TEXT NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    entry_price_min REAL NOT NULL,
    entry_price_max REAL NOT NULL,
    leverage REAL NOT NULL DEFAULT 1,
    tp1 REAL,
    tp2 REAL,
    tp3 REAL,
    stop_loss REAL NOT NULL,
    strategy_name TEXT NOT NULL,
    note TEXT,
    signal_tag TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_signal_type ON signals(signal_type); 