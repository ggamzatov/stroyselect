import "server-only";

import { db } from "@/lib/db/pool";

export type ContractorReviewFilter =
  | "pending"
  | "verified"
  | "rejected"
  | "suspended"
  | "all";

type ContractorRow = {
  id: string;
  owner_id: string;
  public_name: string;
  legal_name: string | null;
  company_type: string | null;
  inn: string | null;
  ogrn: string | null;
  contact_phone: string | null;
  accepts_new_projects: boolean;
  verification_status: string;
  verification_comment: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
  contractor_services: Array<{
    category_id: string | number;
    service_categories: {
      id: string | number;
      name: string;
    } | null;
  }>;
  contractor_service_areas: Array<{
    city: string;
    region: string | null;
    is_primary: boolean;
  }>;
};

export async function getContractorsForReview(filter: ContractorReviewFilter = "pending") {
  const values: unknown[] = [];
  const filterSql = filter === "all" ? "" : `WHERE cc.verification_status = $1`;

  if (filter !== "all") values.push(filter);

  try {
    const result = await db.query<ContractorRow>(
      `
        SELECT
          cc.id,
          cc.owner_id,
          cc.public_name,
          cc.legal_name,
          cc.company_type::text AS company_type,
          cc.inn,
          cc.ogrn,
          cc.contact_phone,
          cc.accepts_new_projects,
          cc.verification_status::text AS verification_status,
          cc.verification_comment,
          cc.created_at,
          cc.updated_at,
          jsonb_build_object(
            'first_name', p.first_name,
            'last_name', p.last_name,
            'phone', p.phone
          ) AS profiles,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'category_id', cs.category_id,
                'service_categories', jsonb_build_object(
                  'id', sc.id,
                  'name', sc.name
                )
              )
              ORDER BY sc.name
            )
            FROM public.contractor_services cs
            LEFT JOIN public.service_categories sc ON sc.id = cs.category_id
            WHERE cs.contractor_id = cc.id
          ), '[]'::jsonb) AS contractor_services,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'city', csa.city,
                'region', csa.region,
                'is_primary', csa.is_primary
              )
              ORDER BY csa.is_primary DESC, csa.city
            )
            FROM public.contractor_service_areas csa
            WHERE csa.contractor_id = cc.id
          ), '[]'::jsonb) AS contractor_service_areas
        FROM public.contractor_companies cc
        LEFT JOIN public.profiles p ON p.id = cc.owner_id
        ${filterSql}
        ORDER BY cc.updated_at DESC
      `,
      values
    );

    return result.rows.map((row) => ({
      ...row,
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
    }));
  } catch (error) {
    console.error("Ошибка загрузки подрядчиков:", error);
    throw new Error("Не удалось загрузить подрядчиков");
  }
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}
