-- Validate legacy rows against the composite foreign keys introduced in 006.
-- The explicit checks below make failures easier to diagnose than a raw
-- ALTER TABLE ... VALIDATE CONSTRAINT error.

DO $$
DECLARE
  broken_count bigint;
BEGIN
  SELECT count(*)
  INTO broken_count
  FROM public.project_message_files f
  LEFT JOIN public.project_messages m
    ON m.id = f.message_id
   AND m.project_id = f.project_id
  WHERE m.id IS NULL;

  IF broken_count > 0 THEN
    RAISE EXCEPTION
      'Cannot validate project_message_files_message_project_fkey: % inconsistent rows',
      broken_count;
  END IF;
END
$$;

DO $$
DECLARE
  broken_count bigint;
BEGIN
  SELECT count(*)
  INTO broken_count
  FROM public.project_stage_files f
  LEFT JOIN public.project_stages s
    ON s.id = f.stage_id
   AND s.project_id = f.project_id
  WHERE s.id IS NULL;

  IF broken_count > 0 THEN
    RAISE EXCEPTION
      'Cannot validate project_stage_files_stage_project_fkey: % inconsistent rows',
      broken_count;
  END IF;
END
$$;

DO $$
DECLARE
  broken_count bigint;
BEGIN
  SELECT count(*)
  INTO broken_count
  FROM public.projects p
  LEFT JOIN public.project_bids b
    ON b.id = p.selected_bid_id
   AND b.project_id = p.id
  WHERE p.selected_bid_id IS NOT NULL
    AND b.id IS NULL;

  IF broken_count > 0 THEN
    RAISE EXCEPTION
      'Cannot validate projects_selected_bid_project_fkey: % inconsistent rows',
      broken_count;
  END IF;
END
$$;

ALTER TABLE public.project_message_files
  VALIDATE CONSTRAINT project_message_files_message_project_fkey;

ALTER TABLE public.project_stage_files
  VALIDATE CONSTRAINT project_stage_files_stage_project_fkey;

ALTER TABLE public.projects
  VALIDATE CONSTRAINT projects_selected_bid_project_fkey;

-- Extra integrity checks that are important to the current application model.
-- A selected contractor and selected bid must either both be present or both be absent.
DO $$
DECLARE
  broken_count bigint;
BEGIN
  SELECT count(*)
  INTO broken_count
  FROM public.projects
  WHERE (selected_contractor_id IS NULL) <> (selected_bid_id IS NULL);

  IF broken_count > 0 THEN
    RAISE EXCEPTION
      'Found % projects where selected_contractor_id/selected_bid_id presence differs',
      broken_count;
  END IF;
END
$$;

-- If a bid is selected, its contractor must be the project's selected contractor.
DO $$
DECLARE
  broken_count bigint;
BEGIN
  SELECT count(*)
  INTO broken_count
  FROM public.projects p
  JOIN public.project_bids b
    ON b.id = p.selected_bid_id
   AND b.project_id = p.id
  WHERE p.selected_contractor_id IS DISTINCT FROM b.contractor_id;

  IF broken_count > 0 THEN
    RAISE EXCEPTION
      'Found % projects whose selected bid belongs to another contractor',
      broken_count;
  END IF;
END
$$;
