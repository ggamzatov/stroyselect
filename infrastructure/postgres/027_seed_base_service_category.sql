BEGIN;

INSERT INTO public.service_categories (slug, name, is_active)
SELECT 'general-construction', 'Общестроительные работы', true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.service_categories
  WHERE COALESCE(is_active, true) = true
);

COMMIT;
