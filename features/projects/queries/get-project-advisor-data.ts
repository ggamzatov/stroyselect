import "server-only";

import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";

type ProjectRow = {
  id: string;
  title: string;
  status: string;
  selected_contractor_id: string | null;
};

type CandidateRow = {
  contractor_id: string;
  public_name: string;
  rating: string | number | null;
  rating_count: number;
  completed_projects_count: number;
  score: string | number | null;
  stage: string | null;
  note: string | null;
  last_contact_at: Date | string | null;
  next_follow_up_at: Date | string | null;
  updated_at: Date | string | null;
  bid_id: string | null;
  bid_status: string | null;
  bid_price: string | number | null;
  bid_duration_days: number | null;
};

type TaskRow = {
  id: string;
  title: string;
  due_at: Date | string | null;
  is_completed: boolean;
  completed_at: Date | string | null;
  created_at: Date | string;
};

type ActivityRow = {
  id: string;
  contractor_id: string | null;
  activity_type: string;
  details: unknown;
  created_at: Date | string;
  public_name: string | null;
};

export async function getProjectAdvisorData(projectId: string) {
  const userId = await getCurrentSessionUserId();
  if (!userId) redirect("/login");

  const projectResult = await db.query<ProjectRow>(
    `
      SELECT id, title, status, selected_contractor_id
      FROM public.projects
      WHERE id = $1 AND customer_id = $2
      LIMIT 1
    `,
    [projectId, userId]
  );

  const project = projectResult.rows[0];
  if (!project) notFound();

  const [candidateResult, taskResult, activityResult] = await Promise.all([
    db.query<CandidateRow>(
      `
        WITH candidate_ids AS (
          SELECT contractor_id
          FROM public.project_candidate_crm
          WHERE project_id = $1 AND customer_id = $2

          UNION

          SELECT contractor_id
          FROM public.project_bids
          WHERE project_id = $1

          UNION

          SELECT selected_contractor_id
          FROM public.projects
          WHERE id = $1 AND selected_contractor_id IS NOT NULL
        )
        SELECT
          cc.id AS contractor_id,
          cc.public_name,
          cc.rating,
          cc.rating_count,
          cc.completed_projects_count,
          coalesce(csc.stroyselect_score, cc.recommendation_score, 0) AS score,
          crm.stage,
          crm.note,
          crm.last_contact_at,
          crm.next_follow_up_at,
          crm.updated_at,
          pb.id AS bid_id,
          pb.status AS bid_status,
          pb.price AS bid_price,
          pb.duration_days AS bid_duration_days
        FROM candidate_ids ci
        JOIN public.contractor_companies cc ON cc.id = ci.contractor_id
        LEFT JOIN public.project_candidate_crm crm
          ON crm.project_id = $1
         AND crm.contractor_id = cc.id
         AND crm.customer_id = $2
        LEFT JOIN public.project_bids pb
          ON pb.project_id = $1
         AND pb.contractor_id = cc.id
        LEFT JOIN public.contractor_score_components csc
          ON csc.contractor_id = cc.id
        ORDER BY
          CASE WHEN cc.id = $3 THEN 0 ELSE 1 END,
          crm.updated_at DESC NULLS LAST,
          pb.created_at DESC NULLS LAST,
          cc.public_name ASC
      `,
      [projectId, userId, project.selected_contractor_id]
    ),

    db.query<TaskRow>(
      `
        SELECT id, title, due_at, is_completed, completed_at, created_at
        FROM public.project_advisor_tasks
        WHERE project_id = $1 AND customer_id = $2
        ORDER BY is_completed ASC, due_at ASC NULLS LAST, created_at DESC
      `,
      [projectId, userId]
    ),

    db.query<ActivityRow>(
      `
        SELECT
          a.id,
          a.contractor_id,
          a.activity_type,
          a.details,
          a.created_at,
          cc.public_name
        FROM public.project_advisor_activity a
        LEFT JOIN public.contractor_companies cc ON cc.id = a.contractor_id
        WHERE a.project_id = $1 AND a.customer_id = $2
        ORDER BY a.created_at DESC
        LIMIT 40
      `,
      [projectId, userId]
    ),
  ]);

  return {
    project,
    candidates: candidateResult.rows.map((row) => ({
      contractorId: row.contractor_id,
      publicName: row.public_name,
      rating: safeNumber(row.rating),
      ratingCount: Math.max(0, Number(row.rating_count) || 0),
      completedProjectsCount: Math.max(0, Number(row.completed_projects_count) || 0),
      stroySelectScore: clampScore(row.score),
      stage: row.contractor_id === project.selected_contractor_id
        ? "selected"
        : row.stage ?? (row.bid_id ? "proposal_received" : "new"),
      note: row.note ?? "",
      lastContactAt: toNullableIso(row.last_contact_at),
      nextFollowUpAt: toNullableIso(row.next_follow_up_at),
      updatedAt: toNullableIso(row.updated_at),
      bid: row.bid_id
        ? {
            id: row.bid_id,
            status: row.bid_status ?? "submitted",
            price: toNullableNumber(row.bid_price),
            durationDays: row.bid_duration_days,
          }
        : null,
    })),
    tasks: taskResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      dueAt: toNullableIso(row.due_at),
      isCompleted: row.is_completed,
      completedAt: toNullableIso(row.completed_at),
      createdAt: toIso(row.created_at),
    })),
    activity: activityResult.rows.map((row) => ({
      id: row.id,
      contractorId: row.contractor_id,
      contractorName: row.public_name,
      activityType: row.activity_type,
      details: normalizeDetails(row.details),
      createdAt: toIso(row.created_at),
    })),
  };
}

function normalizeDetails(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function clampScore(value: unknown) {
  return Math.min(100, Math.max(0, Math.round(safeNumber(value))));
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

function toNullableIso(value: Date | string | null) {
  return value ? toIso(value) : null;
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}
