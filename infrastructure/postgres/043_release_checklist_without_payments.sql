BEGIN;

UPDATE public.release_checklist
SET required=false,
    note=COALESCE(note,'Отложено до отдельного подключения онлайн-платежей'),
    updated_at=now()
WHERE key IN ('yookassa_contract','yookassa_receipts');

INSERT INTO public.release_checklist(key,label,required)
VALUES
 ('email_delivery','Проверена доставка транзакционных email и повторные попытки',true),
 ('realtime_chat','Проверен realtime-чат и резервный режим восстановления соединения',true),
 ('legal_operator_contacts','На публичных документах указаны актуальные контакты оператора',true),
 ('release_regression','Пройден финальный UX и E2E regression перед публикацией',true)
ON CONFLICT(key) DO NOTHING;

COMMIT;
