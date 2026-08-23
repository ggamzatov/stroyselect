BEGIN;

CREATE TABLE IF NOT EXISTS public.contractor_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  raw_score integer NOT NULL CHECK (raw_score BETWEEN 0 AND 100),
  stroyselect_score integer NOT NULL CHECK (stroyselect_score BETWEEN 0 AND 100),
  confidence_percent integer NOT NULL CHECK (confidence_percent BETWEEN 0 AND 100),
  confidence_level varchar(16) NOT NULL CHECK (confidence_level IN ('low','medium','high')),
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contractor_score_history_contractor_idx
  ON public.contractor_score_history(contractor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS contractor_score_history_score_idx
  ON public.contractor_score_history(stroyselect_score DESC, confidence_percent DESC, created_at DESC);

CREATE OR REPLACE VIEW public.contractor_score_maturity AS
WITH score_data AS (
  SELECT
    csc.*,
    cc.completed_projects_count,
    cc.verification_status::text AS verification_status,
    LEAST(
      100,
      (CASE WHEN cc.verification_status::text = 'verified' THEN 15 ELSE 0 END)
      + LEAST(COALESCE(csc.review_count, 0), 10) * 4
      + LEAST(COALESCE(cc.completed_projects_count, 0), 10) * 3
      + LEAST(COALESCE(csc.bid_count, 0), 15)
    )::integer AS confidence_percent
  FROM public.contractor_score_components csc
  JOIN public.contractor_companies cc ON cc.id = csc.contractor_id
), maturity AS (
  SELECT
    score_data.*,
    CASE
      WHEN confidence_percent >= 70 THEN 'high'
      WHEN confidence_percent >= 35 THEN 'medium'
      ELSE 'low'
    END::varchar(16) AS confidence_level,
    CASE
      WHEN confidence_percent >= 70 THEN 100
      WHEN confidence_percent >= 35 THEN 90
      ELSE 75
    END::integer AS score_cap
  FROM score_data
)
SELECT
  contractor_id,
  verification_points,
  reviews_points,
  projects_points,
  profile_points,
  services_points,
  geography_points,
  portfolio_points,
  proposal_points,
  review_count,
  average_rating,
  service_count,
  area_count,
  portfolio_count,
  bid_count,
  avg_bid_completeness,
  completed_projects_count,
  verification_status,
  stroyselect_score::integer AS raw_score,
  LEAST(stroyselect_score::integer, score_cap) AS stroyselect_score,
  confidence_percent,
  confidence_level,
  score_cap,
  CASE
    WHEN confidence_level = 'low' THEN 'Мало подтверждённых результатов: итоговый рейтинг ограничен до накопления истории.'
    WHEN confidence_level = 'medium' THEN 'Есть подтверждённая история, но объём данных пока недостаточен для максимальной уверенности.'
    ELSE 'Высокая достоверность: рейтинг опирается на достаточный объём подтверждённых данных.'
  END AS confidence_explanation
FROM maturity;

CREATE OR REPLACE FUNCTION public.snapshot_contractor_score(p_contractor_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  INSERT INTO public.contractor_score_history (
    contractor_id,
    raw_score,
    stroyselect_score,
    confidence_percent,
    confidence_level,
    components,
    evidence
  )
  SELECT
    s.contractor_id,
    s.raw_score,
    s.stroyselect_score,
    s.confidence_percent,
    s.confidence_level,
    jsonb_build_object(
      'verification', s.verification_points,
      'reviews', s.reviews_points,
      'projects', s.projects_points,
      'profile', s.profile_points,
      'services', s.services_points,
      'geography', s.geography_points,
      'portfolio', s.portfolio_points,
      'proposal', s.proposal_points
    ),
    jsonb_build_object(
      'reviews', s.review_count,
      'completed_projects', s.completed_projects_count,
      'bids', s.bid_count,
      'average_rating', s.average_rating,
      'avg_bid_completeness', s.avg_bid_completeness,
      'verification_status', s.verification_status,
      'score_cap', s.score_cap
    )
  FROM public.contractor_score_maturity s
  LEFT JOIN LATERAL (
    SELECT h.raw_score, h.stroyselect_score, h.confidence_percent, h.confidence_level, h.components
    FROM public.contractor_score_history h
    WHERE h.contractor_id = s.contractor_id
    ORDER BY h.created_at DESC
    LIMIT 1
  ) latest ON true
  WHERE s.contractor_id = p_contractor_id
    AND (
      latest.raw_score IS NULL
      OR latest.raw_score IS DISTINCT FROM s.raw_score
      OR latest.stroyselect_score IS DISTINCT FROM s.stroyselect_score
      OR latest.confidence_percent IS DISTINCT FROM s.confidence_percent
      OR latest.confidence_level IS DISTINCT FROM s.confidence_level
      OR latest.components IS DISTINCT FROM jsonb_build_object(
           'verification', s.verification_points,
           'reviews', s.reviews_points,
           'projects', s.projects_points,
           'profile', s.profile_points,
           'services', s.services_points,
           'geography', s.geography_points,
           'portfolio', s.portfolio_points,
           'proposal', s.proposal_points
         )
    );

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_contractor_scores()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  row_data record;
  inserted_count integer := 0;
BEGIN
  FOR row_data IN SELECT id FROM public.contractor_companies LOOP
    IF public.snapshot_contractor_score(row_data.id) THEN
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_contractor_score_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  contractor_id_value uuid;
BEGIN
  IF TG_TABLE_NAME = 'contractor_companies' THEN
    contractor_id_value := COALESCE(NEW.id, OLD.id);
  ELSE
    contractor_id_value := COALESCE(NEW.contractor_id, OLD.contractor_id);
  END IF;

  IF contractor_id_value IS NOT NULL THEN
    PERFORM public.snapshot_contractor_score(contractor_id_value);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_project_score_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.selected_contractor_id IS NOT NULL THEN
    PERFORM public.snapshot_contractor_score(OLD.selected_contractor_id);
  END IF;
  IF NEW.selected_contractor_id IS NOT NULL
     AND NEW.selected_contractor_id IS DISTINCT FROM OLD.selected_contractor_id THEN
    PERFORM public.snapshot_contractor_score(NEW.selected_contractor_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_score_company_trigger ON public.contractor_companies;
CREATE TRIGGER contractor_score_company_trigger
AFTER UPDATE ON public.contractor_companies
FOR EACH ROW EXECUTE FUNCTION public.capture_contractor_score_change();

DROP TRIGGER IF EXISTS contractor_score_review_trigger ON public.contractor_reviews;
CREATE TRIGGER contractor_score_review_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.contractor_reviews
FOR EACH ROW EXECUTE FUNCTION public.capture_contractor_score_change();

DROP TRIGGER IF EXISTS contractor_score_bid_trigger ON public.project_bids;
CREATE TRIGGER contractor_score_bid_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.project_bids
FOR EACH ROW EXECUTE FUNCTION public.capture_contractor_score_change();

DROP TRIGGER IF EXISTS contractor_score_service_trigger ON public.contractor_services;
CREATE TRIGGER contractor_score_service_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.contractor_services
FOR EACH ROW EXECUTE FUNCTION public.capture_contractor_score_change();

DROP TRIGGER IF EXISTS contractor_score_area_trigger ON public.contractor_service_areas;
CREATE TRIGGER contractor_score_area_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.contractor_service_areas
FOR EACH ROW EXECUTE FUNCTION public.capture_contractor_score_change();

DROP TRIGGER IF EXISTS contractor_score_portfolio_trigger ON public.contractor_portfolio_projects;
CREATE TRIGGER contractor_score_portfolio_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.contractor_portfolio_projects
FOR EACH ROW EXECUTE FUNCTION public.capture_contractor_score_change();

DROP TRIGGER IF EXISTS contractor_score_project_trigger ON public.projects;
CREATE TRIGGER contractor_score_project_trigger
AFTER UPDATE OF selected_contractor_id, status ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.capture_project_score_change();

SELECT public.snapshot_contractor_scores();

COMMIT;
