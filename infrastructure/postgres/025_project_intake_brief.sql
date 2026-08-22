BEGIN;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS work_type varchar(120),
  ADD COLUMN IF NOT EXISTS scope_details text,
  ADD COLUMN IF NOT EXISTS current_condition varchar(80),
  ADD COLUMN IF NOT EXISTS finish_level varchar(40),
  ADD COLUMN IF NOT EXISTS dimensions text,
  ADD COLUMN IF NOT EXISTS permit_readiness varchar(40),
  ADD COLUMN IF NOT EXISTS design_readiness varchar(40),
  ADD COLUMN IF NOT EXISTS travel_constraints text,
  ADD COLUMN IF NOT EXISTS material_preferences text;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_finish_level_check,
  ADD CONSTRAINT projects_finish_level_check
    CHECK (finish_level IS NULL OR finish_level IN ('basic','standard','premium','custom')),
  DROP CONSTRAINT IF EXISTS projects_permit_readiness_check,
  ADD CONSTRAINT projects_permit_readiness_check
    CHECK (permit_readiness IS NULL OR permit_readiness IN ('not_needed','not_started','in_progress','ready','unknown')),
  DROP CONSTRAINT IF EXISTS projects_design_readiness_check,
  ADD CONSTRAINT projects_design_readiness_check
    CHECK (design_readiness IS NULL OR design_readiness IN ('not_needed','idea','in_progress','ready','unknown'));

CREATE INDEX IF NOT EXISTS projects_intake_matching_idx
  ON public.projects(category_id, property_type, city, status);

COMMIT;
