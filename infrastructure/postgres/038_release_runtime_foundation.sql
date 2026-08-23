BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('yookassa')),
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  object_type text,
  object_id text,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_error text,
  UNIQUE(provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS payment_provider_events_unprocessed_idx
  ON public.payment_provider_events(provider, received_at)
  WHERE processed_at IS NULL;

ALTER TABLE public.project_payment_intents
  ADD COLUMN IF NOT EXISTS confirmation_url text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_refund_id text,
  ADD COLUMN IF NOT EXISTS last_provider_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.project_payment_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id uuid NOT NULL REFERENCES public.project_payment_intents(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  source text NOT NULL CHECK (source IN ('application','database','yookassa','admin','maintenance')),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_payment_transitions_intent_idx
  ON public.project_payment_transitions(payment_intent_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.audit_project_payment_intent_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.project_payment_transitions(payment_intent_id,from_status,to_status,source,metadata)
    VALUES(NEW.id,OLD.status,NEW.status,
      CASE WHEN current_setting('stroyselect.payment_source',true) IN ('application','database','yookassa','admin','maintenance')
           THEN current_setting('stroyselect.payment_source',true)
           ELSE 'database' END,
      jsonb_build_object('provider',NEW.provider,'provider_status',NEW.provider_status));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_project_payment_intent_transition ON public.project_payment_intents;
CREATE TRIGGER trg_audit_project_payment_intent_transition
AFTER UPDATE OF status ON public.project_payment_intents
FOR EACH ROW EXECUTE FUNCTION public.audit_project_payment_intent_transition();

CREATE TABLE IF NOT EXISTS public.notification_delivery_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email')),
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  provider_message_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE(notification_id, channel)
);

CREATE INDEX IF NOT EXISTS notification_delivery_queue_pending_idx
  ON public.notification_delivery_queue(next_attempt_at, created_at)
  WHERE status IN ('pending','failed');

CREATE TABLE IF NOT EXISTS public.release_checklist (
  key text PRIMARY KEY,
  label text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.release_checklist(key,label,required)
VALUES
 ('operator_details','Заполнены реквизиты оператора СтройВыбор',true),
 ('roskomnadzor_notice','Проверена обязанность и статус уведомления Роскомнадзора',true),
 ('russian_data_localization','Подтверждена локализация баз персональных данных граждан РФ',true),
 ('yookassa_contract','Согласована платёжная модель ЮKassa для подрядчиков ИП/ООО',true),
 ('yookassa_receipts','Согласована модель чеков и 54-ФЗ',true),
 ('legal_review','Политики, оферты и договорные шаблоны проверены юристом',true)
ON CONFLICT(key) DO NOTHING;

COMMIT;
