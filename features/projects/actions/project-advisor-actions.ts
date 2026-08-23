"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export type Result = { success: boolean; message: string };

type QueryClient = { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function ownsProject(client: QueryClient, projectId: string, customerId: string) {
  const result = await client.query(
    `SELECT id FROM public.projects WHERE id=$1::uuid AND customer_id=$2::uuid LIMIT 1`,
    [projectId, customerId]
  );
  return Boolean(result.rows[0]);
}

async function insertActivity(
  client: QueryClient,
  input: { projectId: string; customerId: string; contractorId: string | null; type: string; details: Record<string, unknown> }
) {
  await client.query(
    `INSERT INTO public.project_advisor_activity(project_id,customer_id,contractor_id,event_type,details)
     VALUES($1::uuid,$2::uuid,$3::uuid,$4::text,$5::jsonb)`,
    [input.projectId, input.customerId, input.contractorId, input.type, JSON.stringify(input.details)]
  );
}

export async function createAdvisorNote(input: { projectId: string; body: string }): Promise<Result> {
  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  if (auth.profile.role !== "customer") return { success: false, message: "Доступно только заказчику" };
  if (!isUuid(input.projectId)) return { success: false, message: "Некорректный проект" };
  const body = input.body.trim();
  if (body.length < 2 || body.length > 5000) return { success: false, message: "Текст заметки должен содержать от 2 до 5000 символов" };

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    if (!(await ownsProject(client, input.projectId, auth.user.id))) {
      await client.query("ROLLBACK");
      return { success: false, message: "Проект не найден" };
    }
    await client.query(
      `INSERT INTO public.project_advisor_notes(project_id,customer_id,body) VALUES($1::uuid,$2::uuid,$3::text)`,
      [input.projectId, auth.user.id, body]
    );
    await insertActivity(client, { projectId: input.projectId, customerId: auth.user.id, contractorId: null, type: "note_created", details: {} });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка сохранения заметки помощника:", error);
    return { success: false, message: "Не удалось сохранить заметку" };
  } finally { client.release(); }
  revalidateProject(input.projectId);
  return { success: true, message: "Заметка сохранена" };
}

export async function deleteAdvisorNote(input: { projectId: string; noteId: string }): Promise<Result> {
  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  if (auth.profile.role !== "customer") return { success: false, message: "Доступно только заказчику" };
  if (!isUuid(input.projectId) || !isUuid(input.noteId)) return { success: false, message: "Некорректный идентификатор" };
  const result = await db.query(
    `DELETE FROM public.project_advisor_notes WHERE id=$1::uuid AND project_id=$2::uuid AND customer_id=$3::uuid`,
    [input.noteId, input.projectId, auth.user.id]
  );
  if (result.rowCount !== 1) return { success: false, message: "Заметка не найдена" };
  revalidateProject(input.projectId);
  return { success: true, message: "Заметка удалена" };
}

