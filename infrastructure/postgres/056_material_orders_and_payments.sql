BEGIN;

CREATE TABLE IF NOT EXISTS public.material_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  list_id uuid NOT NULL UNIQUE REFERENCES public.project_material_lists(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL UNIQUE REFERENCES public.material_procurement_quotes(id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED,
  supplier_id uuid NOT NULL REFERENCES public.material_suppliers(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status varchar(32) NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN (
    'awaiting_payment','paid','supplier_confirmed','delivery_pending','in_delivery','delivered','completed','cancelled','refunded'
  )),
  goods_subtotal_minor bigint NOT NULL CHECK (goods_subtotal_minor >= 0),
  platform_commission_bps integer NOT NULL CHECK (platform_commission_bps BETWEEN 0 AND 10000),
  platform_commission_minor bigint NOT NULL CHECK (platform_commission_minor >= 0),
  supplier_net_minor bigint NOT NULL CHECK (supplier_net_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'RUB' CHECK (currency = upper(currency)),
  supplier_name_snapshot varchar(200) NOT NULL,
  supplier_legal_name_snapshot varchar(240),
  supplier_inn_snapshot varchar(12),
  ordered_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  supplier_confirmed_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (platform_commission_minor + supplier_net_minor = goods_subtotal_minor)
);

CREATE INDEX IF NOT EXISTS material_orders_project_idx
  ON public.material_orders(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS material_orders_supplier_idx
  ON public.material_orders(supplier_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS material_orders_status_idx
  ON public.material_orders(status,created_at DESC);

CREATE TABLE IF NOT EXISTS public.material_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.material_orders(id) ON DELETE CASCADE,
  quote_item_id uuid NOT NULL REFERENCES public.material_procurement_quote_items(id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED,
  product_id uuid REFERENCES public.material_products(id) ON DELETE SET NULL,
  supplier_sku_snapshot varchar(160),
  product_name_snapshot varchar(500) NOT NULL,
  quantity numeric(16,3) NOT NULL CHECK (quantity > 0),
  unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
  line_total_minor bigint NOT NULL CHECK (line_total_minor >= 0),
  lead_time_days integer NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id,quote_item_id)
);

CREATE INDEX IF NOT EXISTS material_order_items_order_idx
  ON public.material_order_items(order_id,created_at);

CREATE TABLE IF NOT EXISTS public.material_order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.material_orders(id) ON DELETE CASCADE,
  payer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  provider varchar(32) NOT NULL CHECK (provider IN ('yookassa','admin')),
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

CREATE UNIQUE INDEX IF NOT EXISTS material_order_payments_active_unique_idx
  ON public.material_order_payments(order_id)
  WHERE status IN ('pending','succeeded');
CREATE INDEX IF NOT EXISTS material_order_payments_order_idx
  ON public.material_order_payments(order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS material_order_payments_status_idx
  ON public.material_order_payments(status,created_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_material_order_insert_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  quote_subtotal bigint;
  quote_missing integer;
  quote_status text;
  quote_valid_until timestamptz;
  selected_quote uuid;
  list_status text;
  quote_supplier uuid;
  supplier_commission integer;
BEGIN
  SELECT
    q.goods_subtotal_minor,
    q.missing_item_count,
    q.status,
    q.valid_until,
    l.selected_quote_id,
    l.status,
    q.supplier_id,
    s.commission_bps
  INTO
    quote_subtotal,
    quote_missing,
    quote_status,
    quote_valid_until,
    selected_quote,
    list_status,
    quote_supplier,
    supplier_commission
  FROM public.project_material_lists l
  JOIN public.material_procurement_requests r ON r.list_id=l.id
  JOIN public.material_procurement_quotes q ON q.request_id=r.id
  JOIN public.material_suppliers s ON s.id=q.supplier_id
  WHERE l.id=NEW.list_id
    AND l.project_id=NEW.project_id
    AND q.id=NEW.quote_id
  LIMIT 1;

  IF quote_subtotal IS NULL THEN
    RAISE EXCEPTION 'material order must reference a quote from the same project material list'
      USING ERRCODE='23514';
  END IF;
  IF list_status <> 'selected' OR selected_quote IS DISTINCT FROM NEW.quote_id OR quote_status <> 'selected' THEN
    RAISE EXCEPTION 'material order requires the selected procurement quote'
      USING ERRCODE='23514';
  END IF;
  IF quote_missing <> 0 THEN
    RAISE EXCEPTION 'material order cannot be created from an incomplete quote'
      USING ERRCODE='23514';
  END IF;
  IF quote_valid_until IS NOT NULL AND quote_valid_until <= now() THEN
    RAISE EXCEPTION 'selected material quote has expired'
      USING ERRCODE='23514';
  END IF;
  IF quote_supplier IS DISTINCT FROM NEW.supplier_id THEN
    RAISE EXCEPTION 'material order supplier does not match selected quote'
      USING ERRCODE='23514';
  END IF;
  IF NEW.goods_subtotal_minor <> quote_subtotal THEN
    RAISE EXCEPTION 'material order subtotal must equal selected quote snapshot'
      USING ERRCODE='23514';
  END IF;
  IF NEW.platform_commission_bps <> supplier_commission THEN
    RAISE EXCEPTION 'material order commission must snapshot current supplier commission'
      USING ERRCODE='23514';
  END IF;
  IF NEW.platform_commission_minor <> round(NEW.goods_subtotal_minor::numeric * NEW.platform_commission_bps / 10000)::bigint THEN
    RAISE EXCEPTION 'material order commission amount is inconsistent'
      USING ERRCODE='23514';
  END IF;
  IF NEW.supplier_net_minor <> NEW.goods_subtotal_minor - NEW.platform_commission_minor THEN
    RAISE EXCEPTION 'material order supplier net amount is inconsistent'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS material_orders_insert_integrity ON public.material_orders;
CREATE TRIGGER material_orders_insert_integrity
BEFORE INSERT ON public.material_orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_material_order_insert_integrity();

CREATE OR REPLACE FUNCTION public.enforce_material_order_update_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.list_id IS DISTINCT FROM OLD.list_id
     OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
     OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
     OR NEW.goods_subtotal_minor IS DISTINCT FROM OLD.goods_subtotal_minor
     OR NEW.platform_commission_bps IS DISTINCT FROM OLD.platform_commission_bps
     OR NEW.platform_commission_minor IS DISTINCT FROM OLD.platform_commission_minor
     OR NEW.supplier_net_minor IS DISTINCT FROM OLD.supplier_net_minor
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.supplier_name_snapshot IS DISTINCT FROM OLD.supplier_name_snapshot
     OR NEW.supplier_legal_name_snapshot IS DISTINCT FROM OLD.supplier_legal_name_snapshot
     OR NEW.supplier_inn_snapshot IS DISTINCT FROM OLD.supplier_inn_snapshot
     OR NEW.ordered_at IS DISTINCT FROM OLD.ordered_at THEN
    RAISE EXCEPTION 'material order financial snapshot is immutable'
      USING ERRCODE='23514';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status='awaiting_payment' AND NEW.status IN ('paid','cancelled'))
      OR (OLD.status='paid' AND NEW.status IN ('supplier_confirmed','refunded'))
      OR (OLD.status='supplier_confirmed' AND NEW.status IN ('delivery_pending','refunded'))
      OR (OLD.status='delivery_pending' AND NEW.status IN ('in_delivery','cancelled','refunded'))
      OR (OLD.status='in_delivery' AND NEW.status IN ('delivered','refunded'))
      OR (OLD.status='delivered' AND NEW.status IN ('completed','refunded'))
    ) THEN
      RAISE EXCEPTION 'invalid material order status transition: % -> %', OLD.status, NEW.status
        USING ERRCODE='23514';
    END IF;

    IF NEW.status='paid' AND NOT EXISTS (
      SELECT 1 FROM public.material_order_payments mop
      WHERE mop.order_id=NEW.id AND mop.status='succeeded'
    ) THEN
      RAISE EXCEPTION 'material order cannot be paid without a succeeded payment'
        USING ERRCODE='23514';
    END IF;

    IF NEW.status='paid' THEN NEW.paid_at=COALESCE(NEW.paid_at,now()); END IF;
    IF NEW.status='supplier_confirmed' THEN NEW.supplier_confirmed_at=COALESCE(NEW.supplier_confirmed_at,now()); END IF;
    IF NEW.status='delivered' THEN NEW.delivered_at=COALESCE(NEW.delivered_at,now()); END IF;
    IF NEW.status='completed' THEN NEW.completed_at=COALESCE(NEW.completed_at,now()); END IF;
    IF NEW.status='cancelled' THEN NEW.cancelled_at=COALESCE(NEW.cancelled_at,now()); END IF;
  END IF;

  NEW.updated_at=now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS material_orders_update_integrity ON public.material_orders;
CREATE TRIGGER material_orders_update_integrity
BEFORE UPDATE ON public.material_orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_material_order_update_integrity();

CREATE OR REPLACE FUNCTION public.prevent_material_order_item_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'material order item snapshot is immutable'
    USING ERRCODE='23514';
END;
$$;

DROP TRIGGER IF EXISTS material_order_items_immutable ON public.material_order_items;
CREATE TRIGGER material_order_items_immutable
BEFORE UPDATE ON public.material_order_items
FOR EACH ROW EXECUTE FUNCTION public.prevent_material_order_item_rewrite();

CREATE OR REPLACE FUNCTION public.enforce_material_payment_update_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.provider IS DISTINCT FROM OLD.provider
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
     OR NEW.currency IS DISTINCT FROM OLD.currency THEN
    RAISE EXCEPTION 'material payment financial identity is immutable'
      USING ERRCODE='23514';
  END IF;
  NEW.updated_at=now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS material_order_payments_update_integrity ON public.material_order_payments;
CREATE TRIGGER material_order_payments_update_integrity
BEFORE UPDATE ON public.material_order_payments
FOR EACH ROW EXECUTE FUNCTION public.enforce_material_payment_update_integrity();

COMMIT;
