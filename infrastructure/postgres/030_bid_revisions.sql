BEGIN;

CREATE TABLE IF NOT EXISTS public.project_bid_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL REFERENCES public.project_bids(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  revision_no integer NOT NULL CHECK (revision_no >= 1),
  status text NOT NULL,
  price numeric(14,2) NOT NULL,
  duration_days integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bid_id, revision_no)
);

CREATE INDEX IF NOT EXISTS project_bid_revisions_project_idx
  ON public.project_bid_revisions(project_id, contractor_id, revision_no DESC);

CREATE TABLE IF NOT EXISTS public.project_bid_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL REFERENCES public.project_bids(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('labor','materials','equipment','other')),
  description text NOT NULL,
  quantity numeric(14,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit text,
  unit_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_bid_line_items_bid_idx
  ON public.project_bid_line_items(bid_id, sort_order, created_at);

CREATE OR REPLACE FUNCTION public.capture_project_bid_revision()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  next_revision integer;
BEGIN
  SELECT COALESCE(MAX(revision_no),0)+1 INTO next_revision
  FROM public.project_bid_revisions WHERE bid_id=NEW.id;

  INSERT INTO public.project_bid_revisions(
    bid_id,project_id,contractor_id,revision_no,status,price,duration_days,snapshot
  ) VALUES(
    NEW.id,NEW.project_id,NEW.contractor_id,next_revision,NEW.status::text,
    NEW.price,NEW.duration_days,to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_bid_revision_trigger ON public.project_bids;
CREATE TRIGGER project_bid_revision_trigger
AFTER INSERT OR UPDATE ON public.project_bids
FOR EACH ROW EXECUTE FUNCTION public.capture_project_bid_revision();

INSERT INTO public.project_bid_revisions(
  bid_id,project_id,contractor_id,revision_no,status,price,duration_days,snapshot
)
SELECT pb.id,pb.project_id,pb.contractor_id,1,pb.status::text,pb.price,pb.duration_days,to_jsonb(pb)
FROM public.project_bids pb
WHERE NOT EXISTS(SELECT 1 FROM public.project_bid_revisions r WHERE r.bid_id=pb.id);

COMMIT;
