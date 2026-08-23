BEGIN;

ALTER TABLE public.release_checklist
  ADD COLUMN IF NOT EXISTS category varchar(32) NOT NULL DEFAULT 'product';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='release_checklist_category_check'
      AND conrelid='public.release_checklist'::regclass
  ) THEN
    ALTER TABLE public.release_checklist
      ADD CONSTRAINT release_checklist_category_check
      CHECK (category IN ('legal','infrastructure','operations','product','payments'));
  END IF;
END $$;

UPDATE public.release_checklist SET category='legal'
WHERE key IN ('operator_details','roskomnadzor_notice','russian_data_localization','legal_review','legal_operator_contacts');
UPDATE public.release_checklist SET category='payments'
WHERE key IN ('yookassa_contract','yookassa_receipts');
UPDATE public.release_checklist SET category='infrastructure'
WHERE key IN ('email_delivery','realtime_chat');
UPDATE public.release_checklist SET category='product'
WHERE key IN ('release_regression');

INSERT INTO public.release_checklist(key,label,required,category)
VALUES
 ('production_https','Production-домен работает по HTTPS с действительным сертификатом',true,'infrastructure'),
 ('production_env','Production environment прошёл автоматическую проверку без placeholder-секретов',true,'infrastructure'),
 ('offsite_backup','Перед релизом создана резервная копия БД и сохранена вне application host',true,'infrastructure'),
 ('restore_drill_recent','Недавний restore drill резервной копии завершён успешно',true,'infrastructure'),
 ('storage_audit','Проверен object storage и отсутствуют критические orphan/integrity проблемы',true,'infrastructure'),
 ('scheduled_maintenance_live','Production scheduler вызывает защищённый maintenance endpoint',true,'operations'),
 ('production_smoke_live','Post-deploy production smoke завершён успешно на реальном HTTPS-домене',true,'operations'),
 ('monitoring_clear','В мониторинге нет неразобранных блокирующих ошибок перед запуском',true,'operations'),
 ('critical_sla_clear','Нет необработанных критических SLA-нарушений marketplace перед запуском',true,'operations'),
 ('clean_browser_flows','Критические сценарии заказчика и подрядчика проверены из чистой браузерной сессии',true,'product')
ON CONFLICT(key) DO UPDATE SET
  label=EXCLUDED.label,
  required=EXCLUDED.required,
  category=EXCLUDED.category,
  updated_at=now();

CREATE INDEX IF NOT EXISTS release_checklist_category_required_idx
  ON public.release_checklist(category,required,completed_at);

COMMIT;
