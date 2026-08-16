BEGIN;

ALTER TABLE public.project_payments
  ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES public.project_stages(id) ON DELETE SET NULL;

ALTER TABLE public.project_stages
  ADD COLUMN IF NOT EXISTS payment_due_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS payment_due_amount numeric(14,2);

ALTER TABLE public.project_stages
  DROP CONSTRAINT IF EXISTS project_stages_payment_due_percent_check;

ALTER TABLE public.project_stages
  ADD CONSTRAINT project_stages_payment_due_percent_check
  CHECK (payment_due_percent IS NULL OR (payment_due_percent >= 0 AND payment_due_percent <= 100));

ALTER TABLE public.project_stages
  DROP CONSTRAINT IF EXISTS project_stages_payment_due_amount_check;

ALTER TABLE public.project_stages
  ADD CONSTRAINT project_stages_payment_due_amount_check
  CHECK (payment_due_amount IS NULL OR payment_due_amount >= 0);

CREATE INDEX IF NOT EXISTS project_payments_stage_id_idx
  ON public.project_payments(stage_id);

COMMIT;
