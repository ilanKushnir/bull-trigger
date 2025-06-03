-- Add cast_to_number field to api_calls table
ALTER TABLE api_calls ADD COLUMN cast_to_number INTEGER DEFAULT 0 NOT NULL;

-- Create index for faster queries on numeric variables
CREATE INDEX IF NOT EXISTS idx_api_calls_cast_to_number ON api_calls(cast_to_number); 