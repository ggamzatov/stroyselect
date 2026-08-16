BEGIN;

-- Reject impossible scalar values at the database boundary.
ALTER TABLE public.project_payments
  DROP CONSTRAINT IF EXISTS project_payments_amount_positive;
ALTER TABLE public.project_payments
  ADD CONSTRAINT project_payments_amount_positive CHECK (amount > 0) NOT VALID;

ALTER TABLE public.project_change_orders
  DROP CONSTRAINT IF EXISTS project_change_orders_amount_delta_finite;
ALTER TABLE public.project_change_orders
  ADD CONSTRAINT project_change_orders_amount_delta_finite
  CHECK (amount_delta BETWEEN -1000000000 AND 1000000000) NOT VALID;

ALTER TABLE public.project_change_orders
  DROP CONSTRAINT IF EXISTS project_change_orders_duration_delta_range;
ALTER TABLE public.project_change_orders
  ADD CONSTRAINT project_change_orders_duration_delta_range
  CHECK (duration_delta_days BETWEEN -3650 AND 3650) NOT VALID;

-- A decided change order must have decision metadata; a pending/cancelled one must not.
ALTER TABLE public.project_change_orders
  DROP CONSTRAINT IF EXISTS project_change_orders_decision_consistency;
ALTER TABLE public.project_change_orders
  ADD CONSTRAINT project_change_orders_decision_consistency CHECK (
    (status IN ('approved','rejected') AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
    OR
    (status IN ('pending','cancelled') AND decided_by IS NULL AND decided_at IS NULL)
  ) NOT VALID;

-- Stage payments must reference a stage from the same project.
CREATE UNIQUE INDEX IF NOT EXISTS project_stages_id_project_id_uidx
  ON public.project_stages(id, project_id);

ALTER TABLE public.project_payments
  DROP CONSTRAINT IF EXISTS project_payments_stage_project_fk;
ALTER TABLE public.project_payments
  ADD CONSTRAINT project_payments_stage_project_fk
  FOREIGN KEY (stage_id, project_id)
  REFERENCES public.project_stages(id, project_id)
  NOT VALID;

-- Serialize all financial mutations for one project. This closes the race where
-- two concurrent payments both observe the same remaining budget.
CREATE OR REPLACE FUNCTION public.lock_project_financial_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1 FROM public.projects WHERE id = NEW.project_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'project % does not exist', NEW.project_id USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_payments_financial_lock ON public.project_payments;
CREATE TRIGGER project_payments_financial_lock
BEFORE INSERT OR UPDATE ON public.project_payments
FOR EACH ROW EXECUTE FUNCTION public.lock_project_financial_mutation();

DROP TRIGGER IF EXISTS project_change_orders_financial_lock ON public.project_change_orders;
CREATE TRIGGER project_change_orders_financial_lock
BEFORE INSERT OR UPDATE ON public.project_change_orders
FOR EACH ROW EXECUTE FUNCTION public.lock_project_financial_mutation();

-- Critical mutations may carry an idempotency key. Partial unique indexes keep
-- old rows compatible while preventing duplicate retries once a key is present.
ALTER TABLE public.project_payments
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.project_change_orders
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS project_payments_project_idempotency_uidx
  ON public.project_payments(project_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS project_change_orders_project_idempotency_uidx
  ON public.project_change_orders(project_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMIT;
