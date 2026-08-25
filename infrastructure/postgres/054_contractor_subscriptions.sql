BEGIN;

CREATE TABLE IF NOT EXISTS public.contractor_subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(64) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  duration_months smallint NOT NULL CHECK (duration_months > 0),
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'RUB' CHECK (currency = upper(currency)),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.contractor_subscription_plans(code,name,duration_months,price_minor,currency,is_active,sort_order)
VALUES
  ('month_1','1 месяц',1,149000,'RUB',true,10),
  ('month_3','3 месяца',3,399000,'RUB',true,20),
  ('month_6','6 месяцев',6,699000,'RUB',true,30),
  ('month_12','12 месяцев',12,1199000,'RUB',true,40)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.contractor_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL UNIQUE REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.contractor_subscription_plans(id) ON DELETE SET NULL,
  status varchar(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active','grace_period','expired','cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  grace_ends_at timestamptz,
  auto_renew boolean NOT NULL DEFAULT false,
  provider_payment_method_id text,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (current_period_end >= current_period_start),
  CHECK (grace_ends_at IS NULL OR grace_ends_at >= current_period_end)
);

CREATE INDEX IF NOT EXISTS contractor_subscriptions_period_end_idx
  ON public.contractor_subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS contractor_subscriptions_status_idx
  ON public.contractor_subscriptions(status,current_period_end);

CREATE TABLE IF NOT EXISTS public.contractor_subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.contractor_subscription_plans(id) ON DELETE SET NULL,
  provider varchar(32) NOT NULL CHECK (provider IN ('yookassa','admin')),
  provider_payment_id text UNIQUE,
  idempotency_key uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status varchar(32) NOT NULL CHECK (status IN ('pending','succeeded','failed','cancelled','refunded')),
  payment_type varchar(32) NOT NULL CHECK (payment_type IN ('initial','renewal','admin_grant','adjustment','refund')),
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'RUB',
  plan_code_snapshot varchar(64) NOT NULL,
  plan_name_snapshot varchar(160) NOT NULL,
  duration_months_snapshot smallint NOT NULL CHECK (duration_months_snapshot > 0),
  auto_renew_requested boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contractor_subscription_payments_contractor_idx
  ON public.contractor_subscription_payments(contractor_id,created_at DESC);
CREATE INDEX IF NOT EXISTS contractor_subscription_payments_status_idx
  ON public.contractor_subscription_payments(status,created_at DESC);

CREATE OR REPLACE FUNCTION public.contractor_has_marketplace_access(target_contractor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contractor_subscriptions cs
    WHERE cs.contractor_id = target_contractor_id
      AND (
        (cs.status = 'active' AND cs.current_period_end > now())
        OR (cs.status = 'grace_period' AND coalesce(cs.grace_ends_at, cs.current_period_end) > now())
      )
  );
$$;

COMMIT;
