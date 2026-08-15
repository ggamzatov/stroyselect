import "server-only";

import { redirect } from "next/navigation";

import { db } from "@/lib/db/pool";

import {
  getCurrentSessionUserId,
} from "@/lib/auth/session";

type CompanyRow = {
  id: string;
};

type ProjectRow = {
  id: string;

  title: string;

  description:
    string | null;

  city:
    string | null;

  address:
    string | null;

  status: string;

  budget_min:
    string | number | null;

  budget_max:
    string | number | null;

  desired_start_date:
    Date | string | null;

  desired_end_date:
    Date | string | null;

  contractor_selected_at:
    Date | string | null;

  work_started_at:
    Date | string | null;

  completed_at:
    Date | string | null;

  selected_bid_id:
    string | null;

  category_id:
    number | string | null;

  category_name:
    string | null;

  bid_id:
    string | null;

  bid_price:
    string | number | null;

  bid_duration_days:
    number | null;

  bid_proposed_start_date:
    Date | string | null;

  bid_status:
    string | null;
};

export async function getAssignedProjects() {
  const userId =
    await getCurrentSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  const companyResult =
    await db.query<CompanyRow>(
      `
        SELECT id

        FROM
          public.contractor_companies

        WHERE
          owner_id = $1

        LIMIT 1
      `,
      [
        userId,
      ]
    );

  const company =
    companyResult.rows[0];

  if (!company) {
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
            p.address,
            p.status,
            p.budget_min,
            p.budget_max,
            p.desired_start_date,
            p.desired_end_date,
            p.contractor_selected_at,
            p.work_started_at,
            p.completed_at,
            p.selected_bid_id,

            sc.id
              AS category_id,

            sc.name
              AS category_name,

            pb.id
              AS bid_id,

            pb.price
              AS bid_price,

            pb.duration_days
              AS bid_duration_days,

            pb.proposed_start_date
              AS bid_proposed_start_date,

            pb.status
              AS bid_status

          FROM
            public.projects p

          LEFT JOIN
            public.service_categories sc
            ON sc.id =
              p.category_id

          LEFT JOIN
            public.project_bids pb
            ON pb.id =
              p.selected_bid_id

          WHERE
            p.selected_contractor_id =
              $1

            AND p.status IN (
              'contractor_selected',
              'in_progress',
              'completed',
              'disputed'
            )

          ORDER BY
            p.contractor_selected_at
              DESC NULLS LAST,
            p.created_at DESC
        `,
        [
          company.id,
        ]
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

        address:
          row.address,

        status:
          row.status,

        budget_min:
          toNullableNumber(
            row.budget_min
          ),

        budget_max:
          toNullableNumber(
            row.budget_max
          ),

        desired_start_date:
          toNullableDateString(
            row.desired_start_date
          ),

        desired_end_date:
          toNullableDateString(
            row.desired_end_date
          ),

        contractor_selected_at:
          row.contractor_selected_at
            ? toIsoString(
                row
                  .contractor_selected_at
              )
            : null,

        work_started_at:
          row.work_started_at
            ? toIsoString(
                row.work_started_at
              )
            : null,

        completed_at:
          row.completed_at
            ? toIsoString(
                row.completed_at
              )
            : null,

        selected_bid_id:
          row.selected_bid_id,

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

        project_bids:
          row.bid_id
            ? {
                id:
                  row.bid_id,

                price:
                  toNullableNumber(
                    row.bid_price
                  ),

                duration_days:
                  row
                    .bid_duration_days,

                proposed_start_date:
                  toNullableDateString(
                    row
                      .bid_proposed_start_date
                  ),

                status:
                  row.bid_status,
              }
            : null,
      })
    );
  } catch (error) {
    console.error(
      "Ошибка загрузки назначенных проектов:",
      error
    );

    throw new Error(
      "Не удалось загрузить назначенные проекты"
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
    ? value
        .toISOString()
        .slice(0, 10)
    : String(value)
        .slice(0, 10);
}

function toIsoString(
  value: Date | string
) {
  return value instanceof Date
    ? value.toISOString()
    : String(value);
}