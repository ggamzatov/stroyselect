BEGIN;

CREATE TABLE IF NOT EXISTS public.legal_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type varchar(40) NOT NULL,
  version varchar(32) NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  content_hash varchar(64) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_type, version)
);

CREATE TABLE IF NOT EXISTS public.user_legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type varchar(40) NOT NULL,
  document_version varchar(32) NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  ip_address inet,
  user_agent text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS user_legal_acceptances_user_idx ON public.user_legal_acceptances(user_id, document_type, accepted_at DESC);

ALTER TABLE public.project_contract_versions
  ADD COLUMN IF NOT EXISTS customer_approval_evidence jsonb,
  ADD COLUMN IF NOT EXISTS contractor_approval_evidence jsonb,
  ADD COLUMN IF NOT EXISTS legal_template_version varchar(32) NOT NULL DEFAULT 'ru-1.0';

INSERT INTO public.legal_document_versions(document_type,version,content_hash)
VALUES
 ('terms','ru-1.0','terms-ru-1.0'),
 ('privacy_policy','ru-1.0','privacy-ru-1.0'),
 ('personal_data_consent','ru-1.0','pd-consent-ru-1.0')
ON CONFLICT(document_type,version) DO NOTHING;

COMMIT;
