"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { requireActiveProject } from "@/lib/projects/require-active-project";
import { requireActiveContract } from "@/lib/projects/require-active-contract";

export type DeleteProjectStageResult = {
  success: boolean;
  message: string;
};

type StageRow = {
  id: string;
  title: string;
  status: string;
};

export async function deleteProjectStage(
  stageId: string,
  projectId: string
): Promise<DeleteProjectStageResult> {
  const activeUser = await requireActiveUser();

  if (!activeUser.success) {
    return { success: false, message: activeUser.message };
  }

  const { user, profile } = activeUser;

  if (profile.role !== "contractor") {
    return {
      success: false,
      message: "Удалять этапы может только подрядчик",
    };
  }

  const activeProject = await requireActiveProject(projectId);

  if (!activeProject.success) {
    return { success: false, message: activeProject.message };
  }

  const contract = await requireActiveContract(projectId);
  if (!contract.success) {
    return { success: false, message: contract.message };
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
      message: "Проект не назначен вашей компании",
    };
  }

  if (
    !["contractor_selected", "in_progress"].includes(
      activeProject.project.status
    )
  ) {
    return {
      success: false,
      message: "На текущем статусе проекта нельзя удалять этапы",
    };
  }

  if (activeProject.project.status === "in_progress") {
    return {
      success: false,
      message: "После начала работ удаление этапа меняет согласованный план. Оформите изменение проекта вместо удаления.",
    };
  }

  const client = await db.connect();
  let stage: StageRow | undefined;

  try {
    await client.query("BEGIN");

    const projectLock = await client.query(
      `
        SELECT id
        FROM public.projects
        WHERE id=$1::uuid
          AND selected_contractor_id=$2::uuid
          AND status='contractor_selected'
          AND is_admin_blocked=false
          AND COALESCE(risk_hold,false)=false
        LIMIT 1
        FOR UPDATE
      `,
      [projectId, company.id]
    );
    if (!projectLock.rowCount) {
      await client.query("ROLLBACK");
      return { success: false, message: "План этапов уже нельзя изменять" };
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

    if (stage.status !== "planned") {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Удалить можно только запланированный этап",
      };
    }

    const deleteResult = await client.query<{ id: string }>(
      `
        DELETE FROM public.project_stages
        WHERE id = $1
          AND project_id = $2
          AND status = 'planned'
        RETURNING id
      `,
      [stageId, projectId]
    );

    if (!deleteResult.rows[0]) {
      throw new Error("Этап не был удалён");
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка удаления этапа:", error);
    return { success: false, message: "Не удалось удалить этап" };
  } finally {
    client.release();
  }

  try {
    await db.query(
      `
        INSERT INTO public.project_events (
          project_id,
          author_id,
          event_type,
          title,
          description,
          metadata
        )
        VALUES ($1, $2, 'stage_deleted', $3, $4, $5::jsonb)
      `,
      [
        projectId,
        user.id,
        "Этап удалён",
        `Подрядчик удалил этап «${stage?.title ?? ""}».`,
        JSON.stringify({ stage_id: stageId, stage_title: stage?.title ?? null }),
      ]
    );
  } catch (error) {
    console.error("Ошибка создания события удаления этапа:", error);
  }

  revalidateWorkspace(projectId);

  return { success: true, message: "Этап удалён" };
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
