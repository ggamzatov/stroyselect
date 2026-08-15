CREATE TABLE IF NOT EXISTS public.project_chat_typing (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_typing boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_chat_typing_expires_idx
  ON public.project_chat_typing (project_id, expires_at);
