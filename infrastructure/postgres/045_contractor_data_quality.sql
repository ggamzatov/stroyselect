BEGIN;

CREATE TABLE IF NOT EXISTS public.contractor_profile_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  changed_fields text[] NOT NULL DEFAULT '{}',
  before_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contractor_profile_history_company_idx
  ON public.contractor_profile_history(contractor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.contractor_entity_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_a_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  contractor_b_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  match_type text NOT NULL CHECK (match_type IN ('inn','ogrn')),
  match_value text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','same_entity','not_duplicate')),
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contractor_entity_matches_order_check CHECK (contractor_a_id < contractor_b_id),
  UNIQUE(contractor_a_id, contractor_b_id, match_type, match_value)
);
CREATE INDEX IF NOT EXISTS contractor_entity_matches_open_idx
  ON public.contractor_entity_matches(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.contractor_registry_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  source text NOT NULL,
  identifier_type text NOT NULL CHECK (identifier_type IN ('inn','ogrn','license','sro','other')),
  identifier_value text NOT NULL,
  status text NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified','matched','mismatch','error')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text
);
CREATE INDEX IF NOT EXISTS contractor_registry_checks_company_idx
  ON public.contractor_registry_checks(contractor_id, checked_at DESC);

CREATE OR REPLACE FUNCTION public.capture_contractor_profile_history()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  changed text[] := '{}';
  old_data jsonb;
  new_data jsonb;
BEGIN
  old_data := jsonb_build_object(
    'public_name', OLD.public_name,
    'legal_name', OLD.legal_name,
    'company_type', OLD.company_type::text,
    'inn', OLD.inn,
    'ogrn', OLD.ogrn,
    'contact_phone', OLD.contact_phone,
    'contact_email', OLD.contact_email,
    'website', OLD.website,
    'accepts_new_projects', OLD.accepts_new_projects
  );
  new_data := jsonb_build_object(
    'public_name', NEW.public_name,
    'legal_name', NEW.legal_name,
    'company_type', NEW.company_type::text,
    'inn', NEW.inn,
    'ogrn', NEW.ogrn,
    'contact_phone', NEW.contact_phone,
    'contact_email', NEW.contact_email,
    'website', NEW.website,
    'accepts_new_projects', NEW.accepts_new_projects
  );

  IF NEW.public_name IS DISTINCT FROM OLD.public_name THEN changed := array_append(changed,'public_name'); END IF;
  IF NEW.legal_name IS DISTINCT FROM OLD.legal_name THEN changed := array_append(changed,'legal_name'); END IF;
  IF NEW.company_type IS DISTINCT FROM OLD.company_type THEN changed := array_append(changed,'company_type'); END IF;
  IF NEW.inn IS DISTINCT FROM OLD.inn THEN changed := array_append(changed,'inn'); END IF;
  IF NEW.ogrn IS DISTINCT FROM OLD.ogrn THEN changed := array_append(changed,'ogrn'); END IF;
  IF NEW.contact_phone IS DISTINCT FROM OLD.contact_phone THEN changed := array_append(changed,'contact_phone'); END IF;
  IF NEW.contact_email IS DISTINCT FROM OLD.contact_email THEN changed := array_append(changed,'contact_email'); END IF;
  IF NEW.website IS DISTINCT FROM OLD.website THEN changed := array_append(changed,'website'); END IF;
  IF NEW.accepts_new_projects IS DISTINCT FROM OLD.accepts_new_projects THEN changed := array_append(changed,'accepts_new_projects'); END IF;

  IF cardinality(changed) > 0 THEN
    INSERT INTO public.contractor_profile_history(contractor_id,changed_fields,before_data,after_data)
    VALUES(NEW.id,changed,old_data,new_data);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_profile_history_trigger ON public.contractor_companies;
CREATE TRIGGER contractor_profile_history_trigger
AFTER UPDATE ON public.contractor_companies
FOR EACH ROW EXECUTE FUNCTION public.capture_contractor_profile_history();

CREATE OR REPLACE FUNCTION public.refresh_contractor_entity_matches(target_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  target public.contractor_companies%ROWTYPE;
  normalized_inn text;
  normalized_ogrn text;
BEGIN
  SELECT * INTO target FROM public.contractor_companies WHERE id=target_id;
  IF NOT FOUND THEN RETURN; END IF;

  normalized_inn := NULLIF(regexp_replace(COALESCE(target.inn,''),'\D','','g'),'');
  normalized_ogrn := NULLIF(regexp_replace(COALESCE(target.ogrn,''),'\D','','g'),'');

  DELETE FROM public.contractor_entity_matches
  WHERE status='open'
    AND (contractor_a_id=target.id OR contractor_b_id=target.id)
    AND (
      (match_type='inn' AND match_value IS DISTINCT FROM normalized_inn)
      OR (match_type='ogrn' AND match_value IS DISTINCT FROM normalized_ogrn)
    );

  IF normalized_inn IS NOT NULL THEN
    INSERT INTO public.contractor_entity_matches(contractor_a_id,contractor_b_id,match_type,match_value)
    SELECT LEAST(target.id,c.id),GREATEST(target.id,c.id),'inn',normalized_inn
    FROM public.contractor_companies c
    WHERE c.id<>target.id
      AND regexp_replace(COALESCE(c.inn,''),'\D','','g')=normalized_inn
    ON CONFLICT DO NOTHING;
  END IF;

  IF normalized_ogrn IS NOT NULL THEN
    INSERT INTO public.contractor_entity_matches(contractor_a_id,contractor_b_id,match_type,match_value)
    SELECT LEAST(target.id,c.id),GREATEST(target.id,c.id),'ogrn',normalized_ogrn
    FROM public.contractor_companies c
    WHERE c.id<>target.id
      AND regexp_replace(COALESCE(c.ogrn,''),'\D','','g')=normalized_ogrn
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_contractor_entity_matches_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.refresh_contractor_entity_matches(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_entity_matches_trigger ON public.contractor_companies;
CREATE TRIGGER contractor_entity_matches_trigger
AFTER INSERT OR UPDATE OF inn,ogrn ON public.contractor_companies
FOR EACH ROW EXECUTE FUNCTION public.refresh_contractor_entity_matches_trigger();

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM public.contractor_companies LOOP
    PERFORM public.refresh_contractor_entity_matches(r.id);
  END LOOP;
END $$;

COMMIT;
