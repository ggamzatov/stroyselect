BEGIN;

CREATE OR REPLACE VIEW public.contractor_score_components AS
WITH review_stats AS (
  SELECT
    contractor_id,
    COUNT(*)::integer AS review_count,
    COALESCE(AVG(rating), 0)::numeric AS average_rating
  FROM public.contractor_reviews
  GROUP BY contractor_id
),
service_stats AS (
  SELECT
    contractor_id,
    COUNT(*)::integer AS service_count,
    BOOL_OR(is_primary) AS has_primary_service
  FROM public.contractor_services
  GROUP BY contractor_id
),
area_stats AS (
  SELECT
    contractor_id,
    COUNT(*)::integer AS area_count
  FROM public.contractor_service_areas
  GROUP BY contractor_id
),
portfolio_stats AS (
  SELECT
    contractor_id,
    COUNT(*)::integer AS portfolio_count
  FROM public.contractor_portfolio_projects
  GROUP BY contractor_id
),
bid_stats AS (
  SELECT
    contractor_id,
    COUNT(*) FILTER (WHERE status <> 'withdrawn')::integer AS bid_count,
    COALESCE(AVG(completeness_score) FILTER (WHERE status <> 'withdrawn'), 0)::numeric AS avg_bid_completeness
  FROM public.project_bids
  GROUP BY contractor_id
)
SELECT
  cc.id AS contractor_id,

  CASE WHEN cc.verification_status = 'verified' THEN 20 ELSE 0 END AS verification_points,

  LEAST(
    20,
    ROUND(
      LEAST(GREATEST(COALESCE(rs.average_rating, 0), 0), 5) / 5 * 16
      + LEAST(COALESCE(rs.review_count, 0), 8) / 8.0 * 4
    )::integer
  ) AS reviews_points,

  LEAST(
    15,
    CASE
      WHEN COALESCE(cc.completed_projects_count, 0) >= 10 THEN 15
      WHEN COALESCE(cc.completed_projects_count, 0) >= 5 THEN 12
      WHEN COALESCE(cc.completed_projects_count, 0) >= 2 THEN 8
      WHEN COALESCE(cc.completed_projects_count, 0) >= 1 THEN 5
      ELSE 0
    END
  ) AS projects_points,

  LEAST(
    15,
    (CASE WHEN COALESCE(NULLIF(BTRIM(cc.description), ''), '') <> '' THEN 4 ELSE 0 END)
    + (CASE WHEN cc.founded_year IS NOT NULL THEN 2 ELSE 0 END)
    + (CASE WHEN cc.employee_count IS NOT NULL THEN 2 ELSE 0 END)
    + (CASE WHEN COALESCE(NULLIF(BTRIM(cc.contact_phone), ''), '') <> '' THEN 2 ELSE 0 END)
    + (CASE WHEN COALESCE(NULLIF(BTRIM(cc.contact_email), ''), '') <> '' THEN 2 ELSE 0 END)
    + (CASE WHEN COALESCE(NULLIF(BTRIM(cc.website), ''), '') <> '' OR COALESCE(NULLIF(BTRIM(cc.telegram), ''), '') <> '' THEN 1 ELSE 0 END)
    + (CASE WHEN cc.minimum_project_budget IS NOT NULL OR cc.maximum_project_budget IS NOT NULL THEN 2 ELSE 0 END)
  ) AS profile_points,

  LEAST(
    10,
    CASE
      WHEN COALESCE(ss.service_count, 0) >= 4 THEN 8
      WHEN COALESCE(ss.service_count, 0) >= 2 THEN 6
      WHEN COALESCE(ss.service_count, 0) >= 1 THEN 4
      ELSE 0
    END
    + CASE WHEN COALESCE(ss.has_primary_service, false) THEN 2 ELSE 0 END
  ) AS services_points,

  LEAST(
    8,
    CASE
      WHEN COALESCE(ast.area_count, 0) >= 3 THEN 8
      WHEN COALESCE(ast.area_count, 0) = 2 THEN 6
      WHEN COALESCE(ast.area_count, 0) = 1 THEN 4
      ELSE 0
    END
  ) AS geography_points,

  LEAST(
    8,
    CASE
      WHEN COALESCE(ps.portfolio_count, 0) >= 4 THEN 8
      WHEN COALESCE(ps.portfolio_count, 0) >= 2 THEN 6
      WHEN COALESCE(ps.portfolio_count, 0) = 1 THEN 4
      ELSE 0
    END
  ) AS portfolio_points,

  LEAST(
    4,
    CASE
      WHEN COALESCE(bs.bid_count, 0) = 0 THEN 0
      WHEN COALESCE(bs.avg_bid_completeness, 0) >= 90 THEN 4
      WHEN COALESCE(bs.avg_bid_completeness, 0) >= 75 THEN 3
      WHEN COALESCE(bs.avg_bid_completeness, 0) >= 60 THEN 2
      ELSE 1
    END
  ) AS proposal_points,

  COALESCE(rs.review_count, 0) AS review_count,
  ROUND(COALESCE(rs.average_rating, 0), 2) AS average_rating,
  COALESCE(ss.service_count, 0) AS service_count,
  COALESCE(ast.area_count, 0) AS area_count,
  COALESCE(ps.portfolio_count, 0) AS portfolio_count,
  COALESCE(bs.bid_count, 0) AS bid_count,
  ROUND(COALESCE(bs.avg_bid_completeness, 0), 1) AS avg_bid_completeness,

  LEAST(
    100,
    CASE WHEN cc.verification_status = 'verified' THEN 20 ELSE 0 END
    + LEAST(20, ROUND(LEAST(GREATEST(COALESCE(rs.average_rating, 0), 0), 5) / 5 * 16 + LEAST(COALESCE(rs.review_count, 0), 8) / 8.0 * 4)::integer)
    + LEAST(15, CASE WHEN COALESCE(cc.completed_projects_count, 0) >= 10 THEN 15 WHEN COALESCE(cc.completed_projects_count, 0) >= 5 THEN 12 WHEN COALESCE(cc.completed_projects_count, 0) >= 2 THEN 8 WHEN COALESCE(cc.completed_projects_count, 0) >= 1 THEN 5 ELSE 0 END)
    + LEAST(15,
        (CASE WHEN COALESCE(NULLIF(BTRIM(cc.description), ''), '') <> '' THEN 4 ELSE 0 END)
      + (CASE WHEN cc.founded_year IS NOT NULL THEN 2 ELSE 0 END)
      + (CASE WHEN cc.employee_count IS NOT NULL THEN 2 ELSE 0 END)
      + (CASE WHEN COALESCE(NULLIF(BTRIM(cc.contact_phone), ''), '') <> '' THEN 2 ELSE 0 END)
      + (CASE WHEN COALESCE(NULLIF(BTRIM(cc.contact_email), ''), '') <> '' THEN 2 ELSE 0 END)
      + (CASE WHEN COALESCE(NULLIF(BTRIM(cc.website), ''), '') <> '' OR COALESCE(NULLIF(BTRIM(cc.telegram), ''), '') <> '' THEN 1 ELSE 0 END)
      + (CASE WHEN cc.minimum_project_budget IS NOT NULL OR cc.maximum_project_budget IS NOT NULL THEN 2 ELSE 0 END)
    )
    + LEAST(10, CASE WHEN COALESCE(ss.service_count, 0) >= 4 THEN 8 WHEN COALESCE(ss.service_count, 0) >= 2 THEN 6 WHEN COALESCE(ss.service_count, 0) >= 1 THEN 4 ELSE 0 END + CASE WHEN COALESCE(ss.has_primary_service, false) THEN 2 ELSE 0 END)
    + LEAST(8, CASE WHEN COALESCE(ast.area_count, 0) >= 3 THEN 8 WHEN COALESCE(ast.area_count, 0) = 2 THEN 6 WHEN COALESCE(ast.area_count, 0) = 1 THEN 4 ELSE 0 END)
    + LEAST(8, CASE WHEN COALESCE(ps.portfolio_count, 0) >= 4 THEN 8 WHEN COALESCE(ps.portfolio_count, 0) >= 2 THEN 6 WHEN COALESCE(ps.portfolio_count, 0) = 1 THEN 4 ELSE 0 END)
    + LEAST(4, CASE WHEN COALESCE(bs.bid_count, 0) = 0 THEN 0 WHEN COALESCE(bs.avg_bid_completeness, 0) >= 90 THEN 4 WHEN COALESCE(bs.avg_bid_completeness, 0) >= 75 THEN 3 WHEN COALESCE(bs.avg_bid_completeness, 0) >= 60 THEN 2 ELSE 1 END)
  )::integer AS stroyselect_score

FROM public.contractor_companies cc
LEFT JOIN review_stats rs ON rs.contractor_id = cc.id
LEFT JOIN service_stats ss ON ss.contractor_id = cc.id
LEFT JOIN area_stats ast ON ast.contractor_id = cc.id
LEFT JOIN portfolio_stats ps ON ps.contractor_id = cc.id
LEFT JOIN bid_stats bs ON bs.contractor_id = cc.id;

COMMIT;
