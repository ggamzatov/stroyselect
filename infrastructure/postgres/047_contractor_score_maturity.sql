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

CREATE OR REPLACE FUNCTION public.snapshot_contractor_scores()
RETURNS integer
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
    SELECT h.raw_score, h.stroyselect_score, h.confidence_percent, h.confidence_level, h.components, h.evidence
    FROM public.contractor_score_history h
    WHERE h.contractor_id = s.contractor_id
    ORDER BY h.created_at DESC
    LIMIT 1
  ) latest ON true
  WHERE latest.raw_score IS NULL
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
        );

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

SELECT public.snapshot_contractor_scores();

COMMIT;
