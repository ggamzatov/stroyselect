import "server-only";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

type ProjectRow = {
  id: string;
  customer_id: string;
  category_id: number | string | null;
  property_type: string | null;
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
  invitation_status: string | null;
  shortlisted_at: Date | string | null;
  preference: string | null;
  invitations_total: number;
  invitations_answered: number;
  response_rate: number | string | null;
  avg_response_hours: number | string | null;
  bids_total: number;
  bid_win_rate: number | string | null;
  selected_projects: number;
  completion_rate: number | string | null;
  dispute_free_rate: number | string | null;
  reviews_total: number;
  avg_rating: number | string | null;
  avg_deadline: number | string | null;
  relevant_category_projects: number | string | null;
  same_property_projects: number | string | null;
  match_score: number | string;
};

export type MatchScoreComponents = {
  category: number;
  primaryService: number;
  geography: number;
  budget: number;
  relevantExperience: number;
  propertyExperience: number;
  stroyselectScore: number;
  rating: number;
  response: number;
  completion: number;
  disputeFree: number;
  bidWin: number;
  deadline: number;
  responseSpeed: number;
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
  scoreComponents: MatchScoreComponents;
  relevantCategoryProjects: number;
  samePropertyProjects: number;
  reasons: string[];
  isInvited: boolean;
  invitationStatus: string | null;
  isShortlisted: boolean;
  isSaved: boolean;
  responseRate: number;
  completionRate: number;
  disputeFreeRate: number;
  bidWinRate: number;
  averageResponseHours: number;
};

