"use server";

import { revalidatePath } from
  "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import { requireActiveUser } from
  "@/lib/auth/require-active-user";

import { requireActiveProject } from
  "@/lib/projects/require-active-project";

export type DeleteProjectStageResult = {
  success: boolean;
  message: string;
};

export async function deleteProjectStage(
  stageId: string,
  projectId: string
): Promise<DeleteProjectStageResult> {
  /*
   * 1. Проверяем активного пользователя.
   */
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

  /*
   * Управлять этапами может
   * только подрядчик.
   */
  if (
    profile.role !==
    "contractor"
  ) {
    return {
      success: false,
      message:
        "Удалять этапы может только подрядчик",
    };
  }

  /*
   * 2. Проверяем административную
   * блокировку проекта.
   */
  const activeProject =
    await requireActiveProject(
      projectId
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

  /*
   * 3. Находим компанию
   * текущего подрядчика.
   */
  const {
    data: company,
    error: companyError,
  } = await supabase
    .from(
      "contractor_companies"
    )
    .select(`
      id,
      owner_id
    `)
    .eq(
      "owner_id",
      user.id
    )
    .maybeSingle();

  if (
    companyError ||
    !company
  ) {
    console.error(
      "Ошибка загрузки компании подрядчика:",
      companyError
    );

    return {
      success: false,
      message:
        "Компания подрядчика не найдена",
    };
  }

  /*
   * 4. Проверяем, что именно эта
   * компания назначена на проект.
   */
  if (
    activeProject.project
      .selected_contractor_id !==
    company.id
  ) {
    return {
      success: false,
      message:
        "Проект не назначен вашей компании",
    };
  }

  /*
   * Дополнительно разрешаем управление
   * этапами только в рабочих статусах.
   */
  if (
    ![
      "contractor_selected",
      "in_progress",
    ].includes(
      activeProject.project.status
    )
  ) {
    return {
      success: false,
      message:
        "На текущем статусе проекта нельзя удалять этапы",
    };
  }

  /*
   * 5. Загружаем сам этап.
   */
  const {
    data: stage,
    error: stageError,
  } = await supabase
    .from(
      "project_stages"
    )
    .select(`
      id,
      title,
      status
    `)
    .eq(
      "id",
      stageId
    )
    .eq(
      "project_id",
      projectId
    )
    .maybeSingle();

  if (
    stageError ||
    !stage
  ) {
    console.error(
      "Ошибка загрузки этапа перед удалением:",
      stageError
    );

    return {
      success: false,
      message:
        "Этап не найден",
    };
  }

  /*
   * Удалить можно только
   * ещё не начатый этап.
   */
  if (
    stage.status !==
    "planned"
  ) {
    return {
      success: false,
      message:
        "Удалить можно только запланированный этап",
    };
  }

  /*
   * 6. Удаляем этап.
   */
  const {
    error: deleteError,
  } = await supabase
    .from(
      "project_stages"
    )
    .delete()
    .eq(
      "id",
      stageId
    )
    .eq(
      "project_id",
      projectId
    )
    .eq(
      "status",
      "planned"
    );

  if (deleteError) {
    console.error(
      "Ошибка удаления этапа:",
      deleteError
    );

    return {
      success: false,
      message:
        "Не удалось удалить этап",
    };
  }

  /*
   * 7. Записываем событие
   * в историю проекта.
   *
   * Ошибка истории не должна
   * отменять уже выполненное удаление.
   */
  const {
    error: eventError,
  } = await supabase
    .from(
      "project_events"
    )
    .insert({
      project_id:
        projectId,

      author_id:
        user.id,

      event_type:
        "stage_deleted",

      title:
        "Этап удалён",

      description:
        `Подрядчик удалил этап «${stage.title}».`,

      metadata: {
        stage_id:
          stageId,

        stage_title:
          stage.title,
      },
    });

  if (eventError) {
    console.error(
      "Ошибка создания события удаления этапа:",
      eventError
    );
  }

  /*
   * 8. Обновляем страницы.
   */
  revalidateWorkspace(
    projectId
  );

  return {
    success: true,
    message:
      "Этап удалён",
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
    `/customer/projects/${projectId}`
  );

  revalidatePath(
    "/contractor/dashboard"
  );

  revalidatePath(
    "/customer/dashboard"
  );

  revalidatePath(
    "/customer",
    "layout"
  );

  revalidatePath(
    "/contractor",
    "layout"
  );
}