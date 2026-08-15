-- Strengthen cross-table integrity after the Supabase -> direct PostgreSQL migration.
-- NOT VALID keeps deployment safe when legacy rows exist; all new/updated rows
-- are checked immediately. Existing data can be validated after the audit query.

-- Composite uniqueness is logically guaranteed by each table's UUID primary key,
-- but PostgreSQL needs an explicit unique key for composite foreign keys.
CREATE UNIQUE INDEX IF NOT EXISTS
  project_messages_id_project_unique
ON public.project_messages (id, project_id);

CREATE UNIQUE INDEX IF NOT EXISTS
  project_stages_id_project_unique
ON public.project_stages (id, project_id);

CREATE UNIQUE INDEX IF NOT EXISTS
  project_bids_id_project_unique
ON public.project_bids (id, project_id);

-- Keep file metadata from ever pointing to a message/stage from another project.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_message_files_message_project_fkey'
      AND conrelid = 'public.project_message_files'::regclass
  ) THEN
    ALTER TABLE public.project_message_files
      ADD CONSTRAINT project_message_files_message_project_fkey
      FOREIGN KEY (message_id, project_id)
      REFERENCES public.project_messages (id, project_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_stage_files_stage_project_fkey'
      AND conrelid = 'public.project_stage_files'::regclass
  ) THEN
    ALTER TABLE public.project_stage_files
      ADD CONSTRAINT project_stage_files_stage_project_fkey
      FOREIGN KEY (stage_id, project_id)
      REFERENCES public.project_stages (id, project_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

-- selected_bid_id must reference a bid belonging to the same project.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_selected_bid_project_fkey'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_selected_bid_project_fkey
      FOREIGN KEY (selected_bid_id, id)
      REFERENCES public.project_bids (id, project_id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END
$$;

-- Match the application's most common project-scoped ordered reads.
CREATE INDEX IF NOT EXISTS
  project_message_files_project_created_idx
ON public.project_message_files (project_id, created_at ASC);

CREATE INDEX IF NOT EXISTS
  project_stage_files_project_created_idx
ON public.project_stage_files (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS
  project_stages_project_sort_idx
ON public.project_stages (project_id, sort_order ASC);

-- Fast cleanup of stale typing rows.
CREATE INDEX IF NOT EXISTS
  project_chat_typing_expires_idx
ON public.project_chat_typing (expires_at);
