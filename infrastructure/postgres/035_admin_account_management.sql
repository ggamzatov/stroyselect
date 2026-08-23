BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS users_must_change_password_idx
  ON public.users(must_change_password)
  WHERE must_change_password = true;

COMMIT;
