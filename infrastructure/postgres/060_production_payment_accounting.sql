BEGIN;

CREATE TABLE IF NOT EXISTS public.material_supplier_payout_profiles (
  supplier_id uuid PRIMARY KEY REFERENCES public.material_suppliers(id) ON DELETE CASCADE,
  provider varchar(32) NOT NULL DEFAULT 'bank_manual' CHECK (provider IN ('bank_manual')),
  destination_label text,
  verified_at timestamptz,
  disabled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.material_supplier_payout_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.finance_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type varchar(32) NOT NULL CHECK (source_type IN ('project_payment','material_order')),
  project_payment_intent_id uuid REFERENCES public.project_payment_intents(id) ON DELETE RESTRICT,
  material_order_id uuid REFERENCES public.material_orders(id) ON DELETE RESTRICT,
  provider varchar(32) NOT NULL CHECK (provider IN ('yookassa','admin')),
  provider_refund_id text UNIQUE,
  idempotency_key uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status varchar(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed','cancelled')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency varchar(3) NOT NULL DEFAULT 'RUB' CHECK (currency='RUB'),
  reason text NOT NULL,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  succeeded_at timestamptz,
  CHECK (
    (source_type='project_payment' AND project_payment_intent_id IS NOT NULL AND material_order_id IS NULL)
    OR (source_type='material_order' AND material_order_id IS NOT NULL AND project_payment_intent_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS finance_refunds_project_active_unique_idx
  ON public.finance_refunds(project_payment_intent_id)
  WHERE project_payment_intent_id IS NOT NULL AND status IN ('pending','succeeded');
CREATE UNIQUE INDEX IF NOT EXISTS finance_refunds_material_active_unique_idx
  ON public.finance_refunds(material_order_id)
  WHERE material_order_id IS NOT NULL AND status IN ('pending','succeeded');
CREATE INDEX IF NOT EXISTS finance_refunds_status_idx ON public.finance_refunds(status,created_at DESC);

CREATE TABLE IF NOT EXISTS public.finance_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type varchar(32) NOT NULL CHECK (source_type IN ('project_payment','material_order')),
  project_payment_intent_id uuid REFERENCES public.project_payment_intents(id) ON DELETE RESTRICT,
  material_order_id uuid REFERENCES public.material_orders(id) ON DELETE RESTRICT,
  beneficiary_type varchar(24) NOT NULL CHECK (beneficiary_type IN ('contractor','supplier')),
  contractor_id uuid REFERENCES public.contractor_companies(id) ON DELETE RESTRICT,
  supplier_id uuid REFERENCES public.material_suppliers(id) ON DELETE RESTRICT,
  provider varchar(32) NOT NULL CHECK (provider IN ('yookassa','bank_manual')),
  provider_payout_id text UNIQUE,
  idempotency_key uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status varchar(24) NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','processing','succeeded','failed','cancelled','blocked')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency varchar(3) NOT NULL DEFAULT 'RUB' CHECK (currency='RUB'),
  destination_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  blocked_reason text,
  failure_reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  succeeded_at timestamptz,
  CHECK (
    (source_type='project_payment' AND project_payment_intent_id IS NOT NULL AND material_order_id IS NULL AND beneficiary_type='contractor' AND contractor_id IS NOT NULL AND supplier_id IS NULL)
    OR (source_type='material_order' AND material_order_id IS NOT NULL AND project_payment_intent_id IS NULL AND beneficiary_type='supplier' AND supplier_id IS NOT NULL AND contractor_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS finance_payouts_project_active_unique_idx
  ON public.finance_payouts(project_payment_intent_id)
  WHERE project_payment_intent_id IS NOT NULL AND status IN ('ready','processing','succeeded');
CREATE UNIQUE INDEX IF NOT EXISTS finance_payouts_material_active_unique_idx
  ON public.finance_payouts(material_order_id)
  WHERE material_order_id IS NOT NULL AND status IN ('ready','processing','succeeded');
CREATE INDEX IF NOT EXISTS finance_payouts_status_idx ON public.finance_payouts(status,created_at DESC);

CREATE TABLE IF NOT EXISTS public.finance_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type varchar(32) NOT NULL CHECK (source_type IN ('project_payment','material_order')),
  project_payment_intent_id uuid REFERENCES public.project_payment_intents(id) ON DELETE RESTRICT,
  material_order_id uuid REFERENCES public.material_orders(id) ON DELETE RESTRICT,
  receipt_kind varchar(16) NOT NULL CHECK (receipt_kind IN ('payment','refund')),
  provider varchar(32) NOT NULL DEFAULT 'yookassa' CHECK (provider IN ('yookassa','manual')),
  provider_receipt_id text UNIQUE,
  status varchar(32) NOT NULL DEFAULT 'configuration_required' CHECK (status IN ('configuration_required','ready','submitted','succeeded','failed','cancelled')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency varchar(3) NOT NULL DEFAULT 'RUB' CHECK (currency='RUB'),
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (
    (source_type='project_payment' AND project_payment_intent_id IS NOT NULL AND material_order_id IS NULL)
    OR (source_type='material_order' AND material_order_id IS NOT NULL AND project_payment_intent_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS finance_receipts_project_unique_idx
  ON public.finance_receipts(source_type,project_payment_intent_id,receipt_kind)
  WHERE project_payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS finance_receipts_material_unique_idx
  ON public.finance_receipts(source_type,material_order_id,receipt_kind)
  WHERE material_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS finance_receipts_status_idx ON public.finance_receipts(status,created_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_finance_refund_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  source_status text;
  source_amount_minor bigint;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.source_type IS DISTINCT FROM OLD.source_type
       OR NEW.project_payment_intent_id IS DISTINCT FROM OLD.project_payment_intent_id
       OR NEW.material_order_id IS DISTINCT FROM OLD.material_order_id
       OR NEW.provider IS DISTINCT FROM OLD.provider
       OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
       OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.reason IS DISTINCT FROM OLD.reason THEN
      RAISE EXCEPTION 'finance refund identity is immutable' USING ERRCODE='23514';
    END IF;
    IF OLD.status IN ('succeeded','cancelled') AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'terminal refund cannot change status' USING ERRCODE='23514';
    END IF;
    IF OLD.status='pending' AND NEW.status NOT IN ('pending','succeeded','failed','cancelled') THEN
      RAISE EXCEPTION 'invalid refund status transition' USING ERRCODE='23514';
    END IF;
    NEW.updated_at=now();
    IF NEW.status='succeeded' AND OLD.status IS DISTINCT FROM 'succeeded' THEN NEW.succeeded_at=COALESCE(NEW.succeeded_at,now()); END IF;
    RETURN NEW;
  END IF;

  IF NEW.source_type='project_payment' THEN
    SELECT ppi.status,round(ppi.amount*100)::bigint
      INTO source_status,source_amount_minor
      FROM public.project_payment_intents ppi
      WHERE ppi.id=NEW.project_payment_intent_id
      FOR UPDATE;
    IF source_status IS NULL OR source_status NOT IN ('funded','stage_submitted','release_ready','disputed') THEN
      RAISE EXCEPTION 'project payment is not refundable in current state' USING ERRCODE='23514';
    END IF;
    IF EXISTS(SELECT 1 FROM public.finance_payouts fp WHERE fp.project_payment_intent_id=NEW.project_payment_intent_id AND fp.status IN ('processing','succeeded')) THEN
      RAISE EXCEPTION 'refund is blocked after payout processing started' USING ERRCODE='23514';
    END IF;
  ELSE
    SELECT mo.status,mo.goods_subtotal_minor
      INTO source_status,source_amount_minor
      FROM public.material_orders mo
      WHERE mo.id=NEW.material_order_id
      FOR UPDATE;
    IF source_status IS NULL OR source_status NOT IN ('paid','supplier_confirmed') THEN
      RAISE EXCEPTION 'material order is not refundable before/after current delivery state' USING ERRCODE='23514';
    END IF;
    IF EXISTS(SELECT 1 FROM public.finance_payouts fp WHERE fp.material_order_id=NEW.material_order_id AND fp.status IN ('processing','succeeded')) THEN
      RAISE EXCEPTION 'material refund is blocked after supplier payout processing started' USING ERRCODE='23514';
    END IF;
  END IF;

  IF NEW.amount_minor IS DISTINCT FROM source_amount_minor THEN
    RAISE EXCEPTION 'initial production refund must be full source amount' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_refunds_integrity ON public.finance_refunds;
CREATE TRIGGER finance_refunds_integrity
BEFORE INSERT OR UPDATE ON public.finance_refunds
FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_refund_integrity();

CREATE OR REPLACE FUNCTION public.enforce_finance_payout_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  source_status text;
  expected_amount bigint;
  expected_beneficiary uuid;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.source_type IS DISTINCT FROM OLD.source_type
       OR NEW.project_payment_intent_id IS DISTINCT FROM OLD.project_payment_intent_id
       OR NEW.material_order_id IS DISTINCT FROM OLD.material_order_id
       OR NEW.beneficiary_type IS DISTINCT FROM OLD.beneficiary_type
       OR NEW.contractor_id IS DISTINCT FROM OLD.contractor_id
       OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
       OR NEW.provider IS DISTINCT FROM OLD.provider
       OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
       OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.destination_snapshot IS DISTINCT FROM OLD.destination_snapshot THEN
      RAISE EXCEPTION 'finance payout identity is immutable' USING ERRCODE='23514';
    END IF;
    IF OLD.status IN ('succeeded','cancelled') AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'terminal payout cannot change status' USING ERRCODE='23514';
    END IF;
    IF OLD.status='ready' AND NEW.status NOT IN ('ready','processing','succeeded','failed','cancelled','blocked') THEN
      RAISE EXCEPTION 'invalid payout status transition' USING ERRCODE='23514';
    END IF;
    IF OLD.status='processing' AND NEW.status NOT IN ('processing','succeeded','failed','cancelled') THEN
      RAISE EXCEPTION 'invalid payout processing transition' USING ERRCODE='23514';
    END IF;
    NEW.updated_at=now();
    IF NEW.status='succeeded' AND OLD.status IS DISTINCT FROM 'succeeded' THEN NEW.succeeded_at=COALESCE(NEW.succeeded_at,now()); END IF;
    RETURN NEW;
  END IF;

  IF NEW.source_type='project_payment' THEN
    SELECT ppi.status,round(COALESCE(ppi.payout_amount,ppi.amount)*100)::bigint,p.selected_contractor_id
      INTO source_status,expected_amount,expected_beneficiary
      FROM public.project_payment_intents ppi
      JOIN public.projects p ON p.id=ppi.project_id
      WHERE ppi.id=NEW.project_payment_intent_id
      FOR UPDATE OF ppi;
    IF source_status IS DISTINCT FROM 'release_ready' THEN
      RAISE EXCEPTION 'contractor payout requires release_ready project payment' USING ERRCODE='23514';
    END IF;
    IF NEW.contractor_id IS DISTINCT FROM expected_beneficiary THEN
      RAISE EXCEPTION 'contractor payout beneficiary mismatch' USING ERRCODE='23514';
    END IF;
    IF EXISTS(SELECT 1 FROM public.finance_refunds fr WHERE fr.project_payment_intent_id=NEW.project_payment_intent_id AND fr.status IN ('pending','succeeded')) THEN
      RAISE EXCEPTION 'payout is blocked by refund' USING ERRCODE='23514';
    END IF;
  ELSE
    SELECT mo.status,mo.supplier_net_minor,mo.supplier_id
      INTO source_status,expected_amount,expected_beneficiary
      FROM public.material_orders mo
      WHERE mo.id=NEW.material_order_id
      FOR UPDATE;
    IF source_status IS DISTINCT FROM 'completed' THEN
      RAISE EXCEPTION 'supplier payout requires completed material order' USING ERRCODE='23514';
    END IF;
    IF NEW.supplier_id IS DISTINCT FROM expected_beneficiary THEN
      RAISE EXCEPTION 'supplier payout beneficiary mismatch' USING ERRCODE='23514';
    END IF;
    IF EXISTS(SELECT 1 FROM public.finance_refunds fr WHERE fr.material_order_id=NEW.material_order_id AND fr.status IN ('pending','succeeded')) THEN
      RAISE EXCEPTION 'supplier payout is blocked by refund' USING ERRCODE='23514';
    END IF;
  END IF;

  IF NEW.amount_minor IS DISTINCT FROM expected_amount THEN
    RAISE EXCEPTION 'payout amount does not match immutable source net amount' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_payouts_integrity ON public.finance_payouts;
CREATE TRIGGER finance_payouts_integrity
BEFORE INSERT OR UPDATE ON public.finance_payouts
FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_payout_integrity();

CREATE OR REPLACE FUNCTION public.enforce_finance_receipt_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source_type IS DISTINCT FROM OLD.source_type
     OR NEW.project_payment_intent_id IS DISTINCT FROM OLD.project_payment_intent_id
     OR NEW.material_order_id IS DISTINCT FROM OLD.material_order_id
     OR NEW.receipt_kind IS DISTINCT FROM OLD.receipt_kind
     OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.snapshot IS DISTINCT FROM OLD.snapshot THEN
    RAISE EXCEPTION 'finance receipt source snapshot is immutable' USING ERRCODE='23514';
  END IF;
  NEW.updated_at=now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_receipts_immutability ON public.finance_receipts;
CREATE TRIGGER finance_receipts_immutability
BEFORE UPDATE ON public.finance_receipts
FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_receipt_immutability();

INSERT INTO public.release_checklist(key,label,required)
VALUES
 ('yookassa_safe_deal_contract','Подтверждён production-договор ЮKassa для Безопасной сделки',true),
 ('yookassa_payouts_contract','Подтверждены production-выплаты и лимиты получателей ЮKassa',true),
 ('finance_reconciliation','Настроена ежедневная сверка платежей, возвратов и вознаграждений с реестрами провайдера',true)
ON CONFLICT(key) DO NOTHING;

COMMIT;
