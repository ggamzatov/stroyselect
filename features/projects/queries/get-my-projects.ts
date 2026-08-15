import "server-only";

import { db } from "@/lib/db/pool";

import {
  getCurrentSessionUserId,
} from "@/lib/auth/session";

type ProjectRow = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;

  budget_min:
    string | number | null;

  budget_max:
    string | number | null;

  status: string;

  published_at:
    Date | string | null;

  created_at:
    Date | string;

  updated_at:
    Date | string;

  category_id:
    number | string | null;

  category_name:
    string | null;
};

export async function getMyProjects() {
  const userId =
    await getCurrentSessionUserId();

  if (!userId) {
    return [];
  }

  try {
    const result =
      await db.query<ProjectRow>(
        `
          SELECT
            p.id,
            p.title,
            p.description,
            p.city,
            p.budget_min,
            p.budget_max,
            p.status,
            p.published_at,
            p.created_at,
            p.updated_at,

            sc.id
              AS category_id,

            sc.name
              AS category_name

          FROM
            public.projects p

          LEFT JOIN
            public.service_categories sc
            ON sc.id = p.category_id

          WHERE
            p.customer_id = $1

          ORDER BY
            p.created_at DESC
        `,
        [userId]
      );

    return result.rows.map(
      (row) => ({
        id:
          row.id,

        title:
          row.title,

        description:
          row.description,

        city:
          row.city,

        budget_min:
          toNullableNumber(
            row.budget_min
          ),

        budget_max:
          toNullableNumber(
            row.budget_max
          ),

        status:
          row.status,

        published_at:
          row.published_at
            ? toIsoString(
                row.published_at
              )
            : null,

        created_at:
          toIsoString(
            row.created_at
          ),

        updated_at:
          toIsoString(
            row.updated_at
          ),

        service_categories:
          row.category_id &&
          row.category_name
            ? {
                id:
                  Number(
                    row.category_id
                  ),

                name:
                  row.category_name,
              }
            : null,
      })
    );
  } catch (error) {
    console.error(
      "Ошибка загрузки проектов:",
      error
    );

    throw new Error(
      "Не удалось загрузить проекты"
    );
  }
}

function toNullableNumber(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function toIsoString(
  value: Date | string
) {
  return value instanceof Date
    ? value.toISOString()
    : String(value);
}