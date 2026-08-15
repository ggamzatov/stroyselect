BEGIN;

CREATE TABLE IF NOT EXISTS public.project_candidate_crm (
  project_id uuid NOT NULL,
  contractor_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  stage text NOT NULL DEFAULT 'new',
  note text,
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, contractor_id),
  CONSTRAINT project_candidate_crm_project_fk
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE,
  CONSTRAINT project_candidate_crm_contractor_fk
    FOREIGN KEY (contractor_id)
    REFERENCES public.contractor_companies(id)
    ON DELETE CASCADE,
  CONSTRAINT project_candidate_crm_customer_fk
    FOREIGN KEY (customer_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE,
  CONSTRAINT project_candidate_crm_stage_check
    CHECK (stage IN (
      'new',
      'viewed',
      'shortlisted',
      'contacted',
      'proposal_received',
      'finalist',
      'selected',
      'archived'
    ))
);

CREATE INDEX IF NOT EXISTS project_candidate_crm_customer_project_idx
  ON public.project_candidate_crm (customer_id, project_id, stage);

CREATE INDEX IF NOT EXISTS project_candidate_crm_follow_up_idx
  ON public.project_candidate_crm (customer_id, next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.project_advisor_tasks (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  title text NOT NULL,
  due_at timestamptz,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_advisor_tasks_project_fk
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE,
  CONSTRAINT project_advisor_tasks_customer_fk
    FOREIGN KEY (customer_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE,
  CONSTRAINT project_advisor_tasks_title_check
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 300)
);

CREATE INDEX IF NOT EXISTS project_advisor_tasks_project_due_idx
  ON public.project_advisor_tasks (project_id, is_completed, due_at, created_at);

CREATE TABLE IF NOT EXISTS public.project_advisor_activity (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  contractor_id uuid,
  activity_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_advisor_activity_project_fk
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE,
  CONSTRAINT project_advisor_activity_customer_fk
    FOREIGN KEY (customer_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE,
  CONSTRAINT project_advisor_activity_contractor_fk
    FOREIGN KEY (contractor_id)
    REFERENCES public.contractor_companies(id)
    ON DELETE SET NULL,
  CONSTRAINT project_advisor_activity_type_check
    CHECK (activity_type IN (
      'stage_changed',
      'note_updated',
      'follow_up_changed',
      'task_created',
      'task_completed',
      'task_reopened',
      'task_deleted'
    ))
);

CREATE INDEX IF NOT EXISTS project_advisor_activity_project_created_idx
  ON public.project_advisor_activity (project_id, created_at DESC);

COMMIT;
