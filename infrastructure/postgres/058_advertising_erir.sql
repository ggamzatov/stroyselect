BEGIN;

CREATE TABLE IF NOT EXISTS public.ad_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(64) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  description text,
  placement_type varchar(24) NOT NULL CHECK (placement_type IN ('display','feed','boost')),
  pricing_model varchar(24) NOT NULL DEFAULT 'fixed_day' CHECK (pricing_model IN ('fixed_day')),
  unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'RUB' CHECK (currency = upper(currency)),
  min_days integer NOT NULL DEFAULT 1 CHECK (min_days > 0),
  max_days integer NOT NULL DEFAULT 90 CHECK (max_days >= min_days),
  requires_erid boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ad_placements(code,name,description,placement_type,unit_price_minor,min_days,max_days,sort_order)
VALUES
  ('home_premium','Премиум на главной','Отдельный рекламный блок на главной странице.','display',149000,1,30,10),
  ('project_feed','Лента проектов','Отдельный рекламный блок рядом с доступными проектами; не влияет на органический matching.','feed',49000,1,30,20),
  ('category_city','Категория + город','Спонсорский блок на публичной SEO-странице услуги и города.','display',79000,1,60,30),
  ('materials','Стройматериалы','Спонсорский блок в разделе закупки материалов.','display',69000,1,60,40),
  ('contractor_boost','Продвижение подрядчика','Выделенный спонсорский блок подрядчика без изменения органического рейтинга.','boost',39000,1,30,50),
  ('supplier_boost','Продвижение поставщика','Выделенный спонсорский блок поставщика без изменения органической сортировки.','boost',39000,1,30,60)
ON CONFLICT(code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ad_advertisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  display_name varchar(200) NOT NULL,
  legal_name varchar(240) NOT NULL,
  inn varchar(12) NOT NULL,
  ogrn varchar(15),
  website_url text,
  contact_email text,
  contact_phone text,
  status varchar(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('draft','pending','verified','rejected','suspended')),
  verification_notes text,
  verified_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  legal_confirmation_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (inn ~ '^[0-9]{10}([0-9]{2})?$'),
  CHECK (ogrn IS NULL OR ogrn ~ '^[0-9]{13}([0-9]{2})?$')
);

