BEGIN;

CREATE TABLE IF NOT EXISTS public.action_rate_limits (
  scope varchar(100) NOT NULL,
  key_hash char(64) NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key_hash)
);

CREATE INDEX IF NOT EXISTS action_rate_limits_updated_at_idx
  ON public.action_rate_limits(updated_at);

COMMIT;
