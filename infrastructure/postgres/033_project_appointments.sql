BEGIN;

CREATE TABLE IF NOT EXISTS public.project_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  appointment_type text NOT NULL CHECK (appointment_type IN ('site_visit','meeting','call','video_call')),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 160),
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  location text,
  notes text,
  reminder_at timestamptz,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','confirmed','completed','cancelled')),
  customer_response text NOT NULL DEFAULT 'pending' CHECK (customer_response IN ('pending','accepted','declined')),
  contractor_response text NOT NULL DEFAULT 'pending' CHECK (contractor_response IN ('pending','accepted','declined')),
  cancelled_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (scheduled_end > scheduled_start),
  CHECK (reminder_at IS NULL OR reminder_at < scheduled_start)
);

CREATE INDEX IF NOT EXISTS project_appointments_project_time_idx
  ON public.project_appointments(project_id, scheduled_start);
CREATE INDEX IF NOT EXISTS project_appointments_reminder_idx
  ON public.project_appointments(reminder_at)
  WHERE reminder_at IS NOT NULL AND status IN ('proposed','confirmed');

COMMIT;
