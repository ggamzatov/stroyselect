BEGIN;

CREATE INDEX IF NOT EXISTS material_supplier_locations_supplier_active_idx
  ON public.material_supplier_locations(supplier_id,is_active,name);

CREATE TABLE IF NOT EXISTS public.material_delivery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.material_orders(id) ON DELETE CASCADE,
  supplier_location_id uuid NOT NULL REFERENCES public.material_supplier_locations(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  provider varchar(32) NOT NULL DEFAULT 'yandex' CHECK (provider='yandex'),
  status varchar(32) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','offers_ready','claim_created','accepted','in_delivery','delivered','cancelled','failed'
  )),
  selected_offer_id uuid,
  pickup_name_snapshot varchar(200) NOT NULL,
  pickup_address_snapshot text NOT NULL,
  pickup_latitude numeric(10,7) NOT NULL CHECK (pickup_latitude BETWEEN -90 AND 90),
  pickup_longitude numeric(10,7) NOT NULL CHECK (pickup_longitude BETWEEN -180 AND 180),
  pickup_contact_name varchar(200) NOT NULL,
  pickup_contact_phone varchar(40) NOT NULL,
  pickup_contact_email varchar(320),
  destination_address text NOT NULL,
  destination_latitude numeric(10,7) NOT NULL CHECK (destination_latitude BETWEEN -90 AND 90),
  destination_longitude numeric(10,7) NOT NULL CHECK (destination_longitude BETWEEN -180 AND 180),
  recipient_name varchar(200) NOT NULL,
  recipient_phone varchar(40) NOT NULL,
  recipient_email varchar(320),
  shipment_weight_kg numeric(12,3) NOT NULL CHECK (shipment_weight_kg > 0),
  shipment_length_m numeric(10,3) NOT NULL CHECK (shipment_length_m > 0),
  shipment_width_m numeric(10,3) NOT NULL CHECK (shipment_width_m > 0),
  shipment_height_m numeric(10,3) NOT NULL CHECK (shipment_height_m > 0),
  cargo_type varchar(16) NOT NULL CHECK (cargo_type IN ('van','lcv_m','lcv_l','lcv_xl')),
  cargo_loaders smallint NOT NULL DEFAULT 0 CHECK (cargo_loaders IN (0,1,2)),
  provider_claim_id text UNIQUE,
  provider_request_id uuid UNIQUE,
  provider_status varchar(80),
  provider_version bigint,
  provider_error text,
  claim_created_at timestamptz,
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS material_delivery_requests_one_active_idx
  ON public.material_delivery_requests(order_id)
  WHERE status NOT IN ('cancelled','failed');
