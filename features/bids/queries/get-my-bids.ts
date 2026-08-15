import "server-only";

import { redirect } from "next/navigation";

import { db } from
  "@/lib/db/pool";

import {
  getCurrentSessionUserId,
} from
  "@/lib/auth/session";

type CompanyRow = {
  id: string;
};

type BidRow = {
  id: string;
  project_id: string;

  price:
    string | number;

  duration_days:
    number;

  message:
    string | null;

  proposed_start_date:
    Date | string | null;

  status:
    string;

  created_at:
    Date | string;

  updated_at:
    Date | string;

  project_title:
    string | null;

  project_city:
    string | null;

  project_status:
    string;

  project_budget_min:
    string | number | null;

  project_budget_max:
    string | number | null;
};

export async function getMyBids() {
  const userId =
    await getCurrentSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  const companyResult =
    await db.query<CompanyRow>(
      `
        SELECT
          id
        FROM
          public.contractor_companies
        WHERE
          owner_id = $1
        LIMIT 1
      `,
      [userId]
    );

  const company =
    companyResult.rows[0];

  if (!company) {
    return [];
  }

  try {
    const result =
      await db.query<BidRow>(
        `
          SELECT
            pb.id,
            pb.project_id,
            pb.price,
            pb.duration_days,
            pb.message,
            pb.proposed_start_date,
            pb.status,
            pb.created_at,
            pb.updated_at,

            p.title
              AS project_title,

            p.city
              AS project_city,

            p.status
              AS project_status,

            p.budget_min
              AS project_budget_min,

            p.budget_max
              AS project_budget_max

          FROM
            public.project_bids pb

          JOIN
            public.projects p
            ON p.id =
              pb.project_id

          WHERE
            pb.contractor_id =
              $1

          ORDER BY
            pb.created_at DESC
        `,
        [
          company.id,
        ]
      );

    return result.rows.map(
      (row) => ({
        id:
          row.id,

        project_id:
          row.project_id,

        price:
          Number(
            row.price
          ),

        duration_days:
          row.duration_days,

        message:
          row.message,

        proposed_start_date:
          toNullableDateString(
            row.proposed_start_date
          ),

        status:
          row.status,

        created_at:
          toIsoString(
            row.created_at
          ),

        updated_at:
          toIsoString(
            row.updated_at
          ),

        projects:
          row.project_title
            ? {
                id:
                  row.project_id,

                title:
                  row.project_title,

                city:
                  row.project_city ?? "",

                status:
                  row.project_status ?? "",

                budget_min:
                  toNullableNumber(
                    row.project_budget_min
                  ),

                budget_max:
                  toNullableNumber(
                    row.project_budget_max
                  ),
              }
            : null,
      })
    );
  } catch (error) {
    console.error(
      "Ошибка загрузки предложений:",
      error
    );

    throw new Error(
      "Не удалось загрузить предложения"
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

function toNullableDateString(
  value:
    Date | string | null
) {
  if (!value) {
    return null;
  }

  return value instanceof Date
    ? value.toISOString()
    : String(value);
}

function toIsoString(
  value:
    Date | string
) {
  return value instanceof Date
    ? value.toISOString()
    : String(value);
}