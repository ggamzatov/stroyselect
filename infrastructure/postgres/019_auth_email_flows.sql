BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_email_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  purpose varchar(32) NOT NULL CHECK (purpose IN ('verify_email','reset_password')),
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_email_tokens_user_purpose_idx
  ON public.auth_email_tokens(user_id, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_email_tokens_expires_idx
  ON public.auth_email_tokens(expires_at);

COMMIT;
