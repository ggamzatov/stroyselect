BEGIN;

CREATE TABLE IF NOT EXISTS public.project_match_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_score numeric(5,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  reasons text[] NOT NULL DEFAULT '{}'::text[],
  source_version text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, contractor_id, source_version)
);

CREATE INDEX IF NOT EXISTS project_match_observations_version_score_idx
  ON public.project_match_observations(source_version, match_score DESC, generated_at DESC);

CREATE INDEX IF NOT EXISTS project_match_observations_project_idx
  ON public.project_match_observations(project_id, generated_at DESC);

INSERT INTO public.project_match_observations (
  project_id, contractor_id, customer_id, match_score, components, reasons, source_version, generated_at
)
SELECT
  project_id, contractor_id, customer_id, match_score, components, reasons, source_version, generated_at
FROM public.project_match_snapshots
ON CONFLICT (project_id, contractor_id, source_version) DO NOTHING;

CREATE OR REPLACE FUNCTION public.capture_project_match_observation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.project_match_observations (
    project_id,
    contractor_id,
    customer_id,
    match_score,
    components,
    reasons,
    source_version,
    generated_at
  ) VALUES (
    NEW.project_id,
    NEW.contractor_id,
    NEW.customer_id,
    NEW.match_score,
    NEW.components,
    NEW.reasons,
    NEW.source_version,
    NEW.generated_at
  )
  ON CONFLICT (project_id, contractor_id, source_version) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_match_snapshots_capture_observation
  ON public.project_match_snapshots;

CREATE TRIGGER project_match_snapshots_capture_observation
AFTER INSERT OR UPDATE OF match_score, components, reasons, source_version
ON public.project_match_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.capture_project_match_observation();

CREATE OR REPLACE VIEW public.matching_feedback_outcomes AS
SELECT
  o.id AS observation_id,
  o.project_id,
  o.contractor_id,
  o.customer_id,
  o.match_score,
  o.components,
  o.reasons,
  o.source_version,
  o.generated_at,
  EXISTS (
    SELECT 1
    FROM public.project_contractor_invitations pci
    WHERE pci.project_id = o.project_id
      AND pci.contractor_id = o.contractor_id
      AND pci.status::text <> 'cancelled'
  ) AS was_invited,
  EXISTS (
    SELECT 1
    FROM public.project_contractor_invitations pci
    WHERE pci.project_id = o.project_id
      AND pci.contractor_id = o.contractor_id
      AND pci.status::text IN ('accepted','declined')
  ) AS invitation_answered,
  EXISTS (
    SELECT 1
    FROM public.project_bids pb
    WHERE pb.project_id = o.project_id
      AND pb.contractor_id = o.contractor_id
      AND pb.status::text <> 'withdrawn'
  ) AS submitted_bid,
  (p.selected_contractor_id = o.contractor_id) AS was_selected,
  (p.selected_contractor_id = o.contractor_id AND p.status::text = 'completed') AS project_completed,
  EXISTS (
    SELECT 1
    FROM public.contractor_reviews cr
    WHERE cr.project_id = o.project_id
      AND cr.contractor_id = o.contractor_id
      AND COALESCE(cr.moderation_status, 'published') = 'published'
  ) AS received_review,
  EXISTS (
    SELECT 1
    FROM public.project_disputes pd
    WHERE pd.project_id = o.project_id
      AND p.selected_contractor_id = o.contractor_id
  ) AS had_dispute,
  (
    SELECT ROUND(AVG(cr.rating)::numeric, 2)
    FROM public.contractor_reviews cr
    WHERE cr.project_id = o.project_id
      AND cr.contractor_id = o.contractor_id
      AND COALESCE(cr.moderation_status, 'published') = 'published'
  ) AS review_rating
FROM public.project_match_observations o
JOIN public.projects p ON p.id = o.project_id;

COMMIT;
