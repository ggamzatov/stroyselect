import "server-only";

import { notFound } from "next/navigation";

import { db } from "@/lib/db/pool";

type CompanyRow = {
  id: string;
  owner_id: string;
  public_name: string;
  legal_name: string | null;
  company_type: string | null;
  inn: string | null;
  ogrn: string | null;
  founded_year: number | null;
  employee_count: number | null;
  description: string | null;
  minimum_project_budget: number | string | null;
  maximum_project_budget: number | string | null;
  accepts_new_projects: boolean;
  contact_phone: string | null;
  contact_email: string | null;
  website: string | null;
  telegram: string | null;
  verification_status: string;
  contractor_services: Array<{
    category_id: number;
    years_experience: number | null;
    is_primary: boolean;
    service_categories: {
      id: number;
      name: string;
      slug: string;
    } | null;
  }>;
  contractor_service_areas: Array<{
    id: string;
    city: string;
    region: string | null;
    travel_radius_km: number | null;
    is_primary: boolean;
  }>;
};

export async function getContractorReview(contractorId: string) {
  try {
    const companyResult = await db.query<CompanyRow>(
      `
        SELECT
          cc.*,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'category_id', cs.category_id::int,
                'years_experience', cs.years_experience,
                'is_primary', cs.is_primary,
                'service_categories', jsonb_build_object(
                  'id', sc.id::int,
                  'name', sc.name,
                  'slug', sc.slug
                )
              )
              ORDER BY cs.is_primary DESC, sc.name
            )
            FROM public.contractor_services cs
            LEFT JOIN public.service_categories sc ON sc.id = cs.category_id
            WHERE cs.contractor_id = cc.id
          ), '[]'::jsonb) AS contractor_services,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', csa.id::text,
                'city', csa.city,
                'region', csa.region,
                'travel_radius_km', csa.travel_radius_km,
                'is_primary', csa.is_primary
              )
              ORDER BY csa.is_primary DESC, csa.city
            )
            FROM public.contractor_service_areas csa
            WHERE csa.contractor_id = cc.id
          ), '[]'::jsonb) AS contractor_service_areas
        FROM public.contractor_companies cc
        WHERE cc.id = $1::uuid
        LIMIT 1
      `,
      [contractorId]
    );

    const company = companyResult.rows[0];
    if (!company) notFound();

    const [ownerResult, logsResult] = await Promise.all([
      db.query<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        phone: string | null;
        city: string | null;
        created_at: Date | string;
      }>(
        `
          SELECT id, first_name, last_name, phone, city, created_at
          FROM public.profiles
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [company.owner_id]
      ),
      db.query<{
        id: string;
        previous_status: string;
        new_status: string;
        comment: string | null;
        created_at: Date | string;
        admin_id: string;
      }>(
        `
          SELECT
            id,
            COALESCE(previous_status::text, '') AS previous_status,
            new_status::text AS new_status,
            comment,
            created_at,
            admin_id
          FROM public.contractor_verification_logs
          WHERE contractor_id = $1::uuid
          ORDER BY created_at DESC
        `,
        [contractorId]
      ),
    ]);

    const owner = ownerResult.rows[0]
      ? {
          ...ownerResult.rows[0],
          created_at: toIsoString(ownerResult.rows[0].created_at),
        }
      : null;

    const logs = logsResult.rows.map((log) => ({
      ...log,
      created_at: toIsoString(log.created_at),
    }));

    return { company, owner, logs };
  } catch (error) {
    console.error("Ошибка загрузки подрядчика:", error);
    throw new Error("Не удалось загрузить профиль подрядчика");
  }
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}