CREATE UNIQUE INDEX IF NOT EXISTS ad_advertisers_owner_unique_idx
  ON public.ad_advertisers(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ad_advertisers_status_idx
  ON public.ad_advertisers(status,created_at DESC);

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.ad_advertisers(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  name varchar(200) NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed','cancelled')),
  target_city varchar(160),
  target_category_slug varchar(160),
  target_contractor_id uuid REFERENCES public.contractor_companies(id) ON DELETE SET NULL,
  target_supplier_id uuid REFERENCES public.material_suppliers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT (target_contractor_id IS NOT NULL AND target_supplier_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS ad_campaigns_advertiser_idx
  ON public.ad_campaigns(advertiser_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.ad_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  title varchar(180) NOT NULL,
  body text NOT NULL,
  destination_url text NOT NULL,
  image_url text,
  status varchar(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected')),
  moderation_notes text,
  erid varchar(160),
  ord_provider varchar(100),
  ord_creative_id text,
  erid_registered_at timestamptz,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (destination_url ~ '^https?://')
);

CREATE UNIQUE INDEX IF NOT EXISTS ad_creatives_erid_unique_idx
  ON public.ad_creatives(erid) WHERE erid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ad_creatives_campaign_idx
  ON public.ad_creatives(campaign_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.ad_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.ad_advertisers(id) ON DELETE RESTRICT,
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE RESTRICT,
  creative_id uuid NOT NULL REFERENCES public.ad_creatives(id) ON DELETE RESTRICT,
  placement_id uuid NOT NULL REFERENCES public.ad_placements(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status varchar(32) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','awaiting_payment','paid','moderation','approved','rejected','scheduled','active','completed','cancelled','refunded'
  )),
  duration_days_snapshot integer NOT NULL CHECK (duration_days_snapshot > 0),
  unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'RUB' CHECK (currency = upper(currency)),
  levy_rate_bps integer NOT NULL DEFAULT 300 CHECK (levy_rate_bps BETWEEN 0 AND 10000),
  levy_estimate_minor bigint NOT NULL DEFAULT 0 CHECK (levy_estimate_minor >= 0),
  placement_code_snapshot varchar(64) NOT NULL,
  placement_name_snapshot varchar(160) NOT NULL,
  advertiser_name_snapshot varchar(200) NOT NULL,
  advertiser_inn_snapshot varchar(12) NOT NULL,
  title_snapshot varchar(180) NOT NULL,
  body_snapshot text NOT NULL,
  destination_url_snapshot text NOT NULL,
  image_url_snapshot text,
  target_city_snapshot varchar(160),
  target_category_slug_snapshot varchar(160),
  target_contractor_id uuid REFERENCES public.contractor_companies(id) ON DELETE SET NULL,
  target_supplier_id uuid REFERENCES public.material_suppliers(id) ON DELETE SET NULL,
  scheduled_from timestamptz,
  scheduled_to timestamptz,
  paid_at timestamptz,
  moderation_started_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  activated_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (amount_minor = unit_price_minor * duration_days_snapshot),
  CHECK (levy_estimate_minor = round(amount_minor::numeric * levy_rate_bps / 10000)::bigint),
  CHECK (destination_url_snapshot ~ '^https?://'),
  CHECK (scheduled_to IS NULL OR scheduled_from IS NOT NULL),
  CHECK (scheduled_from IS NULL OR scheduled_to IS NULL OR scheduled_to > scheduled_from)
);

CREATE INDEX IF NOT EXISTS ad_orders_owner_idx
  ON public.ad_orders(advertiser_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ad_orders_status_idx
  ON public.ad_orders(status,created_at DESC);
CREATE INDEX IF NOT EXISTS ad_orders_active_slot_idx
  ON public.ad_orders(placement_code_snapshot,status,scheduled_from,scheduled_to)
  WHERE status IN ('scheduled','active');

CREATE TABLE IF NOT EXISTS public.ad_order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.ad_orders(id) ON DELETE CASCADE,
  payer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  provider varchar(24) NOT NULL CHECK (provider IN ('yookassa','admin')),
  provider_payment_id text UNIQUE,
  idempotency_key uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status varchar(24) NOT NULL CHECK (status IN ('pending','succeeded','failed','cancelled','refunded')),
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'RUB' CHECK (currency = upper(currency)),
  confirmation_url text,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ad_order_payments_active_unique_idx
  ON public.ad_order_payments(order_id) WHERE status IN ('pending','succeeded');
CREATE INDEX IF NOT EXISTS ad_order_payments_order_idx
  ON public.ad_order_payments(order_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.ad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.ad_orders(id) ON DELETE CASCADE,
  creative_id uuid NOT NULL REFERENCES public.ad_creatives(id) ON DELETE CASCADE,
  event_type varchar(16) NOT NULL CHECK (event_type IN ('impression','click')),
  event_key varchar(128),
  page_path text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ad_events_dedupe_idx
  ON public.ad_events(order_id,event_type,event_key) WHERE event_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS ad_events_analytics_idx
  ON public.ad_events(order_id,event_type,occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.ad_moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.ad_orders(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action varchar(32) NOT NULL CHECK (action IN ('submitted','approved','rejected','erid_recorded','scheduled','activated','completed','cancelled','refunded')),
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ad_moderation_events_order_idx
  ON public.ad_moderation_events(order_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.ad_erir_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.ad_orders(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  erid varchar(160) NOT NULL,
  impressions bigint NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  clicks bigint NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  revenue_minor bigint NOT NULL DEFAULT 0 CHECK (revenue_minor >= 0),
  status varchar(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','submitted','accepted','rejected')),
  ord_report_id text,
  submitted_at timestamptz,
  accepted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start),
  UNIQUE(order_id,period_start,period_end)
);

CREATE TABLE IF NOT EXISTS public.ad_levy_quarter_estimates (
  quarter_start date PRIMARY KEY,
  revenue_minor bigint NOT NULL DEFAULT 0 CHECK (revenue_minor >= 0),
  rate_bps integer NOT NULL DEFAULT 300 CHECK (rate_bps BETWEEN 0 AND 10000),
  estimated_levy_minor bigint NOT NULL DEFAULT 0 CHECK (estimated_levy_minor >= 0),
  assessed_levy_minor bigint CHECK (assessed_levy_minor IS NULL OR assessed_levy_minor >= 0),
  status varchar(24) NOT NULL DEFAULT 'estimated' CHECK (status IN ('estimated','reconciled','paid')),
  notes text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.enforce_ad_order_insert_integrity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  p public.ad_placements%ROWTYPE;
  a public.ad_advertisers%ROWTYPE;
  c public.ad_campaigns%ROWTYPE;
  cr public.ad_creatives%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.ad_placements WHERE id=NEW.placement_id;
  SELECT * INTO a FROM public.ad_advertisers WHERE id=NEW.advertiser_id;
  SELECT * INTO c FROM public.ad_campaigns WHERE id=NEW.campaign_id;
  SELECT * INTO cr FROM public.ad_creatives WHERE id=NEW.creative_id;
  IF p.id IS NULL OR a.id IS NULL OR c.id IS NULL OR cr.id IS NULL THEN
    RAISE EXCEPTION 'ad order references missing advertising entities' USING ERRCODE='23514';
  END IF;
  IF c.advertiser_id<>NEW.advertiser_id OR cr.campaign_id<>NEW.campaign_id THEN
    RAISE EXCEPTION 'ad order campaign/creative ownership mismatch' USING ERRCODE='23514';
  END IF;
  IF NOT p.is_active OR NEW.duration_days_snapshot<p.min_days OR NEW.duration_days_snapshot>p.max_days THEN
    RAISE EXCEPTION 'ad placement is unavailable for requested duration' USING ERRCODE='23514';
  END IF;
  IF NEW.unit_price_minor<>p.unit_price_minor OR NEW.currency<>p.currency THEN
    RAISE EXCEPTION 'ad order must snapshot current placement price' USING ERRCODE='23514';
  END IF;
  IF NEW.placement_code_snapshot<>p.code OR NEW.placement_name_snapshot<>p.name THEN
    RAISE EXCEPTION 'ad order placement snapshot mismatch' USING ERRCODE='23514';
  END IF;
  IF NEW.advertiser_name_snapshot<>a.display_name OR NEW.advertiser_inn_snapshot<>a.inn THEN
    RAISE EXCEPTION 'ad order advertiser snapshot mismatch' USING ERRCODE='23514';
  END IF;
  IF NEW.title_snapshot<>cr.title OR NEW.body_snapshot<>cr.body OR NEW.destination_url_snapshot<>cr.destination_url OR NEW.image_url_snapshot IS DISTINCT FROM cr.image_url THEN
    RAISE EXCEPTION 'ad order creative snapshot mismatch' USING ERRCODE='23514';
  END IF;
  IF NEW.target_city_snapshot IS DISTINCT FROM c.target_city OR NEW.target_category_slug_snapshot IS DISTINCT FROM c.target_category_slug OR NEW.target_contractor_id IS DISTINCT FROM c.target_contractor_id OR NEW.target_supplier_id IS DISTINCT FROM c.target_supplier_id THEN
    RAISE EXCEPTION 'ad order targeting snapshot mismatch' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ad_orders_insert_integrity ON public.ad_orders;
CREATE TRIGGER ad_orders_insert_integrity BEFORE INSERT ON public.ad_orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_ad_order_insert_integrity();

CREATE OR REPLACE FUNCTION public.enforce_ad_order_update_integrity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  advertiser_status text;
  creative_status text;
  creative_erid text;
  creative_ord text;
  requires_erid boolean;
BEGIN
  IF NEW.advertiser_id IS DISTINCT FROM OLD.advertiser_id OR NEW.campaign_id IS DISTINCT FROM OLD.campaign_id OR NEW.creative_id IS DISTINCT FROM OLD.creative_id OR NEW.placement_id IS DISTINCT FROM OLD.placement_id OR NEW.duration_days_snapshot IS DISTINCT FROM OLD.duration_days_snapshot OR NEW.unit_price_minor IS DISTINCT FROM OLD.unit_price_minor OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor OR NEW.currency IS DISTINCT FROM OLD.currency OR NEW.levy_rate_bps IS DISTINCT FROM OLD.levy_rate_bps OR NEW.levy_estimate_minor IS DISTINCT FROM OLD.levy_estimate_minor OR NEW.placement_code_snapshot IS DISTINCT FROM OLD.placement_code_snapshot OR NEW.placement_name_snapshot IS DISTINCT FROM OLD.placement_name_snapshot OR NEW.advertiser_name_snapshot IS DISTINCT FROM OLD.advertiser_name_snapshot OR NEW.advertiser_inn_snapshot IS DISTINCT FROM OLD.advertiser_inn_snapshot OR NEW.title_snapshot IS DISTINCT FROM OLD.title_snapshot OR NEW.body_snapshot IS DISTINCT FROM OLD.body_snapshot OR NEW.destination_url_snapshot IS DISTINCT FROM OLD.destination_url_snapshot OR NEW.image_url_snapshot IS DISTINCT FROM OLD.image_url_snapshot OR NEW.target_city_snapshot IS DISTINCT FROM OLD.target_city_snapshot OR NEW.target_category_slug_snapshot IS DISTINCT FROM OLD.target_category_slug_snapshot OR NEW.target_contractor_id IS DISTINCT FROM OLD.target_contractor_id OR NEW.target_supplier_id IS DISTINCT FROM OLD.target_supplier_id THEN
    RAISE EXCEPTION 'paid advertising order snapshot is immutable' USING ERRCODE='23514';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status='draft' AND NEW.status IN ('awaiting_payment','cancelled')) OR
      (OLD.status='awaiting_payment' AND NEW.status IN ('paid','cancelled')) OR
      (OLD.status='paid' AND NEW.status IN ('moderation','cancelled','refunded')) OR
      (OLD.status='moderation' AND NEW.status IN ('approved','rejected','cancelled','refunded')) OR
      (OLD.status='rejected' AND NEW.status IN ('moderation','cancelled','refunded')) OR
      (OLD.status='approved' AND NEW.status IN ('scheduled','active','cancelled','refunded')) OR
      (OLD.status='scheduled' AND NEW.status IN ('active','completed','cancelled','refunded')) OR
      (OLD.status='active' AND NEW.status IN ('completed','cancelled','refunded'))
    ) THEN
      RAISE EXCEPTION 'invalid ad order status transition: % -> %',OLD.status,NEW.status USING ERRCODE='23514';
    END IF;

    IF NEW.status='paid' AND NOT EXISTS (SELECT 1 FROM public.ad_order_payments p WHERE p.order_id=NEW.id AND p.status='succeeded') THEN
      RAISE EXCEPTION 'ad order cannot become paid without succeeded payment' USING ERRCODE='23514';
    END IF;

    SELECT a.status,cr.status,cr.erid,cr.ord_provider,p.requires_erid
      INTO advertiser_status,creative_status,creative_erid,creative_ord,requires_erid
    FROM public.ad_advertisers a
    JOIN public.ad_creatives cr ON cr.id=NEW.creative_id
    JOIN public.ad_placements p ON p.id=NEW.placement_id
    WHERE a.id=NEW.advertiser_id;

    IF NEW.status IN ('approved','scheduled','active') AND creative_status<>'approved' THEN
      RAISE EXCEPTION 'ad order cannot be approved or published before creative approval' USING ERRCODE='23514';
    END IF;
    IF NEW.status IN ('scheduled','active') THEN
      IF advertiser_status<>'verified' THEN RAISE EXCEPTION 'advertiser must be verified before publication' USING ERRCODE='23514'; END IF;
      IF requires_erid AND (creative_erid IS NULL OR btrim(creative_erid)='' OR creative_ord IS NULL OR btrim(creative_ord)='') THEN
        RAISE EXCEPTION 'ERID and ORD provider are required before publication' USING ERRCODE='23514';
      END IF;
      IF NEW.scheduled_from IS NULL OR NEW.scheduled_to IS NULL OR NEW.scheduled_to<=NEW.scheduled_from THEN
        RAISE EXCEPTION 'valid advertising schedule is required before publication' USING ERRCODE='23514';
      END IF;
    END IF;
    IF NEW.status='active' AND NOT (NEW.scheduled_from<=now() AND NEW.scheduled_to>now()) THEN
      RAISE EXCEPTION 'ad order can become active only inside its schedule' USING ERRCODE='23514';
    END IF;

    IF NEW.status='paid' THEN NEW.paid_at=COALESCE(NEW.paid_at,now()); END IF;
    IF NEW.status='moderation' THEN NEW.moderation_started_at=COALESCE(NEW.moderation_started_at,now()); END IF;
    IF NEW.status='approved' THEN NEW.approved_at=COALESCE(NEW.approved_at,now()); END IF;
    IF NEW.status='rejected' THEN NEW.rejected_at=now(); END IF;
    IF NEW.status='active' THEN NEW.activated_at=COALESCE(NEW.activated_at,now()); END IF;
    IF NEW.status='completed' THEN NEW.completed_at=COALESCE(NEW.completed_at,now()); END IF;
    IF NEW.status='cancelled' THEN NEW.cancelled_at=COALESCE(NEW.cancelled_at,now()); END IF;
    IF NEW.status='refunded' THEN NEW.refunded_at=COALESCE(NEW.refunded_at,now()); END IF;
  END IF;
  NEW.updated_at=now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ad_orders_update_integrity ON public.ad_orders;
CREATE TRIGGER ad_orders_update_integrity BEFORE UPDATE ON public.ad_orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_ad_order_update_integrity();

CREATE OR REPLACE FUNCTION public.enforce_ad_payment_update_integrity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE q date;
BEGIN
  IF NEW.order_id IS DISTINCT FROM OLD.order_id OR NEW.provider IS DISTINCT FROM OLD.provider OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor OR NEW.currency IS DISTINCT FROM OLD.currency THEN
    RAISE EXCEPTION 'advertising payment financial identity is immutable' USING ERRCODE='23514';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status='pending' AND NEW.status IN ('succeeded','failed','cancelled')) OR
    (OLD.status='succeeded' AND NEW.status='refunded')
  ) THEN
    RAISE EXCEPTION 'invalid advertising payment transition: % -> %',OLD.status,NEW.status USING ERRCODE='23514';
  END IF;
  IF OLD.status<>'succeeded' AND NEW.status='succeeded' THEN
    NEW.paid_at=COALESCE(NEW.paid_at,now());
    q=date_trunc('quarter',NEW.paid_at)::date;
    INSERT INTO public.ad_levy_quarter_estimates(quarter_start,revenue_minor,rate_bps,estimated_levy_minor,updated_at)
    VALUES(q,NEW.amount_minor,300,round(NEW.amount_minor::numeric*300/10000)::bigint,now())
    ON CONFLICT(quarter_start) DO UPDATE SET
      revenue_minor=public.ad_levy_quarter_estimates.revenue_minor+EXCLUDED.revenue_minor,
      estimated_levy_minor=round((public.ad_levy_quarter_estimates.revenue_minor+EXCLUDED.revenue_minor)::numeric*public.ad_levy_quarter_estimates.rate_bps/10000)::bigint,
      updated_at=now();
  ELSIF OLD.status='succeeded' AND NEW.status='refunded' THEN
    q=date_trunc('quarter',COALESCE(OLD.paid_at,OLD.created_at))::date;
    UPDATE public.ad_levy_quarter_estimates SET
      revenue_minor=GREATEST(0,revenue_minor-OLD.amount_minor),
      estimated_levy_minor=round(GREATEST(0,revenue_minor-OLD.amount_minor)::numeric*rate_bps/10000)::bigint,
      updated_at=now()
    WHERE quarter_start=q;
  END IF;
  NEW.updated_at=now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ad_order_payments_update_integrity ON public.ad_order_payments;
CREATE TRIGGER ad_order_payments_update_integrity BEFORE UPDATE ON public.ad_order_payments
FOR EACH ROW EXECUTE FUNCTION public.enforce_ad_payment_update_integrity();

COMMIT;
