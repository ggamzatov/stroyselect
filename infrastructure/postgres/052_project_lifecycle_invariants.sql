BEGIN;

CREATE OR REPLACE FUNCTION public.project_has_current_signed_contract(target_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_contracts pc
    JOIN public.project_contract_versions v
      ON v.contract_id = pc.id
     AND v.version_no = pc.current_version
    WHERE pc.project_id = target_project_id
      AND pc.status = 'active'
      AND v.customer_approved_at IS NOT NULL
      AND v.contractor_approved_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_project_start_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  stage_count integer;
  total_weight numeric;
BEGIN
  IF NEW.status::text = 'in_progress'
     AND OLD.status::text IS DISTINCT FROM 'in_progress' THEN
    IF OLD.status::text <> 'contractor_selected' THEN
      RAISE EXCEPTION 'project can enter in_progress only after contractor selection'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.selected_contractor_id IS NULL OR NEW.selected_bid_id IS NULL THEN
      RAISE EXCEPTION 'selected contractor and bid are required before work starts'
        USING ERRCODE = '23514';
    END IF;

    IF NOT public.project_has_current_signed_contract(NEW.id) THEN
      RAISE EXCEPTION 'active contract signed by both parties is required before work starts'
        USING ERRCODE = '23514';
    END IF;

    SELECT COUNT(*)::integer, COALESCE(SUM(progress_weight), 0)
      INTO stage_count, total_weight
    FROM public.project_stages
    WHERE project_id = NEW.id;

    IF stage_count = 0 OR total_weight <> 100 THEN
      RAISE EXCEPTION 'project stage plan must contain stages totaling 100 percent before work starts'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_start_lifecycle_guard ON public.projects;
CREATE TRIGGER projects_start_lifecycle_guard
BEFORE UPDATE OF status ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.enforce_project_start_lifecycle();

CREATE OR REPLACE FUNCTION public.enforce_new_contract_version_phase()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  project_status text;
BEGIN
  SELECT p.status::text
    INTO project_status
  FROM public.project_contracts pc
  JOIN public.projects p ON p.id = pc.project_id
  WHERE pc.id = NEW.contract_id;

  IF project_status IS NULL THEN
    RAISE EXCEPTION 'contract project not found' USING ERRCODE = '23503';
  END IF;

  IF project_status <> 'contractor_selected' THEN
    RAISE EXCEPTION 'new main contract versions are allowed only before work starts'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_contract_versions_phase_guard ON public.project_contract_versions;
CREATE TRIGGER project_contract_versions_phase_guard
BEFORE INSERT ON public.project_contract_versions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_new_contract_version_phase();

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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_contract_versions_immutable_content ON public.project_contract_versions;
CREATE TRIGGER project_contract_versions_immutable_content
BEFORE UPDATE ON public.project_contract_versions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_approved_contract_version_rewrite();

CREATE OR REPLACE FUNCTION public.enforce_submitted_bid_eligibility()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  p_category bigint;
  p_city text;
  p_region text;
  p_status text;
  company_verified boolean;
  company_accepts boolean;
  invited boolean;
  service_match boolean;
  geography_match boolean;
BEGIN
  IF NEW.status::text <> 'submitted' THEN
    RETURN NEW;
  END IF;

  SELECT p.category_id, p.city, p.region, p.status::text
    INTO p_category, p_city, p_region, p_status
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  IF p_status NOT IN ('published', 'collecting_bids') THEN
    RAISE EXCEPTION 'project is not accepting bids' USING ERRCODE = '23514';
  END IF;

  SELECT cc.verification_status = 'verified', cc.accepts_new_projects
    INTO company_verified, company_accepts
  FROM public.contractor_companies cc
  WHERE cc.id = NEW.contractor_id;

  IF COALESCE(company_verified, false) = false OR COALESCE(company_accepts, false) = false THEN
    RAISE EXCEPTION 'contractor is not eligible to submit bids' USING ERRCODE = '23514';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.project_contractor_invitations pci
    WHERE pci.project_id = NEW.project_id
      AND pci.contractor_id = NEW.contractor_id
      AND pci.status <> 'cancelled'
  ) INTO invited;

  SELECT EXISTS (
    SELECT 1
    FROM public.contractor_services cs
    WHERE cs.contractor_id = NEW.contractor_id
      AND cs.category_id = p_category
  ) INTO service_match;

  SELECT EXISTS (
    SELECT 1
    FROM public.contractor_service_areas csa
    WHERE csa.contractor_id = NEW.contractor_id
      AND (
        lower(trim(csa.city)) = lower(trim(COALESCE(p_city, '')))
        OR (
          COALESCE(trim(p_region), '') <> ''
          AND lower(trim(COALESCE(csa.region, ''))) = lower(trim(p_region))
        )
      )
  ) INTO geography_match;

  IF NOT invited AND NOT (service_match AND geography_match) THEN
    RAISE EXCEPTION 'bid is outside contractor service or geography eligibility'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_bids_eligibility_guard ON public.project_bids;
