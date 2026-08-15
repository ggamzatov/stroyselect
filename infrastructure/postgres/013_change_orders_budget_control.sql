ALTER TYPE public.project_event_type ADD VALUE IF NOT EXISTS 'change_order_created';
ALTER TYPE public.project_event_type ADD VALUE IF NOT EXISTS 'change_order_approved';
ALTER TYPE public.project_event_type ADD VALUE IF NOT EXISTS 'change_order_rejected';
ALTER TYPE public.project_event_type ADD VALUE IF NOT EXISTS 'payment_recorded';

BEGIN;

CREATE TABLE IF NOT EXISTS public.project_change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  reason text NOT NULL,
  scope_change text NOT NULL,
  amount_delta numeric(14,2) NOT NULL DEFAULT 0,
  duration_delta_days integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  decision_comment text,
  decided_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_change_orders_project_idx
  ON public.project_change_orders(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS project_change_orders_pending_idx
  ON public.project_change_orders(project_id, status)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.project_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  recorded_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_payments_project_idx
  ON public.project_payments(project_id, paid_at DESC, created_at DESC);

COMMIT;
