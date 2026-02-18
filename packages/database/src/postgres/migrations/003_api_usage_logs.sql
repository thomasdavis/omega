-- API Usage Logs
-- Tracks every request to the /api/v1/chat/completions endpoint

CREATE TABLE IF NOT EXISTS api_usage_logs (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  request_id TEXT NOT NULL,
  api_key_prefix TEXT,
  api_key_hash TEXT,
  model_requested TEXT,
  endpoint TEXT NOT NULL,
  http_status INTEGER NOT NULL,
  duration_ms INTEGER,
  message_count INTEGER,
  response_length INTEGER,
  error_type TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()) * 1000)::bigint,
  CONSTRAINT api_usage_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_request_id ON api_usage_logs (request_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_prefix ON api_usage_logs (api_key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_http_status ON api_usage_logs (http_status);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs (endpoint);
