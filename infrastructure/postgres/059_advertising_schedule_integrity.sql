BEGIN;

ALTER TABLE public.ad_orders
  DROP CONSTRAINT IF EXISTS ad_orders_schedule_within_paid_duration;

ALTER TABLE public.ad_orders
  ADD CONSTRAINT ad_orders_schedule_within_paid_duration
  CHECK (
    scheduled_from IS NULL
    OR scheduled_to IS NULL
    OR scheduled_to <= scheduled_from + duration_days_snapshot * interval '1 day'
  );

COMMIT;
