"use server";

import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { z } from "zod";

import { getCurrentSessionUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/pool";

type AccessRow = {
  customer_id: string;
  contractor_owner_id: string | null;
  selected_contractor_id: string | null;
};

type HoldRow = {
  risk_hold: boolean;
  risk_hold_reason: string | null;
};

const changeSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(3).max(160),
  reason: z.string().trim().min(5).max(1500),
  scopeChange: z.string().trim().min(5).max(3000),
  amountDelta: z.coerce.number().min(-1_000_000_000).max(1_000_000_000),
  durationDeltaDays: z.coerce.number().int().min(-3650).max(3650),
});

const decisionSchema = z.object({
  projectId: z.string().uuid(),
  changeOrderId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().trim().max(1500).optional(),
});

const paymentSchema = z.object({
  projectId: z.string().uuid(),
  stageId: z.string().uuid().optional(),
  amount: z.coerce.number().positive().max(1_000_000_000),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(1000).optional(),
});

export async function createChangeOrder(formData: FormData) {
  const parsed = changeSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    reason: formData.get("reason"),
    scopeChange: formData.get("scopeChange"),
    amountDelta: formData.get("amountDelta"),
    durationDeltaDays: formData.get("durationDeltaDays"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Проверьте данные",
    };
  }

  const userId = await getCurrentSessionUserId();
  if (!userId) return { success: false, message: "Необходимо войти" };

  const access = await getAccess(parsed.data.projectId, userId);
  if (!access || access.role !== "contractor") {
    return {
      success: false,
      message: "Запрос изменения может создать выбранный подрядчик",
    };
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const holdError = await lockAndGetHoldError(client, parsed.data.projectId);
    if (holdError) {
      await client.query("ROLLBACK");
      return { success: false, message: holdError };
    }

    const created = await client.query<{ id: string }>(
      `
        INSERT INTO public.project_change_orders (
          project_id,
          requested_by,
          title,
          reason,
          scope_change,
          amount_delta,
          duration_delta_days
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [
        parsed.data.projectId,
        userId,
        parsed.data.title,
        parsed.data.reason,
        parsed.data.scopeChange,
        parsed.data.amountDelta,
        parsed.data.durationDeltaDays,
      ]
    );

    await insertEvent(client, {
      projectId: parsed.data.projectId,
      authorId: userId,
      eventType: "change_order_created",
      title: "Запрошено изменение проекта",
      description: parsed.data.title,
      metadata: {
        change_order_id: created.rows[0]?.id,
        amount_delta: parsed.data.amountDelta,
        duration_delta_days: parsed.data.durationDeltaDays,
      },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка создания change order:", error);
    return { success: false, message: "Не удалось создать запрос изменения" };
  } finally {
    client.release();
  }

  revalidate(parsed.data.projectId);
  return {
    success: true,
    message: "Изменение отправлено заказчику на согласование",
  };
}

export async function decideChangeOrder(formData: FormData) {
  const parsed = decisionSchema.safeParse({
    projectId: formData.get("projectId"),
    changeOrderId: formData.get("changeOrderId"),
    decision: formData.get("decision"),
    comment: formData.get("comment") || undefined,
  });

  if (!parsed.success) {
    return { success: false, message: "Некорректное решение" };
  }

  const userId = await getCurrentSessionUserId();
  if (!userId) return { success: false, message: "Необходимо войти" };

  const access = await getAccess(parsed.data.projectId, userId);
  if (!access || access.role !== "customer") {
    return {
      success: false,
      message: "Согласовать изменение может только заказчик",
    };
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const holdError = await lockAndGetHoldError(client, parsed.data.projectId);
    if (holdError) {
      await client.query("ROLLBACK");
      return { success: false, message: holdError };
    }

    const result = await client.query<{
      title: string;
      amount_delta: string | number;
      duration_delta_days: number;
    }>(
      `
        UPDATE public.project_change_orders
        SET
          status = $1,
          decision_comment = $2,
          decided_by = $3,
          decided_at = now(),
          updated_at = now()
        WHERE id = $4
          AND project_id = $5
          AND status = 'pending'
        RETURNING title, amount_delta, duration_delta_days
      `,
      [
        parsed.data.decision,
        parsed.data.comment ?? null,
        userId,
        parsed.data.changeOrderId,
        parsed.data.projectId,
      ]
    );

    const change = result.rows[0];
    if (!change) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Изменение уже обработано или не найдено",
      };
    }

    await insertEvent(client, {
      projectId: parsed.data.projectId,
      authorId: userId,
      eventType:
        parsed.data.decision === "approved"
          ? "change_order_approved"
          : "change_order_rejected",
      title:
        parsed.data.decision === "approved"
          ? "Изменение согласовано"
          : "Изменение отклонено",
      description: change.title,
      metadata: {
        change_order_id: parsed.data.changeOrderId,
        amount_delta: Number(change.amount_delta),
        duration_delta_days: change.duration_delta_days,
      },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка решения change order:", error);
    return { success: false, message: "Не удалось сохранить решение" };
  } finally {
    client.release();
  }

  revalidate(parsed.data.projectId);
  return {
    success: true,
    message:
      parsed.data.decision === "approved"
        ? "Изменение согласовано"
        : "Изменение отклонено",
  };
}

export async function cancelChangeOrder(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const changeOrderId = String(formData.get("changeOrderId") ?? "");
  const userId = await getCurrentSessionUserId();

  if (!userId) return { success: false, message: "Необходимо войти" };

  const access = await getAccess(projectId, userId);
  if (!access || access.role !== "contractor") {
    return { success: false, message: "Нет доступа" };
  }

  const result = await db.query(
    `
      UPDATE public.project_change_orders
      SET status = 'cancelled', updated_at = now()
      WHERE id = $1
        AND project_id = $2
        AND requested_by = $3
        AND status = 'pending'
      RETURNING id
    `,
    [changeOrderId, projectId, userId]
  );

  if (!result.rowCount) {
    return { success: false, message: "Изменение нельзя отменить" };
  }

  revalidate(projectId);
  return { success: true, message: "Запрос изменения отменён" };
}

export async function recordProjectPayment(formData: FormData) {
  const rawStage = String(formData.get("stageId") ?? "").trim();
  const parsed = paymentSchema.safeParse({
    projectId: formData.get("projectId"),
    stageId: rawStage || undefined,
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверьте сумму, этап и дату платежа",
    };
  }

  const userId = await getCurrentSessionUserId();
  if (!userId) return { success: false, message: "Необходимо войти" };

  const access = await getAccess(parsed.data.projectId, userId);
  if (!access || access.role !== "customer") {
    return { success: false, message: "Платежи фиксирует заказчик" };
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const budget = await client.query<{
      contract_total: string | number;
      paid_total: string | number;
      risk_hold: boolean;
      risk_hold_reason: string | null;
    }>(
      `
        SELECT
          COALESCE(pb.price, 0)
            + COALESCE((
                SELECT SUM(amount_delta)
                FROM public.project_change_orders
                WHERE project_id = p.id
                  AND status = 'approved'
              ), 0) AS contract_total,
          COALESCE((
            SELECT SUM(amount)
            FROM public.project_payments
            WHERE project_id = p.id
          ), 0) AS paid_total,
          p.risk_hold,
          p.risk_hold_reason
        FROM public.projects p
        LEFT JOIN public.project_bids pb
          ON pb.id = p.selected_bid_id
        WHERE p.id = $1
        FOR UPDATE OF p
      `,
      [parsed.data.projectId]
    );

    const projectBudget = budget.rows[0];
    if (!projectBudget) throw new Error("Project not found");

    if (projectBudget.risk_hold) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: holdMessage(projectBudget.risk_hold_reason),
      };
    }

    const contractTotal = Number(projectBudget.contract_total);
    const remaining = contractTotal - Number(projectBudget.paid_total);

    if (parsed.data.amount > remaining + 0.005) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: `Платёж превышает остаток бюджета (${money(remaining)})`,
      };
    }

    if (parsed.data.stageId) {
      const stage = await client.query<{
        planned: string | number;
        paid: string | number;
      }>(
        `
          SELECT
            CASE
              WHEN ps.payment_due_amount IS NOT NULL THEN ps.payment_due_amount
              WHEN ps.payment_due_percent IS NOT NULL
                THEN (ps.payment_due_percent / 100.0) * $2::numeric
              ELSE COALESCE(ps.price, 0)
            END AS planned,
            COALESCE((
              SELECT SUM(pp.amount)
              FROM public.project_payments pp
              WHERE pp.stage_id = ps.id
            ), 0) AS paid
          FROM public.project_stages ps
          WHERE ps.id = $1
            AND ps.project_id = $3
        `,
        [parsed.data.stageId, contractTotal, parsed.data.projectId]
      );

      const stageBudget = stage.rows[0];
      if (!stageBudget) {
        await client.query("ROLLBACK");
        return { success: false, message: "Этап не найден" };
      }

      const stageRemaining = Math.max(
        0,
        Number(stageBudget.planned) - Number(stageBudget.paid)
      );

      if (parsed.data.amount > stageRemaining + 0.005) {
        await client.query("ROLLBACK");
        return {
          success: false,
          message: `Платёж превышает остаток по этапу (${money(stageRemaining)})`,
        };
      }
    }

    const result = await client.query<{ id: string }>(
      `
        INSERT INTO public.project_payments (
          project_id,
          recorded_by,
          stage_id,
          amount,
          paid_at,
          note
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        parsed.data.projectId,
        userId,
        parsed.data.stageId ?? null,
        parsed.data.amount,
        parsed.data.paidAt,
        parsed.data.note ?? null,
      ]
    );

    await insertEvent(client, {
      projectId: parsed.data.projectId,
      authorId: userId,
      eventType: "payment_recorded",
      title: "Зафиксирован платёж",
      description: parsed.data.note ?? null,
      metadata: {
        payment_id: result.rows[0]?.id,
        stage_id: parsed.data.stageId ?? null,
        amount: parsed.data.amount,
        paid_at: parsed.data.paidAt,
      },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка записи платежа:", error);
    return { success: false, message: "Не удалось добавить платёж" };
  } finally {
    client.release();
  }

  revalidate(parsed.data.projectId);
  return { success: true, message: "Платёж добавлен" };
}

async function getAccess(projectId: string, userId: string) {
  const result = await db.query<AccessRow>(
    `
      SELECT
        p.customer_id,
        p.selected_contractor_id,
        cc.owner_id AS contractor_owner_id
      FROM public.projects p
      LEFT JOIN public.contractor_companies cc
        ON cc.id = p.selected_contractor_id
      WHERE p.id = $1
      LIMIT 1
    `,
    [projectId]
  );

  const row = result.rows[0];
  if (!row || !row.selected_contractor_id) return null;

  if (row.customer_id === userId) return { role: "customer" as const };
  if (row.contractor_owner_id === userId) return { role: "contractor" as const };
  return null;
}

async function lockAndGetHoldError(
  client: PoolClient,
  projectId: string
): Promise<string | null> {
  const result = await client.query<HoldRow>(
    `
      SELECT risk_hold, risk_hold_reason
      FROM public.projects
      WHERE id = $1::uuid
      LIMIT 1
      FOR UPDATE
    `,
    [projectId]
  );

  const project = result.rows[0];
  if (!project) return "Проект не найден";
  if (!project.risk_hold) return null;

  return holdMessage(project.risk_hold_reason);
}

function holdMessage(reason: string | null) {
  return reason
    ? `Проект приостановлен администрацией: ${reason}`
    : "Проект приостановлен администрацией";
}

async function insertEvent(
  client: PoolClient,
  input: {
    projectId: string;
    authorId: string;
    eventType: string;
    title: string;
    description: string | null;
    metadata: Record<string, unknown>;
  }
) {
  await client.query(
    `
      INSERT INTO public.project_events (
        project_id,
        author_id,
        event_type,
        title,
        description,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      input.projectId,
      input.authorId,
      input.eventType,
      input.title,
      input.description,
      JSON.stringify(input.metadata),
    ]
  );
}

function revalidate(projectId: string) {
  revalidatePath(`/customer/work/${projectId}/changes`);
  revalidatePath(`/contractor/work/${projectId}/changes`);
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
}

function money(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(Math.max(0, value))} ₽`;
}
