import "server-only";

import {
  notFound,
  redirect,
} from "next/navigation";

import { db } from "@/lib/db/pool";

import {
  getCurrentSessionUserId,
} from "@/lib/auth/session";

type CompanyRow = {
  id: string;
  verification_status: string;
  accepts_new_projects: boolean;
};

type ProjectRow = {
  id: string;

  category_id:
  number | string;

  title: string;

  description:
    string | null;

  property_type:
    string | null;

  region:
    string | null;

  city:
    string | null;

  address:
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

  category_name:
    string | null;
};

type BidRow = {
  id: string;

  price:
    string | number;

  duration_days: number;

  message:
    string | null;

  proposed_start_date:
    Date | string | null;

  status: string;

  created_at:
    Date | string;

  updated_at:
    Date | string;
};

export async function getAvailableProject(
  projectId: string
) {
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
          verification_status,
          accepts_new_projects

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

  if (
    !company ||
    company.verification_status !==
      "verified"
  ) {
    redirect(
      "/contractor/company"
    );
  }

  try {
    const projectResult =
      await db.query<ProjectRow>(
        `
          SELECT
            p.id,
            p.category_id,
            p.title,
            p.description,
            p.property_type,
            p.region,
            p.city,
            p.address,
            p.budget_min,
            p.budget_max,
            p.desired_start_date,
            p.desired_end_date,
            p.status,
            p.published_at,

            sc.name
              AS category_name

          FROM
            public.projects p

          LEFT JOIN
            public.service_categories sc
            ON sc.id =
              p.category_id

          WHERE
            p.id = $1

            AND p.status IN (
              'published',
              'collecting_bids'
            )

          LIMIT 1
        `,
        [
          projectId,
        ]
      );

    const row =
      projectResult.rows[0];

    if (!row) {
      notFound();
    }

    const bidResult =
      await db.query<BidRow>(
        `
          SELECT
            id,
            price,
            duration_days,
            message,
            proposed_start_date,
            status,
            created_at,
            updated_at

          FROM
            public.project_bids

          WHERE
            project_id = $1
            AND contractor_id = $2

          LIMIT 1
        `,
        [
          projectId,
          company.id,
        ]
      );

    const bid =
      bidResult.rows[0];

    const project = {
      id:
        row.id,

      category_id:
      Number(
      row.category_id
        ),

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

      address:
        row.address,

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
    };

    const existingBid =
      bid
        ? {
            id:
              bid.id,

            price:
              Number(
                bid.price
              ),

            duration_days:
              bid.duration_days,

            message:
              bid.message ?? "",

            proposed_start_date:
              toNullableDateString(
                bid
                  .proposed_start_date
              ),

            status:
              bid.status,

            created_at:
              toIsoString(
                bid.created_at
              ),

            updated_at:
              toIsoString(
                bid.updated_at
              ),
          }
        : null;

    return {
      project,
      company,
      existingBid,
    };
  } catch (error) {
    if (
      isNextNavigationError(
        error
      )
    ) {
      throw error;
    }

    console.error(
      "Ошибка загрузки проекта:",
      error
    );

    throw new Error(
      "Не удалось загрузить проект"
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

function isNextNavigationError(
  error: unknown
) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("digest" in error)
  ) {
    return false;
  }

  return typeof (
    error as {
      digest?: unknown;
    }
  ).digest === "string";
}