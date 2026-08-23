import "server-only";

import { redirect } from "next/navigation";

import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";

type CompanyRow = {
  id: string;
  owner_id: string;
  public_name: string;
  verification_status: string;
  accepts_new_projects: boolean;
};

type ProjectRow = {
  id: string;
  category_id: number | string | null;
  title: string;
  description: string | null;
  property_type: string | null;
  region: string | null;
  city: string | null;
  budget_min: string | number | null;
  budget_max: string | number | null;
  desired_start_date: Date | string | null;
  desired_end_date: Date | string | null;
  status: string;
  published_at: Date | string | null;
  created_at: Date | string;
  category_name: string | null;
  is_primary_service: boolean;
  exact_city_match: boolean;
  region_match: boolean;
  budget_match: boolean;
  is_invited: boolean;
  relevant_category_projects: number | string | null;
  same_property_projects: number | string | null;
  match_score: string | number;
};

type BidRow = {
  id: string;
  project_id: string;
  contractor_id: string;
  status: string;
};

export async function getAvailableProjects() {
  const userId = await getCurrentSessionUserId();
  if (!userId) redirect("/login");

  const companyResult = await db.query<CompanyRow>(
    `SELECT id, owner_id, public_name, verification_status, accepts_new_projects
     FROM public.contractor_companies
     WHERE owner_id = $1::uuid
     LIMIT 1`,
    [userId]
  );

  const company = companyResult.rows[0];
  if (!company) return { company: null, projects: [], debugMessage: "Компания подрядчика не найдена" };
  if (company.verification_status !== "verified") return { company, projects: [], debugMessage: `Статус подрядчика: ${company.verification_status}` };
  if (!company.accepts_new_projects) return { company, projects: [], debugMessage: "Подрядчик не принимает новые проекты" };

  try {
    const [projectsResult, bidsResult] = await Promise.all([
      db.query<ProjectRow>(
        `
          SELECT
            p.id, p.category_id, p.title, p.description, p.property_type,
            p.region, p.city, p.budget_min, p.budget_max,
            p.desired_start_date, p.desired_end_date, p.status,
            p.published_at, p.created_at,
            sc.name AS category_name,
            cs.is_primary AS is_primary_service,
            EXISTS (
              SELECT 1 FROM public.contractor_service_areas csa
              WHERE csa.contractor_id = $1::uuid
                AND lower(trim(csa.city)) = lower(trim(coalesce(p.city, '')))
            ) AS exact_city_match,
            EXISTS (
              SELECT 1 FROM public.contractor_service_areas csa
              WHERE csa.contractor_id = $1::uuid
                AND coalesce(trim(p.region), '') <> ''
                AND lower(trim(coalesce(csa.region, ''))) = lower(trim(p.region))
            ) AS region_match,
            CASE
              WHEN p.budget_min IS NULL AND p.budget_max IS NULL THEN true
              WHEN cc.minimum_project_budget IS NULL AND cc.maximum_project_budget IS NULL THEN true
              ELSE coalesce(cc.minimum_project_budget, 0) <= coalesce(p.budget_max, p.budget_min, 999999999999)
                AND coalesce(cc.maximum_project_budget, 999999999999) >= coalesce(p.budget_min, p.budget_max, 0)
            END AS budget_match,
            EXISTS (
              SELECT 1
              FROM public.project_contractor_invitations pci
              WHERE pci.project_id = p.id
                AND pci.contractor_id = $1::uuid
                AND pci.status <> 'cancelled'
            ) AS is_invited,
            exp.relevant_category_projects,
            exp.same_property_projects,
            round(
              40
              + CASE WHEN cs.is_primary THEN 5 ELSE 0 END
              + CASE
                  WHEN EXISTS (
                    SELECT 1 FROM public.contractor_service_areas csa
                    WHERE csa.contractor_id = $1::uuid
                      AND lower(trim(csa.city)) = lower(trim(coalesce(p.city, '')))
                  ) THEN 25
                  WHEN EXISTS (
                    SELECT 1 FROM public.contractor_service_areas csa
                    WHERE csa.contractor_id = $1::uuid
                      AND coalesce(trim(p.region), '') <> ''
                      AND lower(trim(coalesce(csa.region, ''))) = lower(trim(p.region))
                  ) THEN 15 ELSE 0
                END
              + CASE
                  WHEN p.budget_min IS NULL AND p.budget_max IS NULL THEN 12
                  WHEN cc.minimum_project_budget IS NULL AND cc.maximum_project_budget IS NULL THEN 10
                  WHEN coalesce(cc.minimum_project_budget, 0) <= coalesce(p.budget_max, p.budget_min, 999999999999)
                    AND coalesce(cc.maximum_project_budget, 999999999999) >= coalesce(p.budget_min, p.budget_max, 0)
                  THEN 20 ELSE 0
                END
              + least(exp.relevant_category_projects, 4) * 2
              + least(exp.same_property_projects, 2)
            , 1) AS match_score
          FROM public.projects p
          JOIN public.contractor_services cs
            ON cs.contractor_id = $1::uuid
           AND cs.category_id = p.category_id
          JOIN public.contractor_companies cc ON cc.id = $1::uuid
          LEFT JOIN public.service_categories sc ON sc.id = p.category_id
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*) FILTER (
                WHERE hp.status::text='completed' AND hp.category_id=p.category_id
              )::int AS relevant_category_projects,
              COUNT(*) FILTER (
                WHERE hp.status::text='completed'
                  AND coalesce(p.property_type::text,'') <> ''
                  AND hp.property_type::text=p.property_type::text
              )::int AS same_property_projects
            FROM public.projects hp
            WHERE hp.selected_contractor_id=$1::uuid
          ) exp ON true
          WHERE p.status IN ('published', 'collecting_bids')
            AND (
              EXISTS (
                SELECT 1 FROM public.contractor_service_areas csa
                WHERE csa.contractor_id = $1::uuid
                  AND lower(trim(csa.city)) = lower(trim(coalesce(p.city, '')))
              )
              OR EXISTS (
                SELECT 1 FROM public.contractor_service_areas csa
                WHERE csa.contractor_id = $1::uuid
                  AND coalesce(trim(p.region), '') <> ''
                  AND lower(trim(coalesce(csa.region, ''))) = lower(trim(p.region))
              )
            )
          ORDER BY
            is_invited DESC,
            match_score DESC,
            p.published_at DESC NULLS LAST,
            p.created_at DESC
        `,
        [company.id]
      ),
      db.query<BidRow>(
        `SELECT id, project_id, contractor_id, status
         FROM public.project_bids
         WHERE contractor_id = $1::uuid`,
        [company.id]
      ),
    ]);

    const bidsByProject = new Map<string, BidRow[]>();
    for (const bid of bidsResult.rows) {
      const current = bidsByProject.get(bid.project_id) ?? [];
      current.push(bid);
      bidsByProject.set(bid.project_id, current);
    }

    const projects = projectsResult.rows.map((row) => {
      const relevantCategoryProjects = Math.max(0, Number(row.relevant_category_projects) || 0);
      const samePropertyProjects = Math.max(0, Number(row.same_property_projects) || 0);
      const reasons = ["Подходит специализация"];
      if (row.is_primary_service) reasons.push("Основная специализация");
      if (row.exact_city_match) reasons.push("Ваш город");
      else if (row.region_match) reasons.push("Ваш регион");
      if (row.budget_match) reasons.push("Подходит бюджет");
      if (relevantCategoryProjects > 0) reasons.push(`Есть опыт: ${relevantCategoryProjects} завершённых проектов по этой услуге`);
      if (samePropertyProjects > 0) reasons.push("Есть опыт на таком типе объекта");

      return {
        id: row.id,
        category_id: row.category_id !== null ? Number(row.category_id) : null,
        title: row.title,
        description: row.description,
        property_type: row.property_type,
        region: row.region,
        city: row.city,
        budget_min: toNullableNumber(row.budget_min),
        budget_max: toNullableNumber(row.budget_max),
        desired_start_date: toNullableDateString(row.desired_start_date),
        desired_end_date: toNullableDateString(row.desired_end_date),
        status: row.status,
        published_at: row.published_at ? toIsoString(row.published_at) : null,
        created_at: toIsoString(row.created_at),
        match_score: Math.min(100, Math.max(0, Number(row.match_score) || 0)),
        match_reasons: reasons.slice(0, 6),
        is_invited: Boolean(row.is_invited),
        service_categories: row.category_id && row.category_name
          ? { id: Number(row.category_id), name: row.category_name }
          : null,
        project_bids: bidsByProject.get(row.id) ?? [],
      };
    });

    return { company, projects, debugMessage: null };
  } catch (error) {
    console.error("Ошибка загрузки доступных проектов:", error);
    return { company, projects: [], debugMessage: "Не удалось загрузить проекты" };
  }
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toNullableDateString(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}
