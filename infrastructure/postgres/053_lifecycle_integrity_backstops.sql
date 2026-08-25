BEGIN;

-- A newly created project cannot materialize already inside the commercial/work
-- lifecycle. Contractor selection, work start and completion must happen through
-- guarded transitions so their prerequisites are checked.
CREATE OR REPLACE FUNCTION public.enforce_project_initial_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status::text IN ('contractor_selected','in_progress','completed','disputed')
     OR NEW.selected_contractor_id IS NOT NULL
     OR NEW.selected_bid_id IS NOT NULL
     OR NEW.work_started_at IS NOT NULL
     OR NEW.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'new project cannot start after contractor selection or work start'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_initial_state_guard ON public.projects;
CREATE TRIGGER projects_initial_state_guard
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.enforce_project_initial_state();

-- Project completion is a business transition, not a cosmetic status update.
CREATE OR REPLACE FUNCTION public.enforce_project_completion_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  stage_count integer;
  incomplete_count integer;
  total_weight numeric;
  unresolved_disputes integer;
BEGIN
  IF NEW.status::text = 'completed'
     AND OLD.status::text IS DISTINCT FROM 'completed' THEN
    IF OLD.status::text <> 'in_progress' THEN
      RAISE EXCEPTION 'project can be completed only from in_progress'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.selected_contractor_id IS NULL OR NEW.selected_bid_id IS NULL THEN
      RAISE EXCEPTION 'selected contractor and bid are required before project completion'
        USING ERRCODE = '23514';
    END IF;

    IF COALESCE(NEW.risk_hold, false) THEN
      RAISE EXCEPTION 'project cannot be completed while administrative hold is active'
        USING ERRCODE = '23514';
    END IF;

    IF NOT public.project_has_current_signed_contract(NEW.id) THEN
      RAISE EXCEPTION 'active contract signed by both parties is required before project completion'
        USING ERRCODE = '23514';
    END IF;

    SELECT
      COUNT(*)::integer,
      COUNT(*) FILTER (WHERE ps.status::text <> 'completed')::integer,
      COALESCE(SUM(ps.progress_weight), 0)
    INTO stage_count, incomplete_count, total_weight
    FROM public.project_stages ps
    WHERE ps.project_id = NEW.id;

    IF stage_count = 0 OR total_weight <> 100 THEN
      RAISE EXCEPTION 'completed project must have a 100 percent stage plan'
        USING ERRCODE = '23514';
    END IF;

    IF incomplete_count > 0 THEN
      RAISE EXCEPTION 'all project stages must be accepted before project completion'
        USING ERRCODE = '23514';
    END IF;

    SELECT COUNT(*)::integer
      INTO unresolved_disputes
    FROM public.project_disputes pd
    WHERE pd.project_id = NEW.id
      AND pd.status IN ('open','under_review');

    IF unresolved_disputes > 0 THEN
      RAISE EXCEPTION 'project cannot be completed while disputes are unresolved'
        USING ERRCODE = '23514';
    END IF;

    NEW.completed_at = COALESCE(NEW.completed_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_completion_lifecycle_guard ON public.projects;
CREATE TRIGGER projects_completion_lifecycle_guard
BEFORE UPDATE OF status ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.enforce_project_completion_lifecycle();

-- Stages belong to a signed pre-start plan. Once work has started, structural
-- additions are not allowed through project_stages directly; they require the
-- separate agreed change-order process.
CREATE OR REPLACE FUNCTION public.enforce_stage_status_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  project_status text;
BEGIN
  SELECT p.status::text
    INTO project_status
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  IF project_status IS NULL THEN
    RAISE EXCEPTION 'stage project not found' USING ERRCODE = '23503';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status::text <> 'planned' THEN
      RAISE EXCEPTION 'new stage must start in planned status'
        USING ERRCODE = '23514';
    END IF;

    IF project_status <> 'contractor_selected' THEN
      RAISE EXCEPTION 'new stages can be added only before project work starts'
        USING ERRCODE = '23514';
    END IF;

    IF NOT public.project_has_current_signed_contract(NEW.project_id) THEN
      RAISE EXCEPTION 'signed current contract is required before stage planning'
        USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.status::text IS NOT DISTINCT FROM OLD.status::text THEN
    RETURN NEW;
  END IF;

  IF project_status <> 'in_progress' THEN
    RAISE EXCEPTION 'stage execution status can change only while project is in progress'
      USING ERRCODE = '23514';
  END IF;

  IF NOT (
    (OLD.status::text = 'planned' AND NEW.status::text = 'in_progress')
    OR (OLD.status::text = 'in_progress' AND NEW.status::text = 'awaiting_review')
    OR (OLD.status::text = 'awaiting_review' AND NEW.status::text IN ('completed','revision_required'))
    OR (OLD.status::text = 'revision_required' AND NEW.status::text = 'in_progress')
  ) THEN
    RAISE EXCEPTION 'invalid project stage status transition: % -> %', OLD.status::text, NEW.status::text
      USING ERRCODE = '23514';
  END IF;

  IF NOT public.project_has_current_signed_contract(NEW.project_id) THEN
    RAISE EXCEPTION 'signed current contract is required for stage execution'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_stages_status_lifecycle_guard ON public.project_stages;
CREATE TRIGGER project_stages_status_lifecycle_guard
BEFORE INSERT OR UPDATE OF status ON public.project_stages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_stage_status_lifecycle();

-- Once either party signs a version, the legal text and that party's signature
-- evidence become append-only evidence. The other party may still add its own
-- signature later.
CREATE OR REPLACE FUNCTION public.prevent_approved_contract_version_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.customer_approved_at IS NOT NULL OR OLD.contractor_approved_at IS NOT NULL)
     AND (
       NEW.contract_id IS DISTINCT FROM OLD.contract_id
       OR NEW.version_no IS DISTINCT FROM OLD.version_no
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.commercial_terms IS DISTINCT FROM OLD.commercial_terms
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.legal_template_version IS DISTINCT FROM OLD.legal_template_version
     ) THEN
    RAISE EXCEPTION 'approved contract version content is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.customer_approved_at IS NOT NULL
     AND (
       NEW.customer_approved_at IS DISTINCT FROM OLD.customer_approved_at
       OR NEW.customer_approval_evidence IS DISTINCT FROM OLD.customer_approval_evidence
     ) THEN
    RAISE EXCEPTION 'customer contract signature evidence is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.contractor_approved_at IS NOT NULL
     AND (
       NEW.contractor_approved_at IS DISTINCT FROM OLD.contractor_approved_at
       OR NEW.contractor_approval_evidence IS DISTINCT FROM OLD.contractor_approval_evidence
     ) THEN
    RAISE EXCEPTION 'contractor contract signature evidence is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.customer_approved_at IS NOT NULL AND NEW.customer_approval_evidence IS NULL THEN
    RAISE EXCEPTION 'customer approval evidence is required for contract signature'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.contractor_approved_at IS NOT NULL AND NEW.contractor_approval_evidence IS NULL THEN
    RAISE EXCEPTION 'contractor approval evidence is required for contract signature'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_contract_versions_immutable_content ON public.project_contract_versions;
