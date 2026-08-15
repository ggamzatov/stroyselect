import "server-only";

import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";

export async function getProjectContractorReview(projectId: string) {
  const userId = await getCurrentSessionUserId();
  if (!userId) return null;

  try {
    const result = await db.query<{
      id: string;
      project_id: string;
      contractor_id: string;
      customer_id: string;
      rating: number | string;
      quality_rating: number | string | null;
      deadline_rating: number | string | null;
      communication_rating: number | string | null;
      comment: string | null;
      created_at: Date | string;
      updated_at: Date | string;
    }>(
      `
        SELECT
          id, project_id, contractor_id, customer_id,
          rating, quality_rating, deadline_rating, communication_rating,
          comment, created_at, updated_at
        FROM public.contractor_reviews
        WHERE project_id = $1 AND customer_id = $2
        LIMIT 1
      `,
      [projectId, userId]
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      ...row,
      rating: Number(row.rating),
      quality_rating: toNullableNumber(row.quality_rating),
      deadline_rating: toNullableNumber(row.deadline_rating),
      communication_rating: toNullableNumber(row.communication_rating),
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
    };
  } catch (error) {
    console.error("Ошибка загрузки отзыва:", error);
    throw new Error("Не удалось загрузить отзыв");
  }
}

function toNullableNumber(value: number | string | null) {
  return value === null ? null : Number(value);
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}
