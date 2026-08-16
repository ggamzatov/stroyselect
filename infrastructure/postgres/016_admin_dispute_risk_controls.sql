BEGIN;

ALTER TABLE public.project_disputes
  ADD COLUMN IF NOT EXISTS priority varchar(16) NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS admin_resolved_by uuid,
  ADD COLUMN IF NOT EXISTS admin_resolved_at timestamptz;

ALTER TABLE public.project_disputes
  DROP CONSTRAINT IF EXISTS project_disputes_priority_check;
ALTER TABLE public.project_disputes
  ADD CONSTRAINT project_disputes_priority_check
  CHECK (priority IN ('low','normal','high','critical'));

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS risk_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS risk_hold_reason text,
  ADD COLUMN IF NOT EXISTS risk_hold_by uuid,
  ADD COLUMN IF NOT EXISTS risk_hold_at timestamptz;

CREATE TABLE IF NOT EXISTS public.project_risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  risk_type varchar(64) NOT NULL,
  severity varchar(16) NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  title varchar(180) NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_note text,
  UNIQUE(project_id, risk_type)
);

CREATE INDEX IF NOT EXISTS project_risk_flags_open_idx
  ON public.project_risk_flags(project_id, severity, detected_at DESC)
  WHERE resolved_at IS NULL;

CREATE OR REPLACE VIEW public.project_risk_signals AS
WITH dispute_stats AS (
  SELECT project_id,
         count(*) FILTER (WHERE status IN ('open','under_review')) AS open_disputes,
         count(*) AS total_disputes
  FROM public.project_disputes
  GROUP BY project_id
), change_stats AS (
  SELECT co.project_id,
         COALESCE(sum(co.amount_delta) FILTER (WHERE co.status='approved' AND co.amount_delta > 0),0) AS approved_increase
  FROM public.project_change_orders co
  GROUP BY co.project_id
), overdue_stats AS (
  SELECT project_id,
         count(*) FILTER (
           WHERE planned_end_date IS NOT NULL
             AND planned_end_date < CURRENT_DATE
             AND status <> 'completed'
         ) AS overdue_stages
  FROM public.project_stages
  GROUP BY project_id
)
SELECT p.id AS project_id,
       COALESCE(ds.open_disputes,0) AS open_disputes,
       COALESCE(ds.total_disputes,0) AS total_disputes,
       COALESCE(cs.approved_increase,0) AS approved_change_increase,
       COALESCE(os.overdue_stages,0) AS overdue_stages,
       COALESCE(pb.price,0) AS original_contract,
       CASE
         WHEN COALESCE(ds.open_disputes,0) >= 2 THEN 'critical'
         WHEN COALESCE(ds.open_disputes,0) = 1 THEN 'high'
         WHEN COALESCE(pb.price,0) > 0 AND COALESCE(cs.approved_increase,0) / pb.price >= 0.30 THEN 'high'
         WHEN COALESCE(os.overdue_stages,0) >= 2 THEN 'high'
         WHEN COALESCE(os.overdue_stages,0) = 1 THEN 'medium'
         ELSE 'low'
       END AS computed_risk_level
FROM public.projects p
LEFT JOIN public.project_bids pb ON pb.id=p.selected_bid_id
LEFT JOIN dispute_stats ds ON ds.project_id=p.id
LEFT JOIN change_stats cs ON cs.project_id=p.id
LEFT JOIN overdue_stats os ON os.project_id=p.id;

COMMIT;
