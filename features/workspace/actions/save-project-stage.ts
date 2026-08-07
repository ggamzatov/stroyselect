"use server";

import { revalidatePath } from
  "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import { requireActiveUser } from
  "@/lib/auth/require-active-user";

import { requireActiveProject } from
  "@/lib/projects/require-active-project";

import {
  projectStageSchema,
  type ProjectStageInput,
} from
  "@/features/workspace/schemas/project-stage-schema";

export type SaveProjectStageResult = {
  success: boolean;
  message: string;
  stageId?: string;
};

export async function saveProjectStage(
  input: ProjectStageInput
): Promise<SaveProjectStageResult> {
  const parsed =
    projectStageSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]
          ?.message ??
        "Проверьте данные этапа",
    };
  }

  const values =
    parsed.data;

  const activeUser =
    await requireActiveUser();

  if (!activeUser.success) {
    return {
      success: false,
      message:
        activeUser.message,
    };
  }

  const {
    user,
    profile,
  } = activeUser;

  if (
    profile.role !==
    "contractor"
  ) {
    return {
      success: false,
      message:
        "Управлять этапами может только подрядчик",
    };
  }

  const activeProject =
    await requireActiveProject(
      values.projectId
    );

  if (!activeProject.success) {
    return {
      success: false,
      message:
        activeProject.message,
    };
  }

  const supabase =
    await createClient();

  const {
    data: company,
    error: companyError,
  } = await supabase
    .from(
      "contractor_companies"
    )
    .select(
      "id"
    )
    .eq(
      "owner_id",
      user.id
    )
    .maybeSingle();

  if (
    companyError ||
    !company
  ) {
    return {
      success: false,
      message:
        "Компания подрядчика не найдена",
    };
  }

  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .select(`
      id,
      selected_contractor_id,
      status
    `)
    .eq(
      "id",
      values.projectId
    )
    .eq(
      "selected_contractor_id",
      company.id
    )
    .maybeSingle();

  if (
    projectError ||
    !project
  ) {
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
    ].includes(
      project.status
    )
  ) {
    return {
      success: false,
      message:
        "На текущем статусе проекта нельзя менять этапы",
    };
  }

  const payload = {
    title:
      values.title,

    description:
      values.description
        ?.trim() ||
      null,

    price:
      values.price ??
      null,

    progress_weight:
      values.progressWeight,

    planned_start_date:
      values.plannedStartDate ||
      null,

    planned_end_date:
      values.plannedEndDate ||
      null,

    updated_at:
      new Date().toISOString(),
  };

  if (values.stageId) {
    const {
      data: updatedStage,
      error,
    } = await supabase
      .from(
        "project_stages"
      )
      .update(
        payload
      )
      .eq(
        "id",
        values.stageId
      )
      .eq(
        "project_id",
        values.projectId
      )
      .select(
        "id"
      )
      .maybeSingle();

    if (
      error ||
      !updatedStage
    ) {
      return {
        success: false,
        message:
          "Не удалось обновить этап",
      };
    }

    revalidateWorkspace(
      values.projectId
    );

    return {
      success: true,
      message:
        "Этап обновлён",
      stageId:
        updatedStage.id,
    };
  }

  const {
    data: lastStage,
  } = await supabase
    .from(
      "project_stages"
    )
    .select(
      "sort_order"
    )
    .eq(
      "project_id",
      values.projectId
    )
    .order(
      "sort_order",
      {
        ascending:
          false,
      }
    )
    .limit(1)
    .maybeSingle();

  const nextSortOrder =
    (
      lastStage?.sort_order ??
      -1
    ) + 1;

  const {
    data: createdStage,
    error,
  } = await supabase
    .from(
      "project_stages"
    )
    .insert({
      project_id:
        values.projectId,

      created_by:
        user.id,

      sort_order:
        nextSortOrder,

      status:
        "planned",

      ...payload,
    })
    .select(
      "id"
    )
    .single();

  if (
    error ||
    !createdStage
  ) {
    return {
      success: false,
      message:
        "Не удалось создать этап",
    };
  }

  const {
    error: eventError,
  } = await supabase
    .from(
      "project_events"
    )
    .insert({
      project_id:
        values.projectId,

      author_id:
        user.id,

      event_type:
        "stage_created",

      title:
        "Добавлен этап работ",

      description:
        values.title,

      metadata: {
        stage_id:
          createdStage.id,
      },
    });

  if (eventError) {
    console.error(
      "Ошибка создания события:",
      eventError
    );
  }

  revalidateWorkspace(
    values.projectId
  );

  return {
    success: true,
    message:
      "Этап добавлен",
    stageId:
      createdStage.id,
  };
}

function revalidateWorkspace(
  projectId: string
) {
  revalidatePath(
    `/customer/work/${projectId}`
  );

  revalidatePath(
    `/contractor/work/${projectId}`
  );

  revalidatePath(
    `/customer/projects/${projectId}`
  );

  revalidatePath(
    "/customer/dashboard"
  );

  revalidatePath(
    "/contractor/dashboard"
  );
}