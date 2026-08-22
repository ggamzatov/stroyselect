BEGIN;

ALTER TABLE public.contractor_companies
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS insurance_provider text,
  ADD COLUMN IF NOT EXISTS insurance_policy_number text,
  ADD COLUMN IF NOT EXISTS insurance_expires_at date,
  ADD COLUMN IF NOT EXISTS license_summary text;

CREATE TABLE IF NOT EXISTS public.contractor_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('registration','tax','license','sro','insurance','certificate','identity','other')),
  title text NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0),
  mime_type text NOT NULL,
  expires_at date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','expired')),
  review_comment text,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(storage_bucket, storage_path)
);

CREATE INDEX IF NOT EXISTS contractor_verification_documents_company_idx
  ON public.contractor_verification_documents(contractor_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS contractor_verification_documents_expiry_idx
  ON public.contractor_verification_documents(expires_at)
  WHERE expires_at IS NOT NULL AND status='verified';

CREATE TABLE IF NOT EXISTS public.contractor_verification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  status text NOT NULL,
  comment text,
  changed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contractor_verification_history_company_idx
  ON public.contractor_verification_history(contractor_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.capture_contractor_verification_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NEW.verification_status::text = 'verified' AND NEW.verified_at IS NULL THEN
      NEW.verified_at := now();
    END IF;
    INSERT INTO public.contractor_verification_history(contractor_id,status,comment,metadata)
    VALUES(
      NEW.id,
      NEW.verification_status::text,
      NEW.verification_comment,
      jsonb_build_object('previous_status', OLD.verification_status::text)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_verification_history_trigger ON public.contractor_companies;
CREATE TRIGGER contractor_verification_history_trigger
BEFORE UPDATE OF verification_status ON public.contractor_companies
FOR EACH ROW EXECUTE FUNCTION public.capture_contractor_verification_change();

UPDATE public.contractor_companies
SET verified_at = COALESCE(verified_at, updated_at, created_at)
WHERE verification_status::text='verified' AND verified_at IS NULL;

COMMIT;
