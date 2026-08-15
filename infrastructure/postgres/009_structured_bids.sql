BEGIN;

ALTER TABLE public.project_bids
  ADD COLUMN IF NOT EXISTS scope_summary text,
  ADD COLUMN IF NOT EXISTS materials_summary text,
  ADD COLUMN IF NOT EXISTS exclusions text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS warranty_months integer,
  ADD COLUMN IF NOT EXISTS price_includes_materials boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completeness_score integer NOT NULL DEFAULT 35;

ALTER TABLE public.project_bids
  DROP CONSTRAINT IF EXISTS project_bids_warranty_months_check,
  ADD CONSTRAINT project_bids_warranty_months_check
    CHECK (warranty_months IS NULL OR (warranty_months >= 0 AND warranty_months <= 120)),
  DROP CONSTRAINT IF EXISTS project_bids_completeness_score_check,
  ADD CONSTRAINT project_bids_completeness_score_check
    CHECK (completeness_score >= 0 AND completeness_score <= 100);

UPDATE public.project_bids
SET completeness_score = LEAST(
  100,
  35
  + CASE WHEN proposed_start_date IS NOT NULL THEN 10 ELSE 0 END
  + CASE WHEN COALESCE(NULLIF(BTRIM(message), ''), '') <> '' THEN 10 ELSE 0 END
  + CASE WHEN COALESCE(NULLIF(BTRIM(scope_summary), ''), '') <> '' THEN 15 ELSE 0 END
  + CASE WHEN COALESCE(NULLIF(BTRIM(materials_summary), ''), '') <> '' THEN 10 ELSE 0 END
  + CASE WHEN COALESCE(NULLIF(BTRIM(payment_terms), ''), '') <> '' THEN 10 ELSE 0 END
  + CASE WHEN warranty_months IS NOT NULL THEN 10 ELSE 0 END
);

CREATE INDEX IF NOT EXISTS project_bids_project_status_price_idx
  ON public.project_bids (project_id, status, price);

COMMIT;
