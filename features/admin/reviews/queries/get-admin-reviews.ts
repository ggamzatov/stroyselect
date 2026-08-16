import "server-only";

import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";

export type AdminReviewRow = {
  id: string;
  project_id: string;
  contractor_id: string;
  customer_id: string;
  rating: number;
  quality_rating: number | null;
  deadline_rating: number | null;
  communication_rating: number | null;
  budget_rating: number | null;
  comment: string | null;
  moderation_status: "published" | "hidden" | "flagged";
  moderation_note: string | null;
  created_at: string;
  project_title: string | null;
  contractor_name: string | null;
  customer_name: string;
};

export async function getAdminReviews(limit = 200): Promise<AdminReviewRow[]> {
  await requireStaffUser();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  const result = await db.query<{
    id: string; project_id: string; contractor_id: string; customer_id: string;
    rating: number | string; quality_rating: number | string | null;
    deadline_rating: number | string | null; communication_rating: number | string | null;
    budget_rating: number | string | null; comment: string | null;
    moderation_status: AdminReviewRow["moderation_status"]; moderation_note: string | null;
    created_at: Date | string; project_title: string | null; contractor_name: string | null;
    first_name: string | null; last_name: string | null;
  }>(
    `
      SELECT cr.id,cr.project_id,cr.contractor_id,cr.customer_id,
        cr.rating,cr.quality_rating,cr.deadline_rating,cr.communication_rating,
        cr.budget_rating,cr.comment,cr.moderation_status,cr.moderation_note,cr.created_at,
        p.title AS project_title,cc.public_name AS contractor_name,
        pr.first_name,pr.last_name
      FROM public.contractor_reviews cr
      LEFT JOIN public.projects p ON p.id=cr.project_id
      LEFT JOIN public.contractor_companies cc ON cc.id=cr.contractor_id
      LEFT JOIN public.profiles pr ON pr.id=cr.customer_id
      ORDER BY (cr.moderation_status='flagged') DESC, cr.created_at DESC
      LIMIT $1
    `,
    [safeLimit]
  );
  return result.rows.map((row) => ({
    ...row,
    rating: Number(row.rating),
    quality_rating: toNullable(row.quality_rating),
    deadline_rating: toNullable(row.deadline_rating),
    communication_rating: toNullable(row.communication_rating),
    budget_rating: toNullable(row.budget_rating),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    customer_name: [row.first_name, row.last_name].filter(Boolean).join(" ") || "Заказчик",
  }));
}

function toNullable(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
