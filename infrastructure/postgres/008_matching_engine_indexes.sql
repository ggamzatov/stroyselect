BEGIN;

CREATE INDEX IF NOT EXISTS idx_contractor_services_category_contractor
  ON public.contractor_services (category_id, contractor_id);

CREATE INDEX IF NOT EXISTS idx_contractor_service_areas_contractor_city_lower
  ON public.contractor_service_areas (
    contractor_id,
    lower(trim(city))
  );

CREATE INDEX IF NOT EXISTS idx_contractor_service_areas_contractor_region_lower
  ON public.contractor_service_areas (
    contractor_id,
    lower(trim(coalesce(region, '')))
  );

CREATE INDEX IF NOT EXISTS idx_contractor_companies_matching_pool
  ON public.contractor_companies (
    recommendation_score DESC,
    rating DESC,
    completed_projects_count DESC
  )
  WHERE verification_status = 'verified'
    AND accepts_new_projects = true;

COMMIT;
