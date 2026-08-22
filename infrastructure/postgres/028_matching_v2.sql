BEGIN;

CREATE TABLE IF NOT EXISTS public.project_match_snapshots (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_score numeric(5,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  reasons text[] NOT NULL DEFAULT '{}'::text[],
  source_version text NOT NULL DEFAULT 'matching-v2',
  generated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, contractor_id)
);

CREATE INDEX IF NOT EXISTS project_match_snapshots_project_score_idx
  ON public.project_match_snapshots(project_id, match_score DESC, generated_at DESC);

CREATE TABLE IF NOT EXISTS public.project_contractor_preferences (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  preference text NOT NULL CHECK (preference IN ('saved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, contractor_id)
);

CREATE INDEX IF NOT EXISTS project_contractor_preferences_customer_idx
  ON public.project_contractor_preferences(customer_id, preference, updated_at DESC);

COMMIT;
