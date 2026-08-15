import "server-only";

import { redirect } from "next/navigation";

import { db } from "@/lib/db/pool";

import {
  getCurrentSessionUserId,
} from "@/lib/auth/session";

type CompanyRow = {
  id: string;
  owner_id: string;
  public_name: string;
  verification_status: string;
  accepts_new_projects: boolean;
};

type ProjectRow = {
  id: string;

  category_id:
    number | string | null;

  title: string;

  description:
    string | null;

  property_type:
    string | null;

  region:
    string | null;

  city:
    string | null;

  budget_min:
    string | number | null;

  budget_max:
    string | number | null;

  desired_start_date:
    Date | string | null;

  desired_end_date:
    Date | string | null;

  status: string;

  published_at:
    Date | string | null;

  created_at:
    Date | string;

  category_name:
    string | null;
};

type BidRow = {
  id: string;
  project_id: string;
  contractor_id: string;
  status: string;
};

export async function getAvailableProjects() {
  const userId =
    await getCurrentSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  const companyResult =
    await db.query<CompanyRow>(
      `
        SELECT
          id,
          owner_id,
          public_name,
          verification_status,
          accepts_new_projects

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
    return {
      company: null,
      projects: [],
      debugMessage:
        "Компания подрядчика не найдена",
    };
  }

  if (
    company.verification_status !==
    "verified"
  ) {
    return {
      company,
      projects: [],
      debugMessage:
        `Статус подрядчика: ${company.verification_status}`,
    };
  }

  if (
    !company.accepts_new_projects
  ) {
    return {
      company,
      projects: [],
      debugMessage:
        "Подрядчик не принимает новые проекты",
    };
  }

  try {
    const [
      projectsResult,
      bidsResult,
    ] =
      await Promise.all([
        db.query<ProjectRow>(
          `
            SELECT
              p.id,
              p.category_id,
              p.title,
              p.description,
              p.property_type,
              p.region,
              p.city,
              p.budget_min,
              p.budget_max,
              p.desired_start_date,
              p.desired_end_date,
              p.status,
              p.published_at,
              p.created_at,

              sc.name
                AS category_name

            FROM
              public.projects p

            LEFT JOIN
              public.service_categories sc
              ON sc.id =
                p.category_id

            WHERE
              p.status IN (
                'published',
                'collecting_bids'
              )

            ORDER BY
              p.published_at DESC NULLS LAST,
              p.created_at DESC
          `
        ),

        db.query<BidRow>(
          `
            SELECT
              id,
              project_id,
              contractor_id,
              status

            FROM
              public.project_bids

            WHERE
              contractor_id = $1
          `,
          [
            company.id,
          ]
        ),
      ]);

    const bidsByProject =
      new Map<
        string,
        BidRow[]
      >();

    for (
      const bid of
        bidsResult.rows
    ) {
      const current =
        bidsByProject.get(
          bid.project_id
        ) ?? [];

      current.push(
        bid
      );

      bidsByProject.set(
        bid.project_id,
        current
      );
    }

    const projects =
      projectsResult.rows.map(
        (row) => ({
          id:
            row.id,

          category_id:
            row.category_id !== null
              ? Number(
                  row.category_id
                )
              : null,

          title:
            row.title,

          description:
            row.description,

          property_type:
            row.property_type,

          region:
            row.region,

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

          desired_start_date:
            toNullableDateString(
              row.desired_start_date
            ),

          desired_end_date:
            toNullableDateString(
              row.desired_end_date
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
            bidsByProject.get(
              row.id
            ) ?? [],
        })
      );

    return {
      company,
      projects,
      debugMessage: null,
    };
  } catch (error) {
    console.error(
      "Ошибка загрузки доступных проектов:",
      error
    );

    return {
      company,
      projects: [],
      debugMessage:
        "Не удалось загрузить проекты",
    };
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