CREATE INDEX IF NOT EXISTS material_delivery_requests_order_idx
  ON public.material_delivery_requests(order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS material_delivery_requests_status_idx
  ON public.material_delivery_requests(status,updated_at DESC);
CREATE INDEX IF NOT EXISTS material_delivery_requests_claim_idx
  ON public.material_delivery_requests(provider_claim_id) WHERE provider_claim_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.material_delivery_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_request_id uuid NOT NULL REFERENCES public.material_delivery_requests(id) ON DELETE CASCADE,
  provider varchar(32) NOT NULL DEFAULT 'yandex' CHECK (provider='yandex'),
  taxi_class varchar(40) NOT NULL,
  description text,
  total_price_minor bigint NOT NULL CHECK (total_price_minor >= 0),
  total_price_with_vat_minor bigint NOT NULL CHECK (total_price_with_vat_minor >= 0),
  base_price_minor bigint NOT NULL CHECK (base_price_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'RUB' CHECK (currency=upper(currency)),
  pickup_from timestamptz,
  pickup_to timestamptz,
  delivery_from timestamptz,
  delivery_to timestamptz,
  provider_payload text NOT NULL,
  expires_at timestamptz NOT NULL,
  selected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS material_delivery_offers_request_idx
  ON public.material_delivery_offers(delivery_request_id,total_price_with_vat_minor,expires_at);

ALTER TABLE public.material_delivery_requests
  DROP CONSTRAINT IF EXISTS material_delivery_requests_selected_offer_fk;
ALTER TABLE public.material_delivery_requests
  ADD CONSTRAINT material_delivery_requests_selected_offer_fk
  FOREIGN KEY(selected_offer_id) REFERENCES public.material_delivery_offers(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.enforce_material_delivery_request_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  order_status text;
  order_supplier uuid;
  location_supplier uuid;
  location_active boolean;
BEGIN
  SELECT mo.status,mo.supplier_id INTO order_status,order_supplier
  FROM public.material_orders mo WHERE mo.id=NEW.order_id;
  SELECT msl.supplier_id,msl.is_active INTO location_supplier,location_active
  FROM public.material_supplier_locations msl
  WHERE msl.id=NEW.supplier_location_id;

  IF order_status IS NULL THEN
    RAISE EXCEPTION 'material delivery order not found' USING ERRCODE='23503';
  END IF;
  IF TG_OP='INSERT' AND order_status NOT IN ('paid','supplier_confirmed','delivery_pending','in_delivery','delivered') THEN
    RAISE EXCEPTION 'material delivery can be prepared only after material order payment'
      USING ERRCODE='23514';
  END IF;
  IF location_supplier IS NULL OR location_supplier IS DISTINCT FROM order_supplier THEN
    RAISE EXCEPTION 'pickup location must belong to the material order supplier'
      USING ERRCODE='23514';
  END IF;
  IF TG_OP='INSERT' AND location_active IS NOT TRUE THEN
    RAISE EXCEPTION 'pickup location must be active when delivery is created'
      USING ERRCODE='23514';
  END IF;

  IF TG_OP='UPDATE' THEN
    IF NEW.order_id IS DISTINCT FROM OLD.order_id
       OR NEW.supplier_location_id IS DISTINCT FROM OLD.supplier_location_id
       OR NEW.provider IS DISTINCT FROM OLD.provider
       OR NEW.pickup_name_snapshot IS DISTINCT FROM OLD.pickup_name_snapshot
       OR NEW.pickup_address_snapshot IS DISTINCT FROM OLD.pickup_address_snapshot
       OR NEW.pickup_latitude IS DISTINCT FROM OLD.pickup_latitude
       OR NEW.pickup_longitude IS DISTINCT FROM OLD.pickup_longitude
       OR NEW.pickup_contact_name IS DISTINCT FROM OLD.pickup_contact_name
       OR NEW.pickup_contact_phone IS DISTINCT FROM OLD.pickup_contact_phone
       OR NEW.pickup_contact_email IS DISTINCT FROM OLD.pickup_contact_email
       OR NEW.destination_address IS DISTINCT FROM OLD.destination_address
       OR NEW.destination_latitude IS DISTINCT FROM OLD.destination_latitude
       OR NEW.destination_longitude IS DISTINCT FROM OLD.destination_longitude
       OR NEW.recipient_name IS DISTINCT FROM OLD.recipient_name
       OR NEW.recipient_phone IS DISTINCT FROM OLD.recipient_phone
       OR NEW.recipient_email IS DISTINCT FROM OLD.recipient_email
       OR NEW.shipment_weight_kg IS DISTINCT FROM OLD.shipment_weight_kg
       OR NEW.shipment_length_m IS DISTINCT FROM OLD.shipment_length_m
       OR NEW.shipment_width_m IS DISTINCT FROM OLD.shipment_width_m
       OR NEW.shipment_height_m IS DISTINCT FROM OLD.shipment_height_m
       OR NEW.cargo_type IS DISTINCT FROM OLD.cargo_type
       OR NEW.cargo_loaders IS DISTINCT FROM OLD.cargo_loaders THEN
      RAISE EXCEPTION 'delivery route and cargo snapshot is immutable'
        USING ERRCODE='23514';
    END IF;

    IF OLD.selected_offer_id IS NOT NULL AND NEW.selected_offer_id IS DISTINCT FROM OLD.selected_offer_id THEN
      RAISE EXCEPTION 'selected delivery offer is immutable once chosen' USING ERRCODE='23514';
    END IF;
    IF OLD.provider_request_id IS NOT NULL AND NEW.provider_request_id IS DISTINCT FROM OLD.provider_request_id THEN
      RAISE EXCEPTION 'provider request identity is immutable' USING ERRCODE='23514';
    END IF;
    IF OLD.provider_claim_id IS NOT NULL AND NEW.provider_claim_id IS DISTINCT FROM OLD.provider_claim_id THEN
      RAISE EXCEPTION 'provider claim identity is immutable' USING ERRCODE='23514';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
      (OLD.status='draft' AND NEW.status IN ('offers_ready','cancelled','failed'))
      OR (OLD.status='offers_ready' AND NEW.status IN ('claim_created','cancelled','failed'))
      OR (OLD.status='claim_created' AND NEW.status IN ('accepted','in_delivery','delivered','cancelled','failed'))
      OR (OLD.status='accepted' AND NEW.status IN ('in_delivery','delivered','cancelled','failed'))
      OR (OLD.status='in_delivery' AND NEW.status IN ('delivered','cancelled','failed'))
    ) THEN
      RAISE EXCEPTION 'invalid material delivery status transition: % -> %',OLD.status,NEW.status
        USING ERRCODE='23514';
    END IF;

    IF NEW.selected_offer_id IS NOT NULL AND NEW.selected_offer_id IS DISTINCT FROM OLD.selected_offer_id
       AND NOT EXISTS (
         SELECT 1 FROM public.material_delivery_offers mdo
         WHERE mdo.id=NEW.selected_offer_id
           AND mdo.delivery_request_id=NEW.id
           AND mdo.expires_at>now()
       ) THEN
      RAISE EXCEPTION 'selected delivery offer is invalid or expired'
        USING ERRCODE='23514';
    END IF;
  END IF;

  IF NEW.status IN ('claim_created','accepted','in_delivery','delivered')
     AND (NEW.selected_offer_id IS NULL OR NEW.provider_claim_id IS NULL) THEN
    RAISE EXCEPTION 'provider claim and selected offer are required for active delivery status'
      USING ERRCODE='23514';
  END IF;

  NEW.updated_at=now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS material_delivery_requests_integrity ON public.material_delivery_requests;
CREATE TRIGGER material_delivery_requests_integrity
BEFORE INSERT OR UPDATE ON public.material_delivery_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_material_delivery_request_integrity();

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
      OR (OLD.status='paid' AND NEW.status IN ('supplier_confirmed','delivery_pending','refunded'))
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

COMMIT;
