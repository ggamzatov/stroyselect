BEGIN;

ALTER TABLE public.project_appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

ALTER TABLE public.project_stages
  ADD COLUMN IF NOT EXISTS due_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS overdue_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS project_appointments_due_reminder_idx
  ON public.project_appointments(reminder_at)
  WHERE reminder_at IS NOT NULL AND reminder_sent_at IS NULL AND status IN ('proposed','confirmed');

CREATE INDEX IF NOT EXISTS project_stages_due_notification_idx
  ON public.project_stages(planned_end_date)
  WHERE status NOT IN ('completed','cancelled');

COMMIT;