CREATE TRIGGER project_contract_versions_immutable_content
BEFORE UPDATE ON public.project_contract_versions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_approved_contract_version_rewrite();

CREATE OR REPLACE FUNCTION public.prevent_signed_contract_version_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.customer_approved_at IS NOT NULL OR OLD.contractor_approved_at IS NOT NULL THEN
    RAISE EXCEPTION 'signed contract version cannot be deleted'
      USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS project_contract_versions_signed_delete_guard ON public.project_contract_versions;
CREATE TRIGGER project_contract_versions_signed_delete_guard
BEFORE DELETE ON public.project_contract_versions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_signed_contract_version_delete();

-- A payment intent must belong to the same project's stage. Creating an intent is
-- possible only under a signed contract, and no INSERT/UPDATE can mark a payout ready
-- or paid before the customer has accepted the stage.
CREATE OR REPLACE FUNCTION public.enforce_stage_payment_release()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  stage_status text;
BEGIN
  IF TG_OP = 'INSERT' AND NOT public.project_has_current_signed_contract(NEW.project_id) THEN
    RAISE EXCEPTION 'signed current contract is required before creating a payment intent'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.stage_id IS NOT NULL THEN
    SELECT ps.status::text
      INTO stage_status
    FROM public.project_stages ps
    WHERE ps.id = NEW.stage_id
      AND ps.project_id = NEW.project_id;

    IF stage_status IS NULL THEN
      RAISE EXCEPTION 'payment stage must belong to the same project'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.status IN ('release_ready','payout_processing','paid') THEN
    IF NEW.stage_id IS NULL THEN
      RAISE EXCEPTION 'payout must be linked to an accepted project stage'
        USING ERRCODE = '23514';
    END IF;

    IF stage_status IS DISTINCT FROM 'completed' THEN
      RAISE EXCEPTION 'payout is forbidden until customer accepts the stage'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  NEW.updated_at = now();

  IF NEW.status = 'release_ready'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'release_ready') THEN
    NEW.release_ready_at = COALESCE(NEW.release_ready_at, now());
  END IF;

  IF NEW.status = 'paid'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    NEW.paid_at = COALESCE(NEW.paid_at, now());
  END IF;

  IF NEW.status = 'refunded'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'refunded') THEN
    NEW.refunded_at = COALESCE(NEW.refunded_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_stage_payment_release ON public.project_payment_intents;
CREATE TRIGGER trg_enforce_stage_payment_release
BEFORE INSERT OR UPDATE ON public.project_payment_intents
FOR EACH ROW
EXECUTE FUNCTION public.enforce_stage_payment_release();

-- Legacy/manual payment archive must use the same signed-current-contract invariant.
CREATE OR REPLACE FUNCTION public.enforce_legacy_payment_after_stage_acceptance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  stage_status text;
BEGIN
  IF NOT public.project_has_current_signed_contract(NEW.project_id) THEN
    RAISE EXCEPTION 'payments are available only under the current contract signed by both parties'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.stage_id IS NULL THEN
    RAISE EXCEPTION 'payment must be linked to a project stage'
      USING ERRCODE = '23514';
  END IF;

  SELECT ps.status::text
    INTO stage_status
  FROM public.project_stages ps
  WHERE ps.id = NEW.stage_id
    AND ps.project_id = NEW.project_id;

  IF stage_status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'payment cannot be recorded before customer accepts the stage'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_legacy_payment_after_stage_acceptance ON public.project_payments;
CREATE TRIGGER trg_enforce_legacy_payment_after_stage_acceptance
BEFORE INSERT ON public.project_payments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_legacy_payment_after_stage_acceptance();

COMMIT;
