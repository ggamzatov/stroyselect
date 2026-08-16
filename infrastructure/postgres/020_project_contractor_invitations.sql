BEGIN;

CREATE TABLE IF NOT EXISTS public.project_contractor_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status varchar(24) NOT NULL DEFAULT 'invited',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_contractor_invitations_status_check
    CHECK (status IN ('invited','responded','declined','cancelled')),
  CONSTRAINT project_contractor_invitations_unique
    UNIQUE (project_id, contractor_id)
);

CREATE INDEX IF NOT EXISTS project_contractor_invitations_contractor_idx
  ON public.project_contractor_invitations(contractor_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS project_contractor_invitations_project_idx
  ON public.project_contractor_invitations(project_id, status, created_at DESC);

COMMIT;
