BEGIN;

CREATE TABLE IF NOT EXISTS public.project_payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.project_stages(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL DEFAULT 'RUB' CHECK (currency = 'RUB'),
  provider text NOT NULL DEFAULT 'yookassa' CHECK (provider IN ('yookassa','manual')),
  provider_mode text NOT NULL DEFAULT 'safe_deal' CHECK (provider_mode IN ('safe_deal','split_payments','manual')),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned','awaiting_payment','funded','stage_submitted','release_ready',
    'payout_processing','paid','disputed','refund_pending','refunded','cancelled'
  )),
  provider_deal_id text,
  provider_payment_id text,
  provider_payout_id text,
  funded_at timestamptz,
  release_ready_at timestamptz,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, stage_id)
);

CREATE INDEX IF NOT EXISTS project_payment_intents_project_status_idx
  ON public.project_payment_intents(project_id,status,created_at DESC);

CREATE INDEX IF NOT EXISTS project_payment_intents_provider_payment_idx
  ON public.project_payment_intents(provider,provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_stage_payment_release()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  stage_status text;
BEGIN
  IF NEW.status IN ('release_ready','payout_processing','paid') THEN
    IF NEW.stage_id IS NULL THEN
      RAISE EXCEPTION 'Выплата подрядчику должна быть привязана к принятому этапу';
    END IF;

    SELECT ps.status::text INTO stage_status
    FROM public.project_stages ps
    WHERE ps.id=NEW.stage_id AND ps.project_id=NEW.project_id;

    IF stage_status IS DISTINCT FROM 'completed' THEN
      RAISE EXCEPTION 'Выплата подрядчику запрещена до принятия этапа заказчиком';
    END IF;
  END IF;

  NEW.updated_at = now();
  IF NEW.status='release_ready' AND OLD.status IS DISTINCT FROM 'release_ready' THEN
    NEW.release_ready_at = COALESCE(NEW.release_ready_at,now());
  END IF;
  IF NEW.status='paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    NEW.paid_at = COALESCE(NEW.paid_at,now());
  END IF;
  IF NEW.status='refunded' AND OLD.status IS DISTINCT FROM 'refunded' THEN
    NEW.refunded_at = COALESCE(NEW.refunded_at,now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_stage_payment_release ON public.project_payment_intents;
CREATE TRIGGER trg_enforce_stage_payment_release
BEFORE UPDATE ON public.project_payment_intents
FOR EACH ROW EXECUTE FUNCTION public.enforce_stage_payment_release();

CREATE OR REPLACE FUNCTION public.release_payment_after_stage_acceptance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status::text='completed' AND OLD.status::text IS DISTINCT FROM 'completed' THEN
    UPDATE public.project_payment_intents
       SET status='release_ready', release_ready_at=COALESCE(release_ready_at,now()), updated_at=now()
     WHERE project_id=NEW.project_id
       AND stage_id=NEW.id
       AND status IN ('funded','stage_submitted');
  ELSIF NEW.status::text IN ('revision_required','awaiting_review') THEN
    UPDATE public.project_payment_intents
       SET status='stage_submitted', release_ready_at=NULL, updated_at=now()
     WHERE project_id=NEW.project_id
       AND stage_id=NEW.id
       AND status='release_ready';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_payment_after_stage_acceptance ON public.project_stages;
CREATE TRIGGER trg_release_payment_after_stage_acceptance
AFTER UPDATE OF status ON public.project_stages
FOR EACH ROW EXECUTE FUNCTION public.release_payment_after_stage_acceptance();

CREATE OR REPLACE FUNCTION public.enforce_legacy_payment_after_stage_acceptance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  contract_status text;
  stage_status text;
BEGIN
  SELECT pc.status INTO contract_status
  FROM public.project_contracts pc
  WHERE pc.project_id=NEW.project_id;

  IF contract_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Расчёты доступны только после подписания договора обеими сторонами';
  END IF;

  IF NEW.stage_id IS NULL THEN
    RAISE EXCEPTION 'Выплата подрядчику должна быть привязана к этапу работ';
  END IF;

  SELECT ps.status::text INTO stage_status
  FROM public.project_stages ps
  WHERE ps.id=NEW.stage_id AND ps.project_id=NEW.project_id;

  IF stage_status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'Нельзя зафиксировать выплату подрядчику до принятия этапа заказчиком';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_legacy_payment_after_stage_acceptance ON public.project_payments;
CREATE TRIGGER trg_enforce_legacy_payment_after_stage_acceptance
BEFORE INSERT ON public.project_payments
FOR EACH ROW EXECUTE FUNCTION public.enforce_legacy_payment_after_stage_acceptance();

CREATE OR REPLACE FUNCTION public.activate_project_after_contract_signing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  contract_row public.project_contracts%ROWTYPE;
  customer_user uuid;
  contractor_user uuid;
  project_title text;
BEGIN
  IF NEW.customer_approved_at IS NULL OR NEW.contractor_approved_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.customer_approved_at IS NOT NULL AND OLD.contractor_approved_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO contract_row
  FROM public.project_contracts pc
  WHERE pc.id=NEW.contract_id
    AND pc.current_version=NEW.version_no
  FOR UPDATE;

  IF contract_row.id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.project_contracts
     SET status='active', updated_at=now()
   WHERE id=contract_row.id;

  UPDATE public.projects
     SET status=CASE WHEN status='contractor_selected' THEN 'in_progress' ELSE status END,
         updated_at=now()
   WHERE id=contract_row.project_id
   RETURNING customer_id,title INTO customer_user,project_title;

  SELECT cc.owner_id INTO contractor_user
  FROM public.contractor_companies cc
  WHERE cc.id=contract_row.contractor_id;

  INSERT INTO public.project_events(project_id,author_id,event_type,title,description,metadata)
  VALUES(
    contract_row.project_id,
    customer_user,
    'project_started',
    'Договор подписан обеими сторонами',
    'Рабочий этап проекта открыт после подписания текущей версии договора.',
    jsonb_build_object('contract_id',contract_row.id,'version_no',NEW.version_no)
  );

  IF customer_user IS NOT NULL THEN
    INSERT INTO public.notifications(
      user_id,actor_id,notification_type,title,body,project_id,url,metadata,deduplication_key
    ) VALUES(
      customer_user,NULL,'contract_activated','Договор подписан обеими сторонами',
      'Можно переходить к этапам работ и оплате по проекту «'||COALESCE(project_title,'Проект')||'».',
      contract_row.project_id,'/customer/work/'||contract_row.project_id||'/contract',
      jsonb_build_object('contract_id',contract_row.id,'version_no',NEW.version_no),
      'contract-activated:'||contract_row.id||':'||NEW.version_no||':'||customer_user
    ) ON CONFLICT DO NOTHING;
  END IF;

  IF contractor_user IS NOT NULL THEN
    INSERT INTO public.notifications(
      user_id,actor_id,notification_type,title,body,project_id,url,metadata,deduplication_key
    ) VALUES(
      contractor_user,NULL,'contract_activated','Договор подписан обеими сторонами',
      'Можно переходить к этапам работ по проекту «'||COALESCE(project_title,'Проект')||'».',
      contract_row.project_id,'/contractor/work/'||contract_row.project_id||'/contract',
      jsonb_build_object('contract_id',contract_row.id,'version_no',NEW.version_no),
      'contract-activated:'||contract_row.id||':'||NEW.version_no||':'||contractor_user
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activate_project_after_contract_signing ON public.project_contract_versions;
CREATE TRIGGER trg_activate_project_after_contract_signing
AFTER UPDATE OF customer_approved_at,contractor_approved_at ON public.project_contract_versions
FOR EACH ROW EXECUTE FUNCTION public.activate_project_after_contract_signing();

COMMIT;
