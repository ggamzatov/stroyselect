BEGIN;

CREATE TABLE IF NOT EXISTS public.contractor_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  region varchar(160),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contractor_cities_name_region_uidx
  ON public.contractor_cities (lower(name), lower(coalesce(region, '')));
CREATE INDEX IF NOT EXISTS contractor_cities_active_name_idx
  ON public.contractor_cities (is_active, name);

INSERT INTO public.contractor_cities(name, region)
VALUES
  ('Махачкала','Республика Дагестан'),
  ('Каспийск','Республика Дагестан'),
  ('Дербент','Республика Дагестан'),
  ('Хасавюрт','Республика Дагестан'),
  ('Буйнакск','Республика Дагестан'),
  ('Кизляр','Республика Дагестан'),
  ('Избербаш','Республика Дагестан'),
  ('Дагестанские Огни','Республика Дагестан'),
  ('Кизилюрт','Республика Дагестан'),
  ('Южно-Сухокумск','Республика Дагестан')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.application_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  source varchar(32) NOT NULL DEFAULT 'server',
  severity varchar(16) NOT NULL DEFAULT 'error',
  message text NOT NULL,
  stack text,
  route text,
  method varchar(16),
  digest varchar(160),
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT application_errors_source_check CHECK (source IN ('server','client','api','action','unknown')),
  CONSTRAINT application_errors_severity_check CHECK (severity IN ('warning','error','fatal'))
);

CREATE INDEX IF NOT EXISTS application_errors_created_idx
  ON public.application_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS application_errors_unresolved_idx
  ON public.application_errors(resolved_at, created_at DESC);
CREATE INDEX IF NOT EXISTS application_errors_user_idx
  ON public.application_errors(user_id, created_at DESC);

COMMIT;
