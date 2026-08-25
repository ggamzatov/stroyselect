BEGIN;

CREATE TABLE IF NOT EXISTS public.contractor_payout_profiles (
  contractor_id uuid PRIMARY KEY REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'yookassa' CHECK (provider='yookassa'),
  payout_token text,
  destination_label text,
  verified_at timestamptz,
  disabled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_payout_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.payment_release_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id uuid NOT NULL REFERENCES public.project_payment_intents(id) ON DELETE CASCADE,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_release_failures_open_idx
  ON public.payment_release_failures(created_at DESC)
  WHERE resolved_at IS NULL;

COMMIT;