CREATE TRIGGER project_bids_eligibility_guard
BEFORE INSERT ON public.project_bids
FOR EACH ROW
EXECUTE FUNCTION public.enforce_submitted_bid_eligibility();

CREATE OR REPLACE FUNCTION public.enforce_stage_plan_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  other_weight numeric;
  project_status text;
BEGIN
  SELECT p.status::text INTO project_status
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  IF TG_OP = 'UPDATE' AND (
       NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.price IS DISTINCT FROM OLD.price
       OR NEW.progress_weight IS DISTINCT FROM OLD.progress_weight
     ) THEN
    IF OLD.status::text <> 'planned' THEN
      RAISE EXCEPTION 'started or reviewed stage commercial data is immutable'
        USING ERRCODE = '23514';
    END IF;

    IF project_status = 'in_progress' THEN
      RAISE EXCEPTION 'stage scope, price and weight must be changed through an approved project change after work starts'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.progress_weight IS DISTINCT FROM OLD.progress_weight THEN
    SELECT COALESCE(SUM(ps.progress_weight), 0)
      INTO other_weight
    FROM public.project_stages ps
    WHERE ps.project_id = NEW.project_id
      AND (TG_OP = 'INSERT' OR ps.id <> OLD.id);

    IF other_weight + COALESCE(NEW.progress_weight, 0) > 100 THEN
      RAISE EXCEPTION 'project stage weights cannot exceed 100 percent'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_stages_plan_integrity_guard ON public.project_stages;
CREATE TRIGGER project_stages_plan_integrity_guard
BEFORE INSERT OR UPDATE ON public.project_stages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_stage_plan_integrity();

CREATE OR REPLACE FUNCTION public.enforce_change_order_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_project_id uuid;
  project_status text;
BEGIN
  target_project_id := NEW.project_id;

  SELECT p.status::text
    INTO project_status
  FROM public.projects p
  WHERE p.id = target_project_id;

  IF project_status <> 'in_progress' THEN
    RAISE EXCEPTION 'project changes are allowed only while project is in progress'
      USING ERRCODE = '23514';
  END IF;

  IF NOT public.project_has_current_signed_contract(target_project_id) THEN
    RAISE EXCEPTION 'active signed contract is required for project changes'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_change_orders_lifecycle_guard ON public.project_change_orders;
CREATE TRIGGER project_change_orders_lifecycle_guard
BEFORE INSERT OR UPDATE ON public.project_change_orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_change_order_lifecycle();

CREATE OR REPLACE FUNCTION public.enforce_issue_project_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.stage_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.project_stages ps
    WHERE ps.id = NEW.stage_id AND ps.project_id = NEW.project_id
  ) THEN
    RAISE EXCEPTION 'issue stage must belong to the same project' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_issues_reference_guard ON public.project_issues;
CREATE TRIGGER project_issues_reference_guard
BEFORE INSERT OR UPDATE OF project_id, stage_id ON public.project_issues
FOR EACH ROW
EXECUTE FUNCTION public.enforce_issue_project_reference();

CREATE OR REPLACE FUNCTION public.enforce_dispute_project_references()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  project_status text;
  selected_contractor uuid;
BEGIN
  SELECT p.status::text, p.selected_contractor_id
    INTO project_status, selected_contractor
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  IF TG_OP = 'INSERT' AND (
       selected_contractor IS NULL
       OR project_status NOT IN ('contractor_selected', 'in_progress', 'completed')
     ) THEN
    RAISE EXCEPTION 'dispute is available only after contractor selection'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.stage_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.project_stages ps
    WHERE ps.id = NEW.stage_id AND ps.project_id = NEW.project_id
  ) THEN
    RAISE EXCEPTION 'dispute stage must belong to the same project' USING ERRCODE = '23514';
  END IF;

  IF NEW.change_order_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.project_change_orders co
    WHERE co.id = NEW.change_order_id AND co.project_id = NEW.project_id
  ) THEN
    RAISE EXCEPTION 'dispute change order must belong to the same project' USING ERRCODE = '23514';
  END IF;

  IF NEW.payment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.project_payments pp
    WHERE pp.id = NEW.payment_id AND pp.project_id = NEW.project_id
  ) THEN
    RAISE EXCEPTION 'dispute payment must belong to the same project' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_disputes_reference_guard ON public.project_disputes;
CREATE TRIGGER project_disputes_reference_guard
BEFORE INSERT OR UPDATE OF project_id, stage_id, change_order_id, payment_id ON public.project_disputes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_dispute_project_references();

COMMIT;
