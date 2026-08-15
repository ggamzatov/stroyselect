import "server-only";

import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";

type ProjectRow = {
  id: string;
  title: string;
  status: string;
  customer_id: string;
  selected_contractor_id: string | null;
  selected_bid_id: string | null;
  contractor_owner_id: string | null;
  selected_bid_price: string | number | null;
  selected_bid_duration_days: number | null;
};

type ChangeRow = {
  id: string;
  requested_by: string;
  title: string;
  reason: string;
  scope_change: string;
  amount_delta: string | number;
  duration_delta_days: number;
  status: string;
  decision_comment: string | null;
  decided_by: string | null;
  decided_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type PaymentRow = {
  id: string;
  recorded_by: string;
  amount: string | number;
  paid_at: Date | string;
  note: string | null;
  created_at: Date | string;
};

type BudgetControlRole = "customer" | "contractor";

export async function getProjectBudgetControl(projectId: string) {
  const userId = await getCurrentSessionUserId();
  if (!userId) redirect("/login");

  const projectResult = await db.query<ProjectRow>(
    `
      SELECT
        p.id,
        p.title,
        p.status,
        p.customer_id,
        p.selected_contractor_id,
        p.selected_bid_id,
        cc.owner_id AS contractor_owner_id,
        pb.price AS selected_bid_price,
        pb.duration_days AS selected_bid_duration_days
      FROM public.projects p
      LEFT JOIN public.contractor_companies cc
        ON cc.id = p.selected_contractor_id
      LEFT JOIN public.project_bids pb
        ON pb.id = p.selected_bid_id
      WHERE p.id = $1
      LIMIT 1
    `,
    [projectId]
  );

  const project = projectResult.rows[0];
  if (!project) notFound();

  const role: BudgetControlRole | null = project.customer_id === userId
    ? "customer"
    : project.contractor_owner_id === userId
      ? "contractor"
      : null;

  if (!role || !project.selected_contractor_id) notFound();

  const [changesResult, paymentsResult] = await Promise.all([
    db.query<ChangeRow>(
      `
        SELECT
          id, requested_by, title, reason, scope_change,
          amount_delta, duration_delta_days, status,
          decision_comment, decided_by, decided_at,
          created_at, updated_at
        FROM public.project_change_orders
        WHERE project_id = $1
        ORDER BY created_at DESC
      `,
      [projectId]
    ),
    db.query<PaymentRow>(
      `
        SELECT id, recorded_by, amount, paid_at, note, created_at
        FROM public.project_payments
        WHERE project_id = $1
        ORDER BY paid_at DESC, created_at DESC
      `,
      [projectId]
    ),
  ]);

  const originalContract = toNumber(project.selected_bid_price);
  const approvedDelta = changesResult.rows
    .filter((item) => item.status === "approved")
    .reduce((sum, item) => sum + toNumber(item.amount_delta), 0);
  const approvedDurationDelta = changesResult.rows
    .filter((item) => item.status === "approved")
    .reduce((sum, item) => sum + (Number(item.duration_delta_days) || 0), 0);
  const paidTotal = paymentsResult.rows
    .reduce((sum, item) => sum + toNumber(item.amount), 0);
  const currentContract = originalContract + approvedDelta;

  return {
    role,
    project: {
      id: project.id,
      title: project.title,
      status: project.status,
      originalContract,
      approvedDelta,
      currentContract,
      paidTotal,
      remaining: currentContract - paidTotal,
      originalDurationDays: project.selected_bid_duration_days ?? 0,
      currentDurationDays: (project.selected_bid_duration_days ?? 0) + approvedDurationDelta,
    },
    changes: changesResult.rows.map((row) => ({
      id: row.id,
      requestedBy: row.requested_by,
      requestedByCurrentUser: row.requested_by === userId,
      title: row.title,
      reason: row.reason,
      scopeChange: row.scope_change,
      amountDelta: toNumber(row.amount_delta),
      durationDeltaDays: Number(row.duration_delta_days) || 0,
      status: row.status,
      decisionComment: row.decision_comment,
      decidedBy: row.decided_by,
      decidedAt: toNullableIso(row.decided_at),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    })),
    payments: paymentsResult.rows.map((row) => ({
      id: row.id,
      recordedBy: row.recorded_by,
      amount: toNumber(row.amount),
      paidAt: toDateString(row.paid_at),
      note: row.note,
      createdAt: toIso(row.created_at),
    })),
  };
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toNullableIso(value: Date | string | null) {
  return value ? toIso(value) : null;
}

function toDateString(value: Date | string) {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}
