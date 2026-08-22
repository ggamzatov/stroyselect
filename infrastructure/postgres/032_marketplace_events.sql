BEGIN;

CREATE TABLE IF NOT EXISTS public.marketplace_events (
  id bigserial PRIMARY KEY,
  event_name text NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  contractor_id uuid REFERENCES public.contractor_companies(id) ON DELETE SET NULL,
  bid_id uuid REFERENCES public.project_bids(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_events_name_time_idx
  ON public.marketplace_events(event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_events_project_time_idx
  ON public.marketplace_events(project_id, occurred_at DESC)
  WHERE project_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.capture_project_marketplace_event()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO public.marketplace_events(event_name,project_id,user_id,metadata)
    VALUES('project_created',NEW.id,NEW.customer_id,jsonb_build_object('status',NEW.status::text));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.marketplace_events(event_name,project_id,user_id,metadata)
    VALUES('project_status_changed',NEW.id,NEW.customer_id,jsonb_build_object('from',OLD.status::text,'to',NEW.status::text));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketplace_project_event_trigger ON public.projects;
CREATE TRIGGER marketplace_project_event_trigger
AFTER INSERT OR UPDATE OF status ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.capture_project_marketplace_event();

CREATE OR REPLACE FUNCTION public.capture_bid_marketplace_event()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO public.marketplace_events(event_name,project_id,contractor_id,bid_id,metadata)
    VALUES('bid_submitted',NEW.project_id,NEW.contractor_id,NEW.id,jsonb_build_object('price',NEW.price,'status',NEW.status::text));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.marketplace_events(event_name,project_id,contractor_id,bid_id,metadata)
    VALUES('bid_status_changed',NEW.project_id,NEW.contractor_id,NEW.id,jsonb_build_object('from',OLD.status::text,'to',NEW.status::text));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketplace_bid_event_trigger ON public.project_bids;
CREATE TRIGGER marketplace_bid_event_trigger
AFTER INSERT OR UPDATE OF status ON public.project_bids
FOR EACH ROW EXECUTE FUNCTION public.capture_bid_marketplace_event();

CREATE OR REPLACE FUNCTION public.capture_review_marketplace_event()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.marketplace_events(event_name,project_id,contractor_id,user_id,metadata)
  VALUES('review_created',NEW.project_id,NEW.contractor_id,NEW.customer_id,jsonb_build_object('rating',NEW.rating));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketplace_review_event_trigger ON public.contractor_reviews;
CREATE TRIGGER marketplace_review_event_trigger
AFTER INSERT ON public.contractor_reviews
FOR EACH ROW EXECUTE FUNCTION public.capture_review_marketplace_event();

COMMIT;
