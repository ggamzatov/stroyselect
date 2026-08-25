BEGIN;

CREATE OR REPLACE FUNCTION public.enqueue_notification_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  recipient_email text;
  email_allowed boolean;
BEGIN
  SELECT p.email,
         COALESCE(np.email_enabled, true)
    INTO recipient_email, email_allowed
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON np.user_id=p.id
  WHERE p.id=NEW.user_id;

  IF email_allowed IS TRUE AND recipient_email IS NOT NULL AND length(trim(recipient_email))>0 THEN
    INSERT INTO public.notification_delivery_queue(notification_id,channel,recipient)
    VALUES(NEW.id,'email',trim(recipient_email))
    ON CONFLICT(notification_id,channel) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_notification_email ON public.notifications;
CREATE TRIGGER trg_enqueue_notification_email
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.enqueue_notification_email();

COMMIT;
