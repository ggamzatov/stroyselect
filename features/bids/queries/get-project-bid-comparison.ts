import "server-only";

import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";

type Row = {
  bid_id: string;
  project_id: string;
  project_title: string;
  project_budget_max: string | number | null;
  contractor_id: string;
  public_name: string;
  rating: string | number;
  rating_count: number;
  completed_projects_count: number;
  stroyselect_score: string | number | null;
  price: string | number;
  duration_days: number;
  proposed_start_date: Date | string | null;
  message: string | null;
  status: string;
  scope_summary: string | null;
  materials_summary: string | null;
  exclusions: string | null;
  payment_terms: string | null;
  warranty_months: number | null;
  price_includes_materials: boolean;
  completeness_score: number;
};

export type BidComparisonItem = ReturnType<typeof mapRow> & {
  comparisonScore: number;
  riskFlags: string[];
};

export async function getProjectBidComparison(projectId: string) {
  const userId = await getCurrentSessionUserId();
  if (!userId) redirect("/login");

  const projectResult = await db.query<{ id: string; title: string }>(`
    SELECT id, title
    FROM public.projects
    WHERE id = $1 AND customer_id = $2
    LIMIT 1
  `, [projectId, userId]);

  const project = projectResult.rows[0];
  if (!project) notFound();

  const result = await db.query<Row>(`
    SELECT
      pb.id AS bid_id,
      pb.project_id,
      p.title AS project_title,
      p.budget_max AS project_budget_max,
      cc.id AS contractor_id,
      cc.public_name,
      cc.rating,
      cc.rating_count,
      cc.completed_projects_count,
      score.stroyselect_score,
      pb.price,
      pb.duration_days,
      pb.proposed_start_date,
      pb.message,
      pb.status,
      pb.scope_summary,
      pb.materials_summary,
      pb.exclusions,
      pb.payment_terms,
      pb.warranty_months,
      pb.price_includes_materials,
      pb.completeness_score
    FROM public.project_bids pb
    JOIN public.projects p ON p.id = pb.project_id
    JOIN public.contractor_companies cc ON cc.id = pb.contractor_id
    LEFT JOIN public.contractor_score_components score ON score.contractor_id = cc.id
    WHERE pb.project_id = $1
      AND p.customer_id = $2
      AND pb.status <> 'withdrawn'
    ORDER BY pb.created_at ASC
  `, [projectId, userId]);

  const base = result.rows.map(mapRow);
  const minPrice = Math.min(...base.map((item) => item.price), Infinity);
  const minDuration = Math.min(...base.map((item) => item.durationDays), Infinity);

  const bids: BidComparisonItem[] = base.map((item) => {
    const priceScore = minPrice === Infinity ? 0 : Math.min(100, (minPrice / item.price) * 100);
    const durationScore = minDuration === Infinity ? 0 : Math.min(100, (minDuration / item.durationDays) * 100);
    const ratingScore = item.ratingCount > 0 ? Math.min(100, (item.rating / 5) * 100) : 55;
    const reputationScore = Math.min(100, Math.max(0, item.stroyselectScore));

    const comparisonScore = Math.round(
      item.completenessScore * 0.30 +
      priceScore * 0.25 +
      durationScore * 0.15 +
      ratingScore * 0.10 +
      reputationScore * 0.20
    );

    const riskFlags: string[] = [];
    if (!item.proposedStartDate) riskFlags.push("Не указана дата старта");
    if (item.warrantyMonths === null || item.warrantyMonths === 0) riskFlags.push("Нет гарантии на работы");
    if (!item.priceIncludesMaterials) riskFlags.push("Материалы оплачиваются отдельно");
    if (item.completenessScore < 85) riskFlags.push("Предложение заполнено не полностью");
    if (item.stroyselectScore < 50) riskFlags.push("Низкий StroySelect Score");
    if (item.projectBudgetMax !== null && item.price > item.projectBudgetMax) riskFlags.push("Цена выше бюджета проекта");

    return { ...item, comparisonScore, riskFlags };
  }).sort((a, b) => b.comparisonScore - a.comparisonScore);

  return { project, bids };
}

function mapRow(row: Row) {
  const stroyselectScore = safeNumber(row.stroyselect_score);

  return {
    id: row.bid_id,
    projectId: row.project_id,
    projectTitle: row.project_title,
    projectBudgetMax: toNullableNumber(row.project_budget_max),
    contractorId: row.contractor_id,
    publicName: row.public_name,
    rating: Number(row.rating),
    ratingCount: row.rating_count,
    completedProjectsCount: row.completed_projects_count,
    recommendationScore: stroyselectScore,
    stroyselectScore,
    price: Number(row.price),
    durationDays: row.duration_days,
    proposedStartDate: row.proposed_start_date ? toDateString(row.proposed_start_date) : null,
    message: row.message,
    status: row.status,
    scopeSummary: row.scope_summary,
    materialsSummary: row.materials_summary,
    exclusions: row.exclusions,
    paymentTerms: row.payment_terms,
    warrantyMonths: row.warranty_months,
    priceIncludesMaterials: row.price_includes_materials,
    completenessScore: row.completeness_score,
  };
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 0;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toDateString(value: Date | string) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}
