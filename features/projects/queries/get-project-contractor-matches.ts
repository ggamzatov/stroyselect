import "server-only";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

type ProjectRow = {
  id: string;
  customer_id: string;
  category_id: number | string | null;
  region: string | null;
  city: string | null;
  budget_min: number | string | null;
  budget_max: number | string | null;
};

type MatchRow = {
  contractor_id: string;
  public_name: string;
  company_type: string | null;
  rating: number | string | null;
  rating_count: number;
  completed_projects_count: number;
  stroyselect_score: number | string | null;
  minimum_project_budget: number | string | null;
  maximum_project_budget: number | string | null;
  is_primary_service: boolean;
  years_experience: number | null;
  exact_city_match: boolean;
  region_match: boolean;
  budget_match: boolean;
  match_score: number | string;
};

export type ProjectContractorMatch = {
  contractorId: string;
  publicName: string;
  companyType: string | null;
  rating: number;
  ratingCount: number;
  completedProjectsCount: number;
  recommendationScore: number;
  stroyselectScore: number;
  minimumProjectBudget: number | null;
  maximumProjectBudget: number | null;
  yearsExperience: number | null;
  matchScore: number;
  reasons: string[];
};

export async function getProjectContractorMatches(
  projectId: string,
  limit = 6
): Promise<ProjectContractorMatch[]> {
  const auth = await requireActiveUser();

  if (!auth.success || auth.profile.role !== "customer") {
    return [];
  }

  const projectResult = await db.query<ProjectRow>(
    `
      SELECT
        id,
        customer_id,
        category_id,
        region,
        city,
        budget_min,
        budget_max
      FROM public.projects
      WHERE id = $1
        AND customer_id = $2
      LIMIT 1
    `,
    [projectId, auth.user.id]
  );

  const project = projectResult.rows[0];

  if (!project || project.category_id === null) {
    return [];
  }

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);

  const result = await db.query<MatchRow>(
    `
      SELECT
        cc.id AS contractor_id,
        cc.public_name,
        cc.company_type,
        cc.rating,
        cc.rating_count,
        cc.completed_projects_count,
        score.stroyselect_score,
        cc.minimum_project_budget,
        cc.maximum_project_budget,
        cs.is_primary AS is_primary_service,
        cs.years_experience,

        EXISTS (
          SELECT 1
          FROM public.contractor_service_areas csa
          WHERE csa.contractor_id = cc.id
            AND lower(trim(csa.city)) = lower(trim($2))
        ) AS exact_city_match,

        EXISTS (
          SELECT 1
          FROM public.contractor_service_areas csa
          WHERE csa.contractor_id = cc.id
            AND $3 <> ''
            AND lower(trim(coalesce(csa.region, ''))) = lower(trim($3))
        ) AS region_match,

        CASE
          WHEN $4::numeric IS NULL AND $5::numeric IS NULL THEN true
          WHEN cc.minimum_project_budget IS NULL
            AND cc.maximum_project_budget IS NULL THEN true
          ELSE
            coalesce(cc.minimum_project_budget, 0) <= coalesce($5::numeric, $4::numeric, 999999999999)
            AND coalesce(cc.maximum_project_budget, 999999999999) >= coalesce($4::numeric, $5::numeric, 0)
        END AS budget_match,

        round(
          35
          + CASE WHEN cs.is_primary THEN 5 ELSE 0 END
          + CASE
              WHEN EXISTS (
                SELECT 1
                FROM public.contractor_service_areas csa
                WHERE csa.contractor_id = cc.id
                  AND lower(trim(csa.city)) = lower(trim($2))
              ) THEN 20
              WHEN EXISTS (
                SELECT 1
                FROM public.contractor_service_areas csa
                WHERE csa.contractor_id = cc.id
                  AND $3 <> ''
                  AND lower(trim(coalesce(csa.region, ''))) = lower(trim($3))
              ) THEN 10
              ELSE 0
            END
          + CASE
              WHEN $4::numeric IS NULL AND $5::numeric IS NULL THEN 8
              WHEN cc.minimum_project_budget IS NULL
                AND cc.maximum_project_budget IS NULL THEN 6
              WHEN coalesce(cc.minimum_project_budget, 0) <= coalesce($5::numeric, $4::numeric, 999999999999)
                AND coalesce(cc.maximum_project_budget, 999999999999) >= coalesce($4::numeric, $5::numeric, 0)
              THEN 15
              ELSE 0
            END
          + least(greatest(coalesce(score.stroyselect_score, 0), 0), 100) * 0.20
          + least(greatest(coalesce(cc.rating, 0), 0), 5)
        , 1) AS match_score

      FROM public.contractor_companies cc
      JOIN public.contractor_services cs
        ON cs.contractor_id = cc.id
       AND cs.category_id = $1
      LEFT JOIN public.contractor_score_components score
        ON score.contractor_id = cc.id

      WHERE cc.verification_status = 'verified'
        AND cc.accepts_new_projects = true
        AND cc.owner_id <> $6

      ORDER BY
        match_score DESC,
        score.stroyselect_score DESC NULLS LAST,
        cc.rating DESC NULLS LAST,
        cc.completed_projects_count DESC,
        cc.created_at ASC

      LIMIT $7
    `,
    [
      Number(project.category_id),
      project.city ?? "",
      project.region ?? "",
      toNullableNumber(project.budget_min),
      toNullableNumber(project.budget_max),
      auth.user.id,
      safeLimit,
    ]
  );

  return result.rows.map((row) => {
    const reasons: string[] = ["Работает по нужной категории"];
    const stroyselectScore = safeNumber(row.stroyselect_score);

    if (row.is_primary_service) {
      reasons.push("Это основная специализация");
    }

    if (row.exact_city_match) {
      reasons.push("Работает в вашем городе");
    } else if (row.region_match) {
      reasons.push("Работает в вашем регионе");
    }

    if (row.budget_match) {
      reasons.push("Бюджет подходит");
    }

    if (stroyselectScore >= 80) {
      reasons.push("Высокий StroySelect Score");
    }

    if (Number(row.rating ?? 0) >= 4.5 && row.rating_count > 0) {
      reasons.push("Высокий рейтинг");
    }

    if (row.completed_projects_count > 0) {
      reasons.push("Есть завершённые проекты");
    }

    return {
      contractorId: row.contractor_id,
      publicName: row.public_name,
      companyType: row.company_type,
      rating: safeNumber(row.rating),
      ratingCount: Math.max(0, Number(row.rating_count) || 0),
      completedProjectsCount: Math.max(
        0,
        Number(row.completed_projects_count) || 0
      ),
      recommendationScore: stroyselectScore,
      stroyselectScore,
      minimumProjectBudget: toNullableNumber(row.minimum_project_budget),
      maximumProjectBudget: toNullableNumber(row.maximum_project_budget),
      yearsExperience: row.years_experience,
      matchScore: Math.min(100, Math.max(0, safeNumber(row.match_score))),
      reasons: reasons.slice(0, 5),
    };
  });
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