export async function updateAdvisorContractor(input: {
  projectId: string;
  contractorId: string;
  stage: string;
  nextContactAt?: string | null;
  note?: string | null;
}): Promise<Result> {
  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  if (auth.profile.role !== "customer") return { success: false, message: "Доступно только заказчику" };
  if (!isUuid(input.projectId) || !isUuid(input.contractorId)) return { success: false, message: "Некорректный идентификатор" };
  const allowed = new Set(["discovered", "contacted", "meeting", "proposal", "negotiation", "selected", "rejected"]);
  if (!allowed.has(input.stage)) return { success: false, message: "Некорректный этап" };
  const note = input.note?.trim() || null;
  if (note && note.length > 2000) return { success: false, message: "Комментарий слишком длинный" };
  const nextContactAt = input.nextContactAt?.trim() || null;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    if (!(await ownsProject(client, input.projectId, auth.user.id))) {
      await client.query("ROLLBACK");
      return { success: false, message: "Проект не найден" };
    }
    const contractor = await client.query(
      `SELECT id FROM public.contractor_companies WHERE id=$1::uuid AND verification_status='verified' LIMIT 1`,
      [input.contractorId]
    );
    if (!contractor.rows[0]) {
      await client.query("ROLLBACK");
      return { success: false, message: "Подрядчик не найден" };
    }
    await client.query(
      `INSERT INTO public.project_advisor_contractors(project_id,customer_id,contractor_id,stage,next_contact_at,note,updated_at)
       VALUES($1::uuid,$2::uuid,$3::uuid,$4::varchar,$5::timestamptz,$6::text,now())
       ON CONFLICT(project_id,contractor_id) DO UPDATE SET stage=EXCLUDED.stage,next_contact_at=EXCLUDED.next_contact_at,note=EXCLUDED.note,updated_at=now()`,
      [input.projectId, auth.user.id, input.contractorId, input.stage, nextContactAt, note]
    );
    await insertActivity(client, {
      projectId: input.projectId,
      customerId: auth.user.id,
      contractorId: input.contractorId,
      type: "contractor_stage_changed",
      details: { stage: input.stage, next_contact_at: nextContactAt },
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка обновления подрядчика в помощнике:", error);
    return { success: false, message: "Не удалось обновить подрядчика" };
  } finally { client.release(); }
  revalidateProject(input.projectId);
  return { success: true, message: "Карточка подрядчика обновлена" };
}

export async function inviteAdvisorContractor(input: { projectId: string; contractorId: string; message?: string | null }): Promise<Result> {
  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  if (auth.profile.role !== "customer") return { success: false, message: "Доступно только заказчику" };
  if (!isUuid(input.projectId) || !isUuid(input.contractorId)) return { success: false, message: "Некорректный идентификатор" };
  const message = input.message?.trim() || null;
  if (message && message.length > 2000) return { success: false, message: "Сообщение слишком длинное" };

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    if (!(await ownsProject(client, input.projectId, auth.user.id))) {
      await client.query("ROLLBACK");
      return { success: false, message: "Проект не найден" };
    }
    const contractor = await client.query(
      `SELECT id FROM public.contractor_companies WHERE id=$1::uuid AND verification_status='verified' AND accepts_new_projects=true LIMIT 1`,
      [input.contractorId]
    );
    if (!contractor.rows[0]) {
      await client.query("ROLLBACK");
      return { success: false, message: "Подрядчик недоступен для приглашения" };
    }
    await client.query(
      `INSERT INTO public.project_contractor_invitations(project_id,customer_id,contractor_id,message,status,invited_at,updated_at)
       VALUES($1::uuid,$2::uuid,$3::uuid,$4::text,'pending',now(),now())
       ON CONFLICT(project_id,contractor_id) DO UPDATE SET message=EXCLUDED.message,status='pending',responded_at=NULL,updated_at=now()`,
      [input.projectId, auth.user.id, input.contractorId, message]
    );
    await client.query(
      `INSERT INTO public.project_advisor_contractors(project_id,customer_id,contractor_id,stage,updated_at)
       VALUES($1::uuid,$2::uuid,$3::uuid,'contacted',now())
       ON CONFLICT(project_id,contractor_id) DO UPDATE SET stage='contacted',updated_at=now()`,
      [input.projectId, auth.user.id, input.contractorId]
    );
    await insertActivity(client, { projectId: input.projectId, customerId: auth.user.id, contractorId: input.contractorId, type: "invitation_sent", details: {} });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка приглашения подрядчика:", error);
    return { success: false, message: "Не удалось отправить приглашение" };
  } finally { client.release(); }
  revalidateProject(input.projectId);
  return { success: true, message: "Приглашение отправлено" };
}

export async function addAdvisorTask(input: { projectId: string; title: string; dueAt?: string | null }): Promise<Result> {
  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  if (auth.profile.role !== "customer") return { success: false, message: "Доступно только заказчику" };
  if (!isUuid(input.projectId)) return { success: false, message: "Некорректный проект" };
  const title = input.title.trim();
  if (title.length < 2 || title.length > 300) return { success: false, message: "Название задачи должно содержать от 2 до 300 символов" };
  const dueAt = input.dueAt?.trim() || null;
  try {
    const result = await db.query(
      `INSERT INTO public.project_advisor_tasks(project_id,customer_id,title,due_at) VALUES($1::uuid,$2::uuid,$3::text,$4::timestamptz) RETURNING id`,
      [input.projectId, auth.user.id, title, dueAt]
    );
    if (!result.rows[0]) return { success: false, message: "Задача не создана" };
  } catch (error) {
    console.error("Ошибка создания задачи помощника:", error);
    return { success: false, message: "Не удалось создать задачу" };
  }
  revalidateProject(input.projectId);
  return { success: true, message: "Задача добавлена" };
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
        SET is_completed = $1::boolean,
            completed_at = CASE WHEN $1::boolean THEN now() ELSE NULL END,
            updated_at = now()
        WHERE id = $2::uuid AND project_id = $3::uuid AND customer_id = $4::uuid
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
    console.error("Ошибка обновления задачи помощника:", error);
    return { success: false, message: "Не удалось обновить задачу" };
  } finally { client.release(); }
  revalidateProject(input.projectId);
  return { success: true, message: input.completed ? "Задача выполнена" : "Задача возвращена в работу" };
}

function revalidateProject(projectId: string) {
  revalidatePath(`/customer/projects/${projectId}/advisor`);
  revalidatePath(`/customer/projects/${projectId}`);
}