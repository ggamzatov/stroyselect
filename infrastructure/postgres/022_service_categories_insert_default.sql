BEGIN;

DO $$
DECLARE
  id_type text;
  id_default text;
  max_id bigint;
BEGIN
  SELECT data_type, column_default
    INTO id_type, id_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'service_categories'
    AND column_name = 'id';

  IF id_type IS NULL THEN
    RAISE EXCEPTION 'public.service_categories.id does not exist';
  END IF;

  IF id_type NOT IN ('smallint', 'integer', 'bigint') THEN
    RAISE EXCEPTION 'Unsupported service_categories.id type: %', id_type;
  END IF;

  IF id_default IS NULL THEN
    CREATE SEQUENCE IF NOT EXISTS public.service_categories_id_seq;

    SELECT COALESCE(MAX(id), 0)
      INTO max_id
    FROM public.service_categories;

    PERFORM setval(
      'public.service_categories_id_seq',
      GREATEST(max_id + 1, 1),
      false
    );

    ALTER TABLE public.service_categories
      ALTER COLUMN id SET DEFAULT nextval('public.service_categories_id_seq');

    ALTER SEQUENCE public.service_categories_id_seq
      OWNED BY public.service_categories.id;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS service_categories_name_ci_uidx
  ON public.service_categories (lower(trim(name)));

COMMIT;
