BEGIN;

CREATE TABLE IF NOT EXISTS public.marketplace_operational_alert_states (
  alert_key text PRIMARY KEY,
  status varchar(24) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','ignored')),
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  note text,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_operational_alert_states_status_idx
  ON public.marketplace_operational_alert_states(status, updated_at DESC);

CREATE OR REPLACE VIEW public.marketplace_operational_alerts AS
WITH alerts AS (
  SELECT
    'project_no_bid:' || p.id::text AS alert_key,
    'project_no_bid'::text AS alert_type,
    CASE WHEN p.created_at < now()-interval '96 hours' THEN 'critical' ELSE 'warning' END::text AS severity,
    p.id AS project_id,
    NULL::uuid AS contractor_id,
    'Проект без предложений'::text AS title,
    ('Проект «' || p.title || '» опубликован более 48 часов назад и пока не получил ни одного предложения.')::text AS detail,
    p.created_at + interval '48 hours' AS detected_at
  FROM public.projects p
  WHERE p.status::text IN ('published','collecting_bids')
    AND p.created_at < now()-interval '48 hours'
    AND NOT EXISTS (SELECT 1 FROM public.project_bids pb WHERE pb.project_id=p.id AND pb.status::text<>'withdrawn')

  UNION ALL

  SELECT
    'selected_without_contract:' || p.id::text,
    'selected_without_contract',
    CASE WHEN p.updated_at < now()-interval '96 hours' THEN 'critical' ELSE 'warning' END,
    p.id,
    p.selected_contractor_id,
    'Подрядчик выбран, договор не создан',
    ('По проекту «' || p.title || '» выбран подрядчик, но договор отсутствует более 48 часов.'),
    p.updated_at + interval '48 hours'
  FROM public.projects p
  WHERE p.selected_contractor_id IS NOT NULL
    AND p.status::text='contractor_selected'
    AND p.updated_at < now()-interval '48 hours'
    AND NOT EXISTS (SELECT 1 FROM public.project_contracts pc WHERE pc.project_id=p.id)

  UNION ALL

  SELECT
    'stage_overdue:' || ps.id::text,
    'stage_overdue',
    CASE WHEN ps.planned_end_date < current_date-7 THEN 'critical' ELSE 'warning' END,
    ps.project_id,
    p.selected_contractor_id,
    'Просрочен этап проекта',
    ('Этап «' || ps.title || '» должен был завершиться ' || to_char(ps.planned_end_date,'DD.MM.YYYY') || '.'),
    ps.planned_end_date::timestamptz
  FROM public.project_stages ps
  JOIN public.projects p ON p.id=ps.project_id
  WHERE ps.planned_end_date < current_date
    AND ps.status::text NOT IN ('completed','cancelled')

  UNION ALL

  SELECT
    'invitation_no_response:' || pci.id::text,
    'invitation_no_response',
    CASE WHEN pci.created_at < now()-interval '72 hours' THEN 'warning' ELSE 'info' END,
    pci.project_id,
    pci.contractor_id,
    'Подрядчик не ответил на приглашение',
    ('Приглашение подрядчику остаётся без ответа более 24 часов.'),
    pci.created_at + interval '24 hours'
  FROM public.project_contractor_invitations pci
  WHERE pci.status='invited' AND pci.created_at < now()-interval '24 hours'

  UNION ALL

  SELECT
    'advisor_task_overdue:' || t.id::text,
    'advisor_task_overdue',
    CASE WHEN t.due_at < now()-interval '48 hours' THEN 'critical' ELSE 'warning' END,
    t.project_id,
    NULL::uuid,
    'Просрочена задача сопровождения',
    ('Задача «' || t.title || '» просрочена.'),
    t.due_at
  FROM public.project_advisor_tasks t
  WHERE t.is_completed=false AND t.due_at IS NOT NULL AND t.due_at<now()

  UNION ALL

  SELECT
    'followup_overdue:' || crm.project_id::text || ':' || crm.contractor_id::text,
    'followup_overdue',
    'warning',
    crm.project_id,
    crm.contractor_id,
    'Просрочен следующий контакт',
    'По кандидату просрочен запланированный follow-up.',
    crm.next_follow_up_at
  FROM public.project_candidate_crm crm
  WHERE crm.stage<>'archived' AND crm.next_follow_up_at IS NOT NULL AND crm.next_follow_up_at<now()
)
SELECT a.*,
       COALESCE(s.status,'open') AS status,
       s.assigned_to,
       s.note,
       s.updated_at AS state_updated_at
FROM alerts a
LEFT JOIN public.marketplace_operational_alert_states s ON s.alert_key=a.alert_key
WHERE COALESCE(s.status,'open') NOT IN ('resolved','ignored');

COMMIT;
