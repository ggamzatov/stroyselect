BEGIN;

-- Every payment gets an explicit confirmation row immediately.
CREATE OR REPLACE FUNCTION public.ensure_project_payment_confirmation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.project_payment_confirmations(payment_id, project_id)
  VALUES(NEW.id, NEW.project_id)
  ON CONFLICT(payment_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_payments_confirmation_init ON public.project_payments;
CREATE TRIGGER project_payments_confirmation_init
AFTER INSERT ON public.project_payments
FOR EACH ROW EXECUTE FUNCTION public.ensure_project_payment_confirmation();

INSERT INTO public.project_payment_confirmations(payment_id, project_id)
SELECT pp.id, pp.project_id
FROM public.project_payments pp
LEFT JOIN public.project_payment_confirmations ppc ON ppc.payment_id = pp.id
WHERE ppc.payment_id IS NULL
ON CONFLICT(payment_id) DO NOTHING;

-- Fix housekeeping against the real auth_login_attempts schema (updated_at).
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
END;
$$;

COMMIT;
