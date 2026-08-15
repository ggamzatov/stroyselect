BEGIN;

ALTER TYPE public.project_event_type
  ADD VALUE IF NOT EXISTS 'bid_created';

ALTER TYPE public.project_event_type
  ADD VALUE IF NOT EXISTS 'bid_rejected';

COMMIT;
