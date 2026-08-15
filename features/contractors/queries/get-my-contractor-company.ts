import "server-only";

import { db } from
  "@/lib/db/pool";

import {
  getCurrentSessionUserId,
} from
  "@/lib/auth/session";

type ContractorCompanyRow = {
  id: string;
  owner_id: string;
  public_name: string;
  legal_name: string | null;
  inn: string | null;
  ogrn: string | null;
  description: string | null;
  founded_year: number | null;
  employee_count: number | null;

  minimum_project_budget:
    string | number | null;

  maximum_project_budget:
    string | number | null;

  verification_status: string;
  verification_comment: string | null;

  rating:
    string | number;

  rating_count: number;

  created_at:
    Date | string;

  updated_at:
    Date | string;

  company_type: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  website: string | null;
  telegram: string | null;

  accepts_new_projects: boolean;

  quality_rating:
    string | number | null;

  deadline_rating:
    string | number | null;

  communication_rating:
    string | number | null;

  completed_projects_count: number;

  recommendation_score:
    string | number;
};

type ContractorServiceRow = {
  category_id: number;
};

type ContractorAreaRow = {
  city: string;
  region: string;
  travel_radius_km:
    number | null;
  is_primary: boolean;
};

export async function getMyContractorCompany() {
  const userId =
    await getCurrentSessionUserId();

  if (!userId) {
    return null;
  }

  try {
    const [
      companyResult,
      servicesResult,
      areasResult,
    ] =
      await Promise.all([
        db.query<ContractorCompanyRow>(
          `
            SELECT
              *
            FROM
              public.contractor_companies
            WHERE
              owner_id = $1
            LIMIT 1
          `,
          [
            userId,
          ]
        ),

        db.query<ContractorServiceRow>(
          `
            SELECT
              cs.category_id
            FROM
              public.contractor_services
                cs
            JOIN
              public.contractor_companies
                cc
              ON cc.id =
                cs.contractor_id
            WHERE
              cc.owner_id = $1
          `,
          [
            userId,
          ]
        ),

        db.query<ContractorAreaRow>(
          `
            SELECT
              csa.city,
              csa.region,
              csa.travel_radius_km,
              csa.is_primary
            FROM
              public.contractor_service_areas
                csa
            JOIN
              public.contractor_companies
                cc
              ON cc.id =
                csa.contractor_id
            WHERE
              cc.owner_id = $1
            ORDER BY
              csa.is_primary DESC,
              csa.city ASC
          `,
          [
            userId,
          ]
        ),
      ]);

    const company =
      companyResult.rows[0];

    if (!company) {
      return null;
    }

    return {
      ...company,

      minimum_project_budget:
        toNullableNumber(
          company
            .minimum_project_budget
        ),

      maximum_project_budget:
        toNullableNumber(
          company
            .maximum_project_budget
        ),

      rating:
        safeNumber(
          company.rating
        ),

      quality_rating:
        toNullableNumber(
          company
            .quality_rating
        ),

      deadline_rating:
        toNullableNumber(
          company
            .deadline_rating
        ),

      communication_rating:
        toNullableNumber(
          company
            .communication_rating
        ),

      recommendation_score:
        safeNumber(
          company
            .recommendation_score
        ),

      created_at:
        toIsoString(
          company.created_at
        ),

      updated_at:
        toIsoString(
          company.updated_at
        ),

      contractor_services:
  servicesResult.rows.map(
    (service) => ({
      category_id:
        Number(
          service.category_id
        ),
    })
  ),

      contractor_service_areas:
        areasResult.rows.map(
          (area) => ({
            city:
              area.city,

            region:
              area.region,

            travel_radius_km:
              area.travel_radius_km,

            is_primary:
              area.is_primary,
          })
        ),
    };
  } catch (error) {
    console.error(
      "Ошибка загрузки компании:",
      error
    );

    throw new Error(
      "Не удалось загрузить профиль подрядчика"
    );
  }
}

function safeNumber(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
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
  value:
    Date | string
) {
  if (
    value instanceof Date
  ) {
    return value.toISOString();
  }

  return String(value);
}