BEGIN;

CREATE TABLE IF NOT EXISTS public.project_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL,
  stage_id uuid REFERENCES public.project_stages(id) ON DELETE SET NULL,
  change_order_id uuid REFERENCES public.project_change_orders(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.project_payments(id) ON DELETE SET NULL,
  subject varchar(180) NOT NULL,
  description text NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','closed')),
  resolution text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.project_disputes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_audit_log (
  id bigserial PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  actor_id uuid,
  action varchar(100) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_disputes_project_idx ON public.project_disputes(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS project_dispute_messages_dispute_idx ON public.project_dispute_messages(dispute_id, created_at);
CREATE INDEX IF NOT EXISTS project_audit_log_project_idx ON public.project_audit_log(project_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_project_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'project_audit_log is append-only';
END;
$$;

DROP TRIGGER IF EXISTS project_audit_log_immutable ON public.project_audit_log;
CREATE TRIGGER project_audit_log_immutable
BEFORE UPDATE OR DELETE ON public.project_audit_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_project_audit_mutation();

COMMIT;
