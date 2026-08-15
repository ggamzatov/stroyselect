"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { requireActiveProject } from "@/lib/projects/require-active-project";
import { createNotification } from "@/features/notifications/server/create-notification";

export type CompleteProjectResult = {
  success: boolean;
  message: string;
};

type StageRow = {
  id: string;
  status: string;
  progress_weight: number;
};

export async function completeProject(
  projectId: string
): Promise<CompleteProjectResult> {
  const activeUser = await requireActiveUser();

  if (!activeUser.success) {
    return { success: false, message: activeUser.message };
  }

  const { user, profile } = activeUser;

  if (profile.role !== "customer") {
    return {
      success: false,
      message: "Завершить проект может только заказчик",
    };
  }

  const activeProject = await requireActiveProject(projectId);

  if (!activeProject.success) {
    return { success: false, message: activeProject.message };
  }

  const project = activeProject.project;

  if (project.customer_id !== user.id) {
    return { success: false, message: "Проект не найден" };
  }

  if (project.status === "completed") {
    return { success: false, message: "Проект уже завершён" };
  }

  if (project.status !== "in_progress") {
    return {
      success: false,
      message: "На текущем статусе проект нельзя завершить",
    };
  }

  const completedAt = new Date().toISOString();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const stagesResult = await client.query<StageRow>(
      `
        SELECT id, status, progress_weight
        FROM public.project_stages
        WHERE project_id = $1
        ORDER BY sort_order ASC
        FOR UPDATE
      `,
      [projectId]
    );

    const stages = stagesResult.rows;

    if (stages.length === 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Нельзя завершить проект без этапов",
      };
    }

    const incompleteStages = stages.filter(
      (stage) => stage.status !== "completed"
    );

    if (incompleteStages.length > 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: `Нельзя завершить проект: не завершено этапов — ${incompleteStages.length}.`,
      };
    }

    const totalWeight = stages.reduce(
      (sum, stage) => sum + Number(stage.progress_weight ?? 0),
      0
    );

    if (totalWeight !== 100) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: `Нельзя завершить проект: сумма долей этапов составляет ${totalWeight}%, необходимо 100%.`,
      };
    }

    const updateResult = await client.query<{ id: string }>(
      `
        UPDATE public.projects
        SET
          status = 'completed',
          completed_at = $1,
          updated_at = $1
        WHERE id = $2
          AND customer_id = $3
          AND status = 'in_progress'
          AND is_admin_blocked = false
        RETURNING id
      `,
      [completedAt, projectId, user.id]
    );

    if (!updateResult.rows[0]) {
      throw new Error("Проект не был завершён");
    }

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
        VALUES ($1, $2, 'project_completed', $3, $4, $5::jsonb)
      `,
      [
        projectId,
        user.id,
        "Проект завершён",
        "Заказчик подтвердил завершение проекта.",
        JSON.stringify({}),
      ]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка завершения проекта:", error);
    return { success: false, message: "Не удалось завершить проект" };
  } finally {
    client.release();
  }

  if (project.selected_contractor_id) {
    try {
      const companyResult = await db.query<{ owner_id: string }>(
        `
          SELECT owner_id
          FROM public.contractor_companies
          WHERE id = $1
          LIMIT 1
        `,
        [project.selected_contractor_id]
      );

      const ownerId = companyResult.rows[0]?.owner_id;

      if (ownerId) {
        await createNotification({
          userId: ownerId,
          actorId: user.id,
          notificationType: "project_completed",
          title: "Проект завершён",
          body: `Заказчик подтвердил завершение проекта «${project.title}».`,
          projectId,
          url: `/contractor/work/${projectId}`,
          metadata: { completed_at: completedAt },
        });
      }
    } catch (error) {
      console.error("Ошибка уведомления о завершении проекта:", error);
    }
  }

  revalidateProject(projectId);

  return { success: true, message: "Проект успешно завершён" };
}

function revalidateProject(projectId: string) {
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
  revalidatePath(`/customer/projects/${projectId}`);
  revalidatePath("/customer/dashboard");
  revalidatePath("/contractor/dashboard");
  revalidatePath("/customer", "layout");
  revalidatePath("/contractor", "layout");
}
