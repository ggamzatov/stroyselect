"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type StageAction =
  | "start"
  | "complete";

export type UpdateProjectStageStatusResult = {
  success: boolean;
  message: string;
};

export async function updateProjectStageStatus(
  stageId: string,
  projectId: string,
  action: StageAction
): Promise<UpdateProjectStageStatusResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: "Необходимо войти",
    };
  }

  const {
    data: company,
    error: companyError,
  } = await supabase
    .from("contractor_companies")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (companyError || !company) {
    return {
      success: false,
      message: "Компания подрядчика не найдена",
    };
  }

  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .select(`
      id,
      status,
      selected_contractor_id
    `)
    .eq("id", projectId)
    .eq(
      "selected_contractor_id",
      company.id
    )
    .maybeSingle();

  if (projectError || !project) {
    return {
      success: false,
      message:
        "Проект не найден или не назначен вашей компании",
    };
  }

  if (
    ![
      "contractor_selected",
      "in_progress",
    ].includes(project.status)
  ) {
    return {
      success: false,
      message:
        "На текущем статусе проекта нельзя управлять этапами",
    };
  }

  const {
    data: stage,
    error: stageError,
  } = await supabase
    .from("project_stages")
    .select(`
      id,
      title,
      status
    `)
    .eq("id", stageId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (stageError || !stage) {
    return {
      success: false,
      message: "Этап не найден",
    };
  }

  const now = new Date().toISOString();

  if (action === "start") {
    if (stage.status !== "planned") {
      return {
        success: false,
        message:
          "Начать можно только запланированный этап",
      };
    }

    const {
      error: updateError,
    } = await supabase
      .from("project_stages")
      .update({
        status: "in_progress",
        actual_started_at: now,
        actual_completed_at: null,
        updated_at: now,
      })
      .eq("id", stageId)
      .eq("project_id", projectId)
      .eq("status", "planned");

    if (updateError) {
      console.error(
        "Ошибка начала этапа:",
        updateError
      );

      return {
        success: false,
        message:
          "Не удалось начать этап",
      };
    }

    /*
     * Если это первый начатый этап,
     * переводим весь проект в статус
     * «В работе».
     */
    if (
      project.status ===
      "contractor_selected"
    ) {
      const {
        error: projectUpdateError,
      } = await supabase
        .from("projects")
        .update({
          status: "in_progress",
          work_started_at: now,
          updated_at: now,
        })
        .eq("id", projectId)
        .eq(
          "selected_contractor_id",
          company.id
        )
        .eq(
          "status",
          "contractor_selected"
        );

      if (projectUpdateError) {
        console.error(
          "Ошибка обновления проекта:",
          projectUpdateError
        );
      }
    }

    const {
      error: eventError,
    } = await supabase
      .from("project_events")
      .insert({
        project_id: projectId,
        author_id: user.id,
        event_type: "stage_started",
        title: "Этап начат",
        description: stage.title,
        metadata: {
          stage_id: stage.id,
        },
      });

    if (eventError) {
      console.error(
        "Ошибка создания события:",
        eventError
      );
    }

    revalidateWorkspace(projectId);

    return {
      success: true,
      message:
        "Этап переведён в работу",
    };
  }

  if (stage.status !== "in_progress") {
    return {
      success: false,
      message:
        "Завершить можно только выполняемый этап",
    };
  }

  const {
    error: completeError,
  } = await supabase
    .from("project_stages")
    .update({
      status: "completed",
      actual_completed_at: now,
      updated_at: now,
    })
    .eq("id", stageId)
    .eq("project_id", projectId)
    .eq("status", "in_progress");

  if (completeError) {
    console.error(
      "Ошибка завершения этапа:",
      completeError
    );

    return {
      success: false,
      message:
        "Не удалось завершить этап",
    };
  }

  const {
    error: eventError,
  } = await supabase
    .from("project_events")
    .insert({
      project_id: projectId,
      author_id: user.id,
      event_type: "stage_completed",
      title: "Этап завершён",
      description: stage.title,
      metadata: {
        stage_id: stage.id,
      },
    });

  if (eventError) {
    console.error(
      "Ошибка создания события:",
      eventError
    );
  }

  revalidateWorkspace(projectId);

  return {
    success: true,
    message: "Этап завершён",
  };
}

function revalidateWorkspace(
  projectId: string
) {
  revalidatePath(
    `/contractor/work/${projectId}`
  );

  revalidatePath(
    `/customer/work/${projectId}`
  );

  revalidatePath(
    `/contractor/dashboard`
  );

  revalidatePath(
    `/customer/projects/${projectId}`
  );
}