export async function getProjectContractorMatches(
  projectId: string,
  limit = 6
): Promise<ProjectContractorMatch[]> {
  const auth = await requireActiveUser();
  if (!auth.success || auth.profile.role !== "customer") return [];

  const projectResult = await db.query<ProjectRow>(
    `SELECT id, customer_id, category_id, property_type, region, city, budget_min, budget_max
     FROM public.projects
     WHERE id = $1::uuid AND customer_id = $2::uuid
     LIMIT 1`,
    [projectId, auth.user.id]
  );

  const project = projectResult.rows[0];
  if (!project || project.category_id === null) return [];
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
          SELECT 1 FROM public.contractor_service_areas csa
          WHERE csa.contractor_id = cc.id
            AND lower(trim(csa.city)) = lower(trim($2))
        ) AS exact_city_match,
        EXISTS (
          SELECT 1 FROM public.contractor_service_areas csa
          WHERE csa.contractor_id = cc.id
            AND $3 <> ''
            AND lower(trim(coalesce(csa.region, ''))) = lower(trim($3))
        ) AS region_match,
        CASE
          WHEN $4::numeric IS NULL AND $5::numeric IS NULL THEN true
          WHEN cc.minimum_project_budget IS NULL AND cc.maximum_project_budget IS NULL THEN true
          ELSE coalesce(cc.minimum_project_budget, 0) <= coalesce($5::numeric, $4::numeric, 999999999999)
            AND coalesce(cc.maximum_project_budget, 999999999999) >= coalesce($4::numeric, $5::numeric, 0)
        END AS budget_match,
        pci.status AS invitation_status,
        pci.shortlisted_at,
        pref.preference,
        perf.invitations_total,
        perf.invitations_answered,
        perf.response_rate,
        perf.avg_response_hours,
        perf.bids_total,
        perf.bid_win_rate,
        perf.selected_projects,
        perf.completion_rate,
        perf.dispute_free_rate,
        perf.reviews_total,
        perf.avg_rating,
        perf.avg_deadline,
        exp.relevant_category_projects,
        exp.same_property_projects,
        round(
          20
          + CASE WHEN cs.is_primary THEN 5 ELSE 0 END
          + CASE
              WHEN EXISTS (
                SELECT 1 FROM public.contractor_service_areas csa
                WHERE csa.contractor_id = cc.id
                  AND lower(trim(csa.city)) = lower(trim($2))
              ) THEN 20
              WHEN EXISTS (
                SELECT 1 FROM public.contractor_service_areas csa
                WHERE csa.contractor_id = cc.id
                  AND $3 <> ''
                  AND lower(trim(coalesce(csa.region, ''))) = lower(trim($3))
              ) THEN 10 ELSE 0
            END
          + CASE
              WHEN $4::numeric IS NULL AND $5::numeric IS NULL THEN 8
              WHEN cc.minimum_project_budget IS NULL AND cc.maximum_project_budget IS NULL THEN 6
              WHEN coalesce(cc.minimum_project_budget, 0) <= coalesce($5::numeric, $4::numeric, 999999999999)
                AND coalesce(cc.maximum_project_budget, 999999999999) >= coalesce($4::numeric, $5::numeric, 0)
              THEN 12 ELSE 0
            END
          + least(exp.relevant_category_projects, 5) * 1.6
          + least(exp.same_property_projects, 4)
          + CASE
              WHEN score.stroyselect_score IS NULL THEN 4
              ELSE least(greatest(score.stroyselect_score, 0), 100) * 0.08
            END
          + CASE
              WHEN coalesce(perf.reviews_total, 0) = 0 THEN 2.5
              ELSE least(greatest(coalesce(perf.avg_rating, 0), 0), 5)
            END
          + CASE
              WHEN coalesce(perf.invitations_total, 0) = 0 THEN 2
              ELSE least(greatest(coalesce(perf.response_rate, 0), 0), 100) * 0.04
            END
          + CASE
              WHEN coalesce(perf.selected_projects, 0) = 0 THEN 2.5
              ELSE least(greatest(coalesce(perf.completion_rate, 0), 0), 100) * 0.05
            END
          + CASE
              WHEN coalesce(perf.selected_projects, 0) = 0 THEN 2
              ELSE least(greatest(coalesce(perf.dispute_free_rate, 0), 0), 100) * 0.04
            END
          + CASE
              WHEN coalesce(perf.bids_total, 0) = 0 THEN 1
              ELSE least(greatest(coalesce(perf.bid_win_rate, 0), 0), 100) * 0.02
            END
          + CASE
              WHEN coalesce(perf.reviews_total, 0) = 0 THEN 1
              ELSE least(greatest(coalesce(perf.avg_deadline, 0), 0), 5) * 0.4
            END
          + CASE
              WHEN coalesce(perf.invitations_answered, 0) = 0 THEN 0.5
              WHEN perf.avg_response_hours <= 4 THEN 1
              WHEN perf.avg_response_hours <= 12 THEN 0.8
              WHEN perf.avg_response_hours <= 24 THEN 0.6
              WHEN perf.avg_response_hours <= 48 THEN 0.3
              ELSE 0.1
            END
        , 1) AS match_score
      FROM public.contractor_companies cc
      JOIN public.contractor_services cs
        ON cs.contractor_id = cc.id AND cs.category_id = $1
      LEFT JOIN public.contractor_score_components score ON score.contractor_id = cc.id
      LEFT JOIN public.contractor_performance_metrics perf ON perf.contractor_id = cc.id
      LEFT JOIN public.project_contractor_invitations pci
        ON pci.project_id=$7::uuid AND pci.contractor_id=cc.id
      LEFT JOIN public.project_contractor_preferences pref
        ON pref.project_id=$7::uuid AND pref.contractor_id=cc.id AND pref.customer_id=$6::uuid
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (
            WHERE hp.status::text='completed' AND hp.category_id=$1
          )::int AS relevant_category_projects,
          COUNT(*) FILTER (
            WHERE hp.status::text='completed'
              AND $9 <> ''
              AND hp.property_type::text=$9
          )::int AS same_property_projects
        FROM public.projects hp
        WHERE hp.selected_contractor_id=cc.id
      ) exp ON true
      WHERE cc.verification_status = 'verified'
        AND cc.accepts_new_projects = true
        AND cc.owner_id <> $6::uuid
        AND coalesce(pref.preference, '') <> 'dismissed'
      ORDER BY
        (pref.preference = 'saved') DESC,
        (pci.shortlisted_at IS NOT NULL) DESC,
        match_score DESC,
        score.stroyselect_score DESC NULLS LAST,
        perf.avg_rating DESC NULLS LAST,
        cc.completed_projects_count DESC,
        cc.created_at ASC
      LIMIT $8
    `,
    [
      Number(project.category_id),
      project.city ?? "",
      project.region ?? "",
      toNullableNumber(project.budget_min),
      toNullableNumber(project.budget_max),
      auth.user.id,
      projectId,
      safeLimit,
      project.property_type ?? "",
    ]
  );

  const matches = result.rows.map((row) => normalizeMatch(row));
  await persistMatchSnapshots(projectId, auth.user.id, matches);
  return matches;
}

function normalizeMatch(row: MatchRow): ProjectContractorMatch {
  const stroyselectScore = safeNumber(row.stroyselect_score);
  const responseRate = safeNumber(row.response_rate);
  const completionRate = safeNumber(row.completion_rate);
  const disputeFreeRate = safeNumber(row.dispute_free_rate);
  const bidWinRate = safeNumber(row.bid_win_rate);
  const relevantCategoryProjects = Math.max(0, Number(row.relevant_category_projects) || 0);
  const samePropertyProjects = Math.max(0, Number(row.same_property_projects) || 0);
  const reviewsTotal = Math.max(0, Number(row.reviews_total) || 0);
  const invitationsTotal = Math.max(0, Number(row.invitations_total) || 0);
  const invitationsAnswered = Math.max(0, Number(row.invitations_answered) || 0);
  const selectedProjects = Math.max(0, Number(row.selected_projects) || 0);
  const bidsTotal = Math.max(0, Number(row.bids_total) || 0);
  const averageResponseHours = safeNumber(row.avg_response_hours);

  const components: MatchScoreComponents = {
    category: 20,
    primaryService: row.is_primary_service ? 5 : 0,
    geography: row.exact_city_match ? 20 : row.region_match ? 10 : 0,
    budget: row.budget_match ? 12 : 0,
    relevantExperience: round1(Math.min(relevantCategoryProjects, 5) * 1.6),
    propertyExperience: Math.min(samePropertyProjects, 4),
    stroyselectScore: row.stroyselect_score === null
      ? 4
      : round1(Math.min(Math.max(stroyselectScore, 0), 100) * 0.08),
    rating: reviewsTotal === 0 ? 2.5 : round1(Math.min(Math.max(safeNumber(row.avg_rating), 0), 5)),
    response: invitationsTotal === 0 ? 2 : round1(Math.min(Math.max(responseRate, 0), 100) * 0.04),
    completion: selectedProjects === 0 ? 2.5 : round1(Math.min(Math.max(completionRate, 0), 100) * 0.05),
    disputeFree: selectedProjects === 0 ? 2 : round1(Math.min(Math.max(disputeFreeRate, 0), 100) * 0.04),
    bidWin: bidsTotal === 0 ? 1 : round1(Math.min(Math.max(bidWinRate, 0), 100) * 0.02),
    deadline: reviewsTotal === 0 ? 1 : round1(Math.min(Math.max(safeNumber(row.avg_deadline), 0), 5) * 0.4),
    responseSpeed: responseSpeedScore(invitationsAnswered, averageResponseHours),
  };

  const reasons: string[] = ["Работает по нужной категории"];
  if (row.is_primary_service) reasons.push("Это основная специализация");
  if (row.exact_city_match) reasons.push("Работает в вашем городе");
  else if (row.region_match) reasons.push("Работает в вашем регионе");
  if (row.budget_match) reasons.push("Бюджет подходит");
  if (relevantCategoryProjects > 0) reasons.push(`${relevantCategoryProjects} завершённых проектов в этой категории`);
  if (samePropertyProjects > 0) reasons.push("Есть опыт на таком типе объекта");
  if (reviewsTotal > 0 && safeNumber(row.avg_rating) >= 4.5) reasons.push("Высокие оценки заказчиков");
  if (responseRate >= 80 && invitationsTotal > 0) reasons.push("Стабильно отвечает на приглашения");
  if (averageResponseHours > 0 && averageResponseHours <= 12) reasons.push("Быстро отвечает");
  if (completionRate >= 85 && selectedProjects > 0) reasons.push("Высокая доля завершённых проектов");
  if (disputeFreeRate >= 95 && selectedProjects > 0) reasons.push("Высокая доля проектов без споров");
  if (bidWinRate >= 35 && bidsTotal >= 3) reasons.push("Предложения часто выбирают заказчики");
  if (stroyselectScore >= 80) reasons.push("Высокий рейтинг СтройВыбор");

  return {
    contractorId: row.contractor_id,
    publicName: row.public_name,
    companyType: row.company_type,
    rating: safeNumber(row.rating),
    ratingCount: Math.max(0, Number(row.rating_count) || 0),
    completedProjectsCount: Math.max(0, Number(row.completed_projects_count) || 0),
    recommendationScore: stroyselectScore,
    stroyselectScore,
    minimumProjectBudget: toNullableNumber(row.minimum_project_budget),
    maximumProjectBudget: toNullableNumber(row.maximum_project_budget),
    yearsExperience: row.years_experience,
    matchScore: Math.min(100, Math.max(0, safeNumber(row.match_score))),
    scoreComponents: components,
    relevantCategoryProjects,
    samePropertyProjects,
    reasons: reasons.slice(0, 8),
    isInvited: Boolean(row.invitation_status && row.invitation_status !== "cancelled"),
    invitationStatus: row.invitation_status,
    isShortlisted: Boolean(row.shortlisted_at),
    isSaved: row.preference === "saved",
    responseRate,
    completionRate,
    disputeFreeRate,
    bidWinRate,
    averageResponseHours,
  };
}

async function persistMatchSnapshots(
  projectId: string,
  customerId: string,
  matches: ProjectContractorMatch[]
) {
  try {
    await Promise.all(matches.map((match) => db.query(
      `INSERT INTO public.project_match_snapshots(
         project_id, contractor_id, customer_id, match_score, components, reasons, source_version, generated_at
       ) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5::jsonb,$6::text[],'matching-v3',now())
       ON CONFLICT(project_id,contractor_id) DO UPDATE SET
         customer_id=EXCLUDED.customer_id,
         match_score=EXCLUDED.match_score,
         components=EXCLUDED.components,
         reasons=EXCLUDED.reasons,
         source_version=EXCLUDED.source_version,
         generated_at=now()`,
      [projectId, match.contractorId, customerId, match.matchScore, JSON.stringify(match.scoreComponents), match.reasons]
    )));
  } catch (error) {
    console.error("Не удалось сохранить snapshot matching:", error);
  }
}

function responseSpeedScore(answered: number, hours: number) {
  if (answered === 0) return 0.5;
  if (hours <= 4) return 1;
  if (hours <= 12) return 0.8;
  if (hours <= 24) return 0.6;
  if (hours <= 48) return 0.3;
  return 0.1;
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function round1(value: number) {
  return Math.round(value * 10) / 10;
}
