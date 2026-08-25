BEGIN;

UPDATE public.projects p
SET selected_bid_id = (
      SELECT pb.id
      FROM public.project_bids pb
      WHERE pb.project_id = p.id
        AND pb.contractor_id = p.selected_contractor_id
      ORDER BY
        CASE WHEN pb.status::text = 'accepted' THEN 0 ELSE 1 END,
        pb.updated_at DESC,
        pb.created_at DESC
      LIMIT 1
    ),
    updated_at = now()
WHERE p.selected_contractor_id IS NOT NULL
  AND p.selected_bid_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.project_bids pb
    WHERE pb.project_id = p.id
      AND pb.contractor_id = p.selected_contractor_id
  );

COMMIT;
