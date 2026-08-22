BEGIN;

CREATE TABLE IF NOT EXISTS public.project_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  source_bid_id uuid REFERENCES public.project_bids(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  contractor_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','active','cancelled','completed')),
  current_version integer NOT NULL DEFAULT 1 CHECK (current_version >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_contract_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.project_contracts(id) ON DELETE CASCADE,
  version_no integer NOT NULL CHECK (version_no >= 1),
  title text NOT NULL,
  body text NOT NULL,
  commercial_terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  customer_approved_at timestamptz,
  contractor_approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_id,version_no)
);

CREATE INDEX IF NOT EXISTS project_contract_versions_contract_idx
  ON public.project_contract_versions(contract_id,version_no DESC);

CREATE TABLE IF NOT EXISTS public.project_handover_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','needs_fix','not_applicable')),
  customer_comment text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_handover_items_project_idx
  ON public.project_handover_items(project_id,status,created_at);

COMMIT;
