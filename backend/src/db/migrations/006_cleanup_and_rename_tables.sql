-- Migration to clean up legacy tables and rename node tables

-- Drop legacy tables that are no longer used
DROP TABLE IF EXISTS strategy_calls;
DROP TABLE IF EXISTS strategy_edges;

-- Rename node tables to use strategy_nodes_ prefix
ALTER TABLE condition_nodes RENAME TO strategy_nodes_conditions;
ALTER TABLE strategy_trigger_nodes RENAME TO strategy_nodes_triggers;
ALTER TABLE telegram_message_nodes RENAME TO strategy_nodes_telegram;

-- Update flow_execution_logs to include new node types
-- First get the current schema
PRAGMA table_info(flow_execution_logs);

-- Add support for new step types in flow_execution_logs if not already present
-- Note: SQLite doesn't support modifying CHECK constraints directly, so we'll work with existing schema 