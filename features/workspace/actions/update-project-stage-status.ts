"use server";

import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";

import { createNotification } from "@/features/notifications/server/create-notification";
import { getProjectNotificationRecipient } from "@/features/notifications/server/get-project-notification-recipient";
import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { requireActiveProject } from "@/lib/projects/require-active-project";

type StageAction = "start" | "submit" | "resume";

export type UpdateProjectStageStatusResult = {
  success: boolean;
  message: string;
};

type StageRow = {
  id: string;
  title: string;
  status: string;
};

type ProjectRow = {
  id: string;
  status: string;
  risk_hold: boolean;
  risk_hold_reason: string | null;
};

export async function updateProjectStageStatus(
  stageId: string,
  projectId: string,
  action: StageAction
): Promise<UpdateProjectStageStatusResult> {
  const activeUser = await requireActiveUser();

  if (!activeUser.success) {
    return { success: false, message: activeUser.message };
  }

  const { user, profile } = activeUser;

  if (profile.role !== "contractor") {
    return { success: false, message: "Управлять этапами может только подрядчик" };
  }

  const activeProject = await requireActiveProject(projectId);

  if (!activeProject.success) {
    return { success: false, message: activeProject.message };
  }

  const companyResult = await db.query<{ id: string }>(
    `
      SELECT id
      FROM public.contractor_companies
      WHERE owner_id = $1
      LIMIT 1
    `,
    [user.id]
  );

  const company = companyResult.rows[0];

  if (!company) {
    return { success: false, message: "Компания подрядчика не найдена" };
  }

  if (activeProject.project.selected_contractor_id !== company.id) {
    return {
      success: false,
      message: "Проект не найден или не назначен вашей компании",
    };
  }

  if (
    !["contractor_selected", "in_progress"].includes(
      activeProject.project.status
    )
  ) {
    return {
      success: false,
      message: "На текущем статусе проекта нельзя управлять этапами",
    };
  }

  const client = await db.connect();
  let stage: StageRow | undefined;
  let notification: {
    type: string;
    title: string;
    body: string;
  } | null = null;
  let successMessage = "Статус этапа обновлён";

  try {
    await client.query("BEGIN");

    const projectResult = await client.query<ProjectRow>(
      `
        SELECT
          id,
          status,
          risk_hold,
          risk_hold_reason
        FROM public.projects
        WHERE id = $1
          AND selected_contractor_id = $2
          AND is_admin_blocked = false
        LIMIT 1
        FOR UPDATE
      `,
      [projectId, company.id]
    );

    const project = projectResult.rows[0];

    if (!project) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Проект не найден или не назначен вашей компании",
      };
    }

    if (project.risk_hold) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: holdMessage(project.risk_hold_reason),
      };
    }

    const stageResult = await client.query<StageRow>(
      `
        SELECT id, title, status
        FROM public.project_stages
        WHERE id = $1
          AND project_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [stageId, projectId]
    );

    stage = stageResult.rows[0];

    if (!stage) {
      await client.query("ROLLBACK");
      return { success: false, message: "Этап не найден" };
    }

    if (action === "start") {
      if (stage.status !== "planned") {
        await client.query("ROLLBACK");
        return { success: false, message: "Начать можно только запланированный этап" };
      }

      await client.query(
        `
          UPDATE public.project_stages
          SET
            status = 'in_progress',
            actual_started_at = now(),
            actual_completed_at = NULL,
            submitted_for_review_at = NULL,
            reviewed_at = NULL,
            reviewed_by = NULL,
            customer_review_comment = NULL,
            updated_at = now()
          WHERE id = $1
            AND project_id = $2
            AND status = 'planned'
        `,
        [stageId, projectId]
      );

      if (project.status === "contractor_selected") {
        await client.query(
          `
            UPDATE public.projects
            SET
              status = 'in_progress',
              work_started_at = now(),
              updated_at = now()
            WHERE id = $1
              AND selected_contractor_id = $2
              AND status = 'contractor_selected'
          `,
          [projectId, company.id]
        );
      }

      await insertStageEvent(client, {
        projectId,
        authorId: user.id,
        eventType: "stage_started",
        title: "Этап начат",
        description: stage.title,
        stageId,
      });

      notification = {
        type: "stage_started",
        title: "Начат новый этап",
        body: `Подрядчик начал этап «${stage.title}».`,
      };
      successMessage = "Этап переведён в работу";
    } else if (action === "submit") {
      if (stage.status !== "in_progress") {
        await client.query("ROLLBACK");
        return {
          success: false,
          message: "На проверку можно отправить только выполняемый этап",
        };
      }

      await client.query(
        `
          UPDATE public.project_stages
          SET
            status = 'awaiting_review',
            submitted_for_review_at = now(),
            customer_review_comment = NULL,
            reviewed_at = NULL,
            reviewed_by = NULL,
            updated_at = now()
          WHERE id = $1
            AND project_id = $2
            AND status = 'in_progress'
        `,
        [stageId, projectId]
      );

      await insertStageEvent(client, {
        projectId,
        authorId: user.id,
        eventType: "stage_submitted_for_review",
        title: "Этап отправлен на проверку",
        description: stage.title,
        stageId,
      });

      notification = {
        type: "stage_submitted",
        title: "Этап готов к приёмке",
        body: `Подрядчик завершил этап «${stage.title}» и отправил его на проверку.`,
      };
      successMessage = "Этап отправлен заказчику на проверку";
    } else {
      if (stage.status !== "revision_required") {
        await client.query("ROLLBACK");
        return {
          success: false,
          message: "Возобновить можно только этап с замечанием",
        };
      }

      await client.query(
        `
          UPDATE public.project_stages
          SET
            status = 'in_progress',
            submitted_for_review_at = NULL,
            reviewed_at = NULL,
            reviewed_by = NULL,
            updated_at = now()
          WHERE id = $1
            AND project_id = $2
            AND status = 'revision_required'
        `,
        [stageId, projectId]
      );

      await insertStageEvent(client, {
        projectId,
        authorId: user.id,
        eventType: "stage_started",
        title: "Исправление замечаний начато",
        description: stage.title,
        stageId,
      });

      notification = {
        type: "stage_started",
        title: "Подрядчик начал доработку",
        body: `Подрядчик возобновил этап «${stage.title}» и приступил к устранению замечаний.`,
      };
      successMessage = "Этап возвращён в работу";
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка изменения статуса этапа:", error);
    return { success: false, message: "Не удалось изменить статус этапа" };
  } finally {
    client.release();
  }

  if (notification && stage) {
    await notifyParticipant({
      projectId,
      actorId: user.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      stageId,
    });
  }

  revalidateWorkspace(projectId);
  return { success: true, message: successMessage };
}

async function notifyParticipant({
  projectId,
  actorId,
  type,
  title,
  body,
  stageId,
}: {
  projectId: string;
  actorId: string;
  type: string;
  title: string;
  body: string;
  stageId: string;
}) {
  try {
    const recipient = await getProjectNotificationRecipient(projectId, actorId);
    if (!recipient) return;

    await createNotification({
      userId: recipient.recipientUserId,
      actorId,
      notificationType: type,
      title,
      body,
      projectId,
      url:
        recipient.recipientRole === "customer"
          ? `/customer/work/${projectId}`
          : `/contractor/work/${projectId}`,
      metadata: { stage_id: stageId },
    });
  } catch (error) {
    console.error("Ошибка уведомления об этапе:", error);
  }
}

async function insertStageEvent(
  client: PoolClient,
  {
    projectId,
    authorId,
    eventType,
    title,
    description,
    stageId,
  }: {
    projectId: string;
    authorId: string;
    eventType: string;
    title: string;
    description: string;
    stageId: string;
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
      projectId,
      authorId,
      eventType,
      title,
      description,
      JSON.stringify({ stage_id: stageId }),
    ]
  );
}

function holdMessage(reason: string | null) {
  return reason
    ? `Проект приостановлен администрацией: ${reason}`
    : "Проект приостановлен администрацией";
}

function revalidateWorkspace(projectId: string) {
  revalidatePath(`/contractor/work/${projectId}`);
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/customer/projects/${projectId}`);
  revalidatePath("/contractor/dashboard");
  revalidatePath("/customer/dashboard");
  revalidatePath("/customer", "layout");
  revalidatePath("/contractor", "layout");
}
