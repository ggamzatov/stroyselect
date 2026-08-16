BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action varchar(120) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_entity_idx
  ON public.admin_audit_log(entity_type, entity_id, created_at DESC);

ALTER TABLE public.application_errors
  ADD COLUMN IF NOT EXISTS fingerprint varchar(64),
  ADD COLUMN IF NOT EXISTS occurrence_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS application_errors_fingerprint_idx
  ON public.application_errors(fingerprint, resolved_at, last_seen_at DESC);

ALTER TABLE public.project_contractor_invitations
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_note text,
  ADD COLUMN IF NOT EXISTS shortlisted_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.project_contractor_invitations
  DROP CONSTRAINT IF EXISTS project_contractor_invitations_status_check;

UPDATE public.project_contractor_invitations
SET status = 'accepted', responded_at = COALESCE(responded_at, updated_at)
WHERE status = 'responded';

ALTER TABLE public.project_contractor_invitations
  ADD CONSTRAINT project_contractor_invitations_status_check
  CHECK (status IN ('invited','viewed','accepted','declined','cancelled'));
CREATE INDEX IF NOT EXISTS project_contractor_invitations_pipeline_idx
  ON public.project_contractor_invitations(project_id, status, shortlisted_at DESC, updated_at DESC);

ALTER TABLE public.contractor_reviews
  ADD COLUMN IF NOT EXISTS budget_rating smallint,
  ADD COLUMN IF NOT EXISTS moderation_status varchar(24) NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_note text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contractor_reviews_budget_rating_check'
      AND conrelid = 'public.contractor_reviews'::regclass
  ) THEN
    ALTER TABLE public.contractor_reviews
      ADD CONSTRAINT contractor_reviews_budget_rating_check
      CHECK (budget_rating IS NULL OR budget_rating BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contractor_reviews_moderation_status_check'
      AND conrelid = 'public.contractor_reviews'::regclass
  ) THEN
    ALTER TABLE public.contractor_reviews
      ADD CONSTRAINT contractor_reviews_moderation_status_check
      CHECK (moderation_status IN ('published','hidden','flagged'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS contractor_reviews_moderation_idx
  ON public.contractor_reviews(moderation_status, created_at DESC);

CREATE OR REPLACE VIEW public.contractor_performance_metrics AS
WITH invitation_stats AS (
  SELECT contractor_id,
    COUNT(*)::integer AS invitations_total,
    COUNT(*) FILTER (WHERE status IN ('accepted','declined'))::integer AS invitations_answered,
    COUNT(*) FILTER (WHERE status = 'accepted')::integer AS invitations_accepted,
    AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 3600.0)
      FILTER (WHERE responded_at IS NOT NULL) AS avg_response_hours
  FROM public.project_contractor_invitations
  GROUP BY contractor_id
),
bid_stats AS (
  SELECT contractor_id,
    COUNT(*) FILTER (WHERE status::text <> 'withdrawn')::integer AS bids_total,
    COUNT(*) FILTER (WHERE status::text = 'accepted')::integer AS bids_won
  FROM public.project_bids
  GROUP BY contractor_id
),
project_stats AS (
  SELECT p.selected_contractor_id AS contractor_id,
    COUNT(*)::integer AS selected_projects,
    COUNT(*) FILTER (WHERE p.status::text = 'completed')::integer AS completed_projects
  FROM public.projects p
  WHERE p.selected_contractor_id IS NOT NULL
  GROUP BY p.selected_contractor_id
),
dispute_stats AS (
  SELECT p.selected_contractor_id AS contractor_id,
    COUNT(d.id)::integer AS disputes_total
  FROM public.projects p
  LEFT JOIN public.project_disputes d ON d.project_id = p.id
  WHERE p.selected_contractor_id IS NOT NULL
  GROUP BY p.selected_contractor_id
),
review_stats AS (
  SELECT contractor_id,
    COUNT(*) FILTER (WHERE moderation_status = 'published')::integer AS reviews_total,
    AVG(rating) FILTER (WHERE moderation_status = 'published') AS avg_rating,
    AVG(quality_rating) FILTER (WHERE moderation_status = 'published') AS avg_quality,
    AVG(deadline_rating) FILTER (WHERE moderation_status = 'published') AS avg_deadline,
    AVG(communication_rating) FILTER (WHERE moderation_status = 'published') AS avg_communication,
    AVG(budget_rating) FILTER (WHERE moderation_status = 'published') AS avg_budget
  FROM public.contractor_reviews
  GROUP BY contractor_id
)
SELECT
  cc.id AS contractor_id,
  COALESCE(i.invitations_total,0) AS invitations_total,
  COALESCE(i.invitations_answered,0) AS invitations_answered,
  COALESCE(i.invitations_accepted,0) AS invitations_accepted,
  ROUND(COALESCE(i.avg_response_hours,0)::numeric,1) AS avg_response_hours,
  CASE WHEN COALESCE(i.invitations_total,0)=0 THEN 0
       ELSE ROUND(100.0*i.invitations_answered/i.invitations_total,1) END AS response_rate,
  COALESCE(b.bids_total,0) AS bids_total,
  COALESCE(b.bids_won,0) AS bids_won,
  CASE WHEN COALESCE(b.bids_total,0)=0 THEN 0
       ELSE ROUND(100.0*b.bids_won/b.bids_total,1) END AS bid_win_rate,
  COALESCE(p.selected_projects,0) AS selected_projects,
  COALESCE(p.completed_projects,0) AS completed_projects,
  CASE WHEN COALESCE(p.selected_projects,0)=0 THEN 0
       ELSE ROUND(100.0*p.completed_projects/p.selected_projects,1) END AS completion_rate,
  COALESCE(d.disputes_total,0) AS disputes_total,
  CASE WHEN COALESCE(p.selected_projects,0)=0 THEN 100
       ELSE GREATEST(0, ROUND(100.0*(p.selected_projects-LEAST(p.selected_projects,COALESCE(d.disputes_total,0)))/p.selected_projects,1)) END AS dispute_free_rate,
  COALESCE(r.reviews_total,0) AS reviews_total,
  ROUND(COALESCE(r.avg_rating,0)::numeric,2) AS avg_rating,
  ROUND(COALESCE(r.avg_quality,0)::numeric,2) AS avg_quality,
  ROUND(COALESCE(r.avg_deadline,0)::numeric,2) AS avg_deadline,
  ROUND(COALESCE(r.avg_communication,0)::numeric,2) AS avg_communication,
  ROUND(COALESCE(r.avg_budget,0)::numeric,2) AS avg_budget
FROM public.contractor_companies cc
LEFT JOIN invitation_stats i ON i.contractor_id=cc.id
LEFT JOIN bid_stats b ON b.contractor_id=cc.id
LEFT JOIN project_stats p ON p.contractor_id=cc.id
LEFT JOIN dispute_stats d ON d.contractor_id=cc.id
LEFT JOIN review_stats r ON r.contractor_id=cc.id;

CREATE TABLE IF NOT EXISTS public.project_payment_confirmations (
  payment_id uuid PRIMARY KEY REFERENCES public.project_payments(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status varchar(24) NOT NULL DEFAULT 'pending',
  customer_confirmed_at timestamptz,
  contractor_confirmed_at timestamptz,
  disputed_at timestamptz,
  disputed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  dispute_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancellation_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_payment_confirmations_status_check
    CHECK (status IN ('pending','confirmed','disputed','cancelled'))
);
CREATE INDEX IF NOT EXISTS project_payment_confirmations_project_idx
  ON public.project_payment_confirmations(project_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  category varchar(40) NOT NULL DEFAULT 'other',
  title varchar(240) NOT NULL,
  storage_bucket varchar(80) NOT NULL DEFAULT 'project-files',
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size >= 0),
  mime_type varchar(200) NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  parent_document_id uuid REFERENCES public.project_documents(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_documents_category_check CHECK (
    category IN ('contract','estimate','act','invoice','receipt','plan','photo','permit','warranty','other')
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS project_documents_storage_uidx
  ON public.project_documents(storage_bucket, storage_path);
CREATE INDEX IF NOT EXISTS project_documents_project_idx
  ON public.project_documents(project_id, category, deleted_at, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.project_stages(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title varchar(240) NOT NULL,
  description text,
  status varchar(24) NOT NULL DEFAULT 'open',
  priority varchar(16) NOT NULL DEFAULT 'normal',
  due_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_issues_status_check CHECK (status IN ('open','in_progress','resolved','cancelled')),
  CONSTRAINT project_issues_priority_check CHECK (priority IN ('low','normal','high','critical'))
);
CREATE INDEX IF NOT EXISTS project_issues_project_idx
  ON public.project_issues(project_id, status, priority, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  project_updates boolean NOT NULL DEFAULT true,
  bid_updates boolean NOT NULL DEFAULT true,
  chat_updates boolean NOT NULL DEFAULT true,
  dispute_updates boolean NOT NULL DEFAULT true,
  marketing_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.guard_completed_project_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE project_status text;
BEGIN
  SELECT status::text INTO project_status FROM public.projects WHERE id = NEW.project_id;
  IF project_status = 'completed' THEN
    RAISE EXCEPTION 'completed project is immutable for this operation' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS project_change_orders_completed_guard ON public.project_change_orders;
CREATE TRIGGER project_change_orders_completed_guard
BEFORE INSERT ON public.project_change_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_completed_project_mutation();

DROP TRIGGER IF EXISTS project_issues_completed_guard ON public.project_issues;
CREATE TRIGGER project_issues_completed_guard
BEFORE INSERT ON public.project_issues
FOR EACH ROW EXECUTE FUNCTION public.guard_completed_project_mutation();

CREATE OR REPLACE FUNCTION public.stroyselect_housekeeping()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.action_rate_limits
    WHERE window_started_at < now() - interval '7 days'
      AND (blocked_until IS NULL OR blocked_until < now() - interval '1 day');
  DELETE FROM public.auth_login_attempts
    WHERE updated_at < now() - interval '30 days';
  DELETE FROM public.auth_sessions
    WHERE expires_at < now() - interval '30 days'
       OR (revoked_at IS NOT NULL AND revoked_at < now() - interval '30 days');
  DELETE FROM public.auth_email_tokens
    WHERE expires_at < now() - interval '7 days';
  DELETE FROM public.application_errors
    WHERE resolved_at IS NOT NULL AND resolved_at < now() - interval '90 days';
END $$;

COMMIT;
