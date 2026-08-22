BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz;

CREATE INDEX IF NOT EXISTS users_email_confirmed_idx
  ON public.users(email_confirmed_at)
  WHERE email_confirmed_at IS NOT NULL;

COMMIT;
