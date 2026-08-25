BEGIN;

CREATE TABLE IF NOT EXISTS public.marketplace_operational_alert_escalations (
  alert_key text PRIMARY KEY,
  first_notified_at timestamptz NOT NULL DEFAULT now(),
  last_notified_at timestamptz NOT NULL DEFAULT now(),
  notification_count integer NOT NULL DEFAULT 1 CHECK (notification_count > 0)
);

CREATE OR REPLACE FUNCTION public.notify_critical_operational_alerts()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  WITH due_alerts AS (
    SELECT a.alert_key,a.project_id,a.title,a.detail
    FROM public.marketplace_operational_alerts a
    LEFT JOIN public.marketplace_operational_alert_escalations e ON e.alert_key=a.alert_key
    WHERE a.severity='critical'
      AND (e.alert_key IS NULL OR e.last_notified_at < now()-interval '24 hours')
  ), inserted AS (
    INSERT INTO public.notifications(user_id,notification_type,title,body,project_id,url,metadata,deduplication_key)
    SELECT
      p.id,
      'operational_sla_alert',
      'Критическое нарушение SLA',
      da.title || '. ' || da.detail,
      da.project_id,
      '/admin/operations',
      jsonb_build_object('alert_key',da.alert_key,'severity','critical'),
      'sla-alert:' || da.alert_key || ':' || p.id::text || ':' || current_date::text
    FROM due_alerts da
    CROSS JOIN public.profiles p
    WHERE p.role::text IN ('admin','moderator','manager')
    ON CONFLICT DO NOTHING
    RETURNING metadata
  )
  SELECT COUNT(*) INTO inserted_count FROM inserted;

  INSERT INTO public.marketplace_operational_alert_escalations(alert_key,first_notified_at,last_notified_at,notification_count)
  SELECT a.alert_key,now(),now(),1
  FROM public.marketplace_operational_alerts a
  LEFT JOIN public.marketplace_operational_alert_escalations e ON e.alert_key=a.alert_key
  WHERE a.severity='critical'
    AND (e.alert_key IS NULL OR e.last_notified_at < now()-interval '24 hours')
  ON CONFLICT(alert_key) DO UPDATE SET
    last_notified_at=now(),
    notification_count=marketplace_operational_alert_escalations.notification_count+1;

  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.stroyselect_housekeeping()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.action_rate_limits
    WHERE updated_at < now() - interval '7 days'
      AND (blocked_until IS NULL OR blocked_until < now() - interval '1 day');

  DELETE FROM public.auth_login_attempts
    WHERE updated_at < now() - interval '30 days'
      AND (locked_until IS NULL OR locked_until < now() - interval '1 day');

  DELETE FROM public.auth_sessions
    WHERE expires_at < now() - interval '30 days'
       OR (revoked_at IS NOT NULL AND revoked_at < now() - interval '30 days');

  DELETE FROM public.auth_email_tokens
    WHERE expires_at < now() - interval '7 days';

  DELETE FROM public.application_errors
    WHERE resolved_at IS NOT NULL
      AND resolved_at < now() - interval '90 days';

  PERFORM public.notify_critical_operational_alerts();
END;
$$;

COMMIT;
