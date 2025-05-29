-- Add columns for strategy scheduling
ALTER TABLE strategies ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE strategies ADD COLUMN cron TEXT DEFAULT '*/5 * * * *';
ALTER TABLE strategies ADD COLUMN triggers TEXT; 