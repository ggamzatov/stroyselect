BEGIN;

CREATE OR REPLACE FUNCTION public.notify_project_chat_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  pid uuid;
BEGIN
  pid := COALESCE(NEW.project_id, OLD.project_id);
  IF pid IS NOT NULL THEN
    PERFORM pg_notify('stroyselect_chat', pid::text);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_project_messages_notify ON public.project_messages;
CREATE TRIGGER trg_project_messages_notify
AFTER INSERT OR UPDATE OR DELETE ON public.project_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_project_chat_change();

DROP TRIGGER IF EXISTS trg_project_chat_typing_notify ON public.project_chat_typing;
CREATE TRIGGER trg_project_chat_typing_notify
AFTER INSERT OR UPDATE OR DELETE ON public.project_chat_typing
FOR EACH ROW EXECUTE FUNCTION public.notify_project_chat_change();

DROP TRIGGER IF EXISTS trg_project_chat_reads_notify ON public.project_chat_reads;
CREATE TRIGGER trg_project_chat_reads_notify
AFTER INSERT OR UPDATE OR DELETE ON public.project_chat_reads
FOR EACH ROW EXECUTE FUNCTION public.notify_project_chat_change();

COMMIT;
