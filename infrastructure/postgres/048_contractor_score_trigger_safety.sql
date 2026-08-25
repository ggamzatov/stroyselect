BEGIN;

CREATE OR REPLACE FUNCTION public.capture_contractor_score_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  contractor_id_value uuid;
BEGIN
  IF TG_TABLE_NAME = 'contractor_companies' THEN
    contractor_id_value := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  ELSE
    contractor_id_value := CASE WHEN TG_OP = 'DELETE' THEN OLD.contractor_id ELSE NEW.contractor_id END;
  END IF;

  IF contractor_id_value IS NOT NULL THEN
    PERFORM public.snapshot_contractor_score(contractor_id_value);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
