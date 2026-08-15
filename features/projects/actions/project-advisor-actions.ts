"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

const EDITABLE_STAGES = new Set([
  "new",
  "viewed",
  "shortlisted",
  "contacted",
  "proposal_received",
  "finalist",
  "archived",
]);

type Result = {
  success: boolean;
  message: string;
};

type ProjectOwnerRow = {
  id: string;
  selected_contractor_id: string | null;
};

export async function saveAdvisorCandidate(input: {
  projectId: string;
  contractorId: string;
  stage: string;
  note?: string | null;
  lastContactAt?: string | null;
  nextFollowUpAt?: string | null;
}): Promise<Result> {
  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  if (auth.profile.role !== "customer") {
    return { success: false, message: "Доступно только заказчику" };
  }

  if (!isUuid(input.projectId) || !isUuid(input.contractorId)) {
    return { success: false, message: "Некорректный идентификатор" };
  }

  if (!EDITABLE_STAGES.has(input.stage)) {
    return { success: false, message: "Некорректный этап воронки" };
  }

  const note = normalizeText(input.note, 4000);
  const lastContactAt = normalizeDateTime(input.lastContactAt);
  const nextFollowUpAt = normalizeDateTime(input.nextFollowUpAt);

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const projectResult = await client.query<ProjectOwnerRow>(
      `
        SELECT id, selected_contractor_id
        FROM public.projects
        WHERE id = $1 AND customer_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [input.projectId, auth.user.id]
    );
    const project = projectResult.rows[0];
    if (!project) {
      await client.query("ROLLBACK");
      return { success: false, message: "Проект не найден" };
    }

    const contractorResult = await client.query<{ id: string }>(
      `SELECT id FROM public.contractor_companies WHERE id = $1 LIMIT 1`,
      [input.contractorId]
    );
    if (!contractorResult.rows[0]) {
      await client.query("ROLLBACK");
      return { success: false, message: "Подрядчик не найден" };
    }

    if (project.selected_contractor_id === input.contractorId) {
      await client.query("ROLLBACK");
      return { success: false, message: "Выбранный подрядчик уже зафиксирован проектом" };
    }

    const previousResult = await client.query<{
      stage: string;
      note: string | null;
      last_contact_at: Date | string | null;
      next_follow_up_at: Date | string | null;
    }>(
      `
        SELECT stage, note, last_contact_at, next_follow_up_at
        FROM public.project_candidate_crm
        WHERE project_id = $1 AND contractor_id = $2 AND customer_id = $3
        LIMIT 1
        FOR UPDATE
      `,
      [input.projectId, input.contractorId, auth.user.id]
    );

    const previous = previousResult.rows[0] ?? null;

    await client.query(
      `
        INSERT INTO public.project_candidate_crm (
          project_id,
          contractor_id,
          customer_id,
          stage,
          note,
          last_contact_at,
          next_follow_up_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
        ON CONFLICT (project_id, contractor_id)
        DO UPDATE SET
          customer_id = EXCLUDED.customer_id,
          stage = EXCLUDED.stage,
          note = EXCLUDED.note,
          last_contact_at = EXCLUDED.last_contact_at,
          next_follow_up_at = EXCLUDED.next_follow_up_at,
          updated_at = now()
      `,
      [
        input.projectId,
        input.contractorId,
        auth.user.id,
        input.stage,
        note,
        lastContactAt,
        nextFollowUpAt,
      ]
    );

    if (!previous || previous.stage !== input.stage) {
      await insertActivity(client, {
        projectId: input.projectId,
        customerId: auth.user.id,
        contractorId: input.contractorId,
        type: "stage_changed",
        details: { from: previous?.stage ?? null, to: input.stage },
      });
    }

    if ((previous?.note ?? "") !== (note ?? "")) {
      await insertActivity(client, {
        projectId: input.projectId,
        customerId: auth.user.id,
        contractorId: input.contractorId,
        type: "note_updated",
        details: {},
      });
    }

    const previousFollowUp = previous?.next_follow_up_at
      ? new Date(previous.next_follow_up_at).toISOString()
      : null;
    const nextFollowUpIso = nextFollowUpAt ? nextFollowUpAt.toISOString() : null;
    if (previousFollowUp !== nextFollowUpIso) {
      await insertActivity(client, {
        projectId: input.projectId,
        customerId: auth.user.id,
        contractorId: input.contractorId,
        type: "follow_up_changed",
        details: { next_follow_up_at: nextFollowUpIso },
      });
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка сохранения CRM подрядчика:", error);
    return { success: false, message: "Не удалось сохранить данные подрядчика" };
  } finally {
    client.release();
  }

  revalidateAdvisor(input.projectId);
  return { success: true, message: "Карточка подрядчика обновлена" };
}

export async function createAdvisorTask(input: {
  projectId: string;
  title: string;
  dueAt?: string | null;
}): Promise<Result> {
  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  if (auth.profile.role !== "customer") return { success: false, message: "Доступно только заказчику" };

  const title = normalizeText(input.title, 300);
  if (!title) return { success: false, message: "Введите задачу" };
  if (!isUuid(input.projectId)) return { success: false, message: "Некорректный проект" };

  const dueAt = normalizeDateTime(input.dueAt);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const owns = await ownsProject(client, input.projectId, auth.user.id);
    if (!owns) {
      await client.query("ROLLBACK");
      return { success: false, message: "Проект не найден" };
    }

    const taskId = crypto.randomUUID();
    await client.query(
      `
        INSERT INTO public.project_advisor_tasks (
          id, project_id, customer_id, title, due_at
        ) VALUES ($1, $2, $3, $4, $5)
      `,
      [taskId, input.projectId, auth.user.id, title, dueAt]
    );

    await insertActivity(client, {
      projectId: input.projectId,
      customerId: auth.user.id,
      contractorId: null,
      type: "task_created",
      details: { task_id: taskId, title },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка создания advisor-задачи:", error);
    return { success: false, message: "Не удалось создать задачу" };
  } finally {
    client.release();
  }

  revalidateAdvisor(input.projectId);
  return { success: true, message: "Задача создана" };
}

export async function toggleAdvisorTask(input: {
  projectId: string;
  taskId: string;
  completed: boolean;
}): Promise<Result> {
  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  if (auth.profile.role !== "customer") return { success: false, message: "Доступно только заказчику" };
  if (!isUuid(input.projectId) || !isUuid(input.taskId)) return { success: false, message: "Некорректный идентификатор" };

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const owns = await ownsProject(client, input.projectId, auth.user.id);
    if (!owns) {
      await client.query("ROLLBACK");
      return { success: false, message: "Проект не найден" };
    }

    const result = await client.query(
      `
        UPDATE public.project_advisor_tasks
        SET is_completed = $1,
            completed_at = CASE WHEN $1 THEN now() ELSE NULL END,
            updated_at = now()
        WHERE id = $2 AND project_id = $3 AND customer_id = $4
        RETURNING id
      `,
      [input.completed, input.taskId, input.projectId, auth.user.id]
    );
    if (result.rowCount !== 1) {
      await client.query("ROLLBACK");
      return { success: false, message: "Задача не найдена" };
    }

    await insertActivity(client, {
      projectId: input.projectId,
      customerId: auth.user.id,
      contractorId: null,
      type: input.completed ? "task_completed" : "task_reopened",
      details: { task_id: input.taskId },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка изменения advisor-задачи:", error);
    return { success: false, message: "Не удалось изменить задачу" };
  } finally {
    client.release();
  }

  revalidateAdvisor(input.projectId);
  return { success: true, message: input.completed ? "Задача выполнена" : "Задача возвращена" };
}

export async function deleteAdvisorTask(input: {
  projectId: string;
  taskId: string;
}): Promise<Result> {
  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  if (auth.profile.role !== "customer") return { success: false, message: "Доступно только заказчику" };
  if (!isUuid(input.projectId) || !isUuid(input.taskId)) return { success: false, message: "Некорректный идентификатор" };

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const owns = await ownsProject(client, input.projectId, auth.user.id);
    if (!owns) {
      await client.query("ROLLBACK");
      return { success: false, message: "Проект не найден" };
    }

    const result = await client.query(
      `
        DELETE FROM public.project_advisor_tasks
        WHERE id = $1 AND project_id = $2 AND customer_id = $3
        RETURNING id
      `,
      [input.taskId, input.projectId, auth.user.id]
    );
    if (result.rowCount !== 1) {
      await client.query("ROLLBACK");
      return { success: false, message: "Задача не найдена" };
    }

    await insertActivity(client, {
      projectId: input.projectId,
      customerId: auth.user.id,
      contractorId: null,
      type: "task_deleted",
      details: { task_id: input.taskId },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка удаления advisor-задачи:", error);
    return { success: false, message: "Не удалось удалить задачу" };
  } finally {
    client.release();
  }

  revalidateAdvisor(input.projectId);
  return { success: true, message: "Задача удалена" };
}

async function ownsProject(client: import("pg").PoolClient, projectId: string, customerId: string) {
  const result = await client.query(
    `SELECT 1 FROM public.projects WHERE id = $1 AND customer_id = $2 LIMIT 1`,
    [projectId, customerId]
  );
  return result.rowCount === 1;
}

async function insertActivity(
  client: import("pg").PoolClient,
  input: {
    projectId: string;
    customerId: string;
    contractorId: string | null;
    type: string;
    details: Record<string, unknown>;
  }
) {
  await client.query(
    `
      INSERT INTO public.project_advisor_activity (
        id, project_id, customer_id, contractor_id, activity_type, details
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      crypto.randomUUID(),
      input.projectId,
      input.customerId,
      input.contractorId,
      input.type,
      JSON.stringify(input.details),
    ]
  );
}

function revalidateAdvisor(projectId: string) {
  revalidatePath(`/customer/projects/${projectId}/advisor`);
  revalidatePath(`/customer/projects/${projectId}`);
  revalidatePath("/customer/projects");
  revalidatePath("/customer/dashboard");
}

function normalizeText(value: string | null | undefined, max: number) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  return normalized.slice(0, max);
}

function normalizeDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
