"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import { createNotification } from
  "@/features/notifications/server/create-notification";

import { getProjectNotificationRecipient } from
  "@/features/notifications/server/get-project-notification-recipient";

export type CompleteProjectResult = {
  success: boolean;
  message: string;
};

export async function completeProject(
  projectId: string
): Promise<CompleteProjectResult> {
  /*
   * 1. Supabase.
   */
  const supabase =
    await createClient();

  /*
   * 2. Проверяем авторизацию.
   */
  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      success: false,
      message:
        "Необходимо войти",
    };
  }

  /*
   * 3. Получаем проект.
   *
   * Завершить проект может
   * только его заказчик.
   */
  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .select(`
      id,
      title,
      customer_id,
      selected_contractor_id,
      status
    `)
    .eq(
      "id",
      projectId
    )
    .eq(
      "customer_id",
      user.id
    )
    .maybeSingle();

  if (
    projectError ||
    !project
  ) {
    console.error(
      "Ошибка загрузки проекта перед завершением:",
      {
        message:
          projectError?.message,

        details:
          projectError?.details,

        hint:
          projectError?.hint,

        code:
          projectError?.code,
      }
    );

    return {
      success: false,
      message:
        "Проект не найден",
    };
  }

  /*
   * 4. Проверяем статус.
   */
  if (
    project.status ===
    "completed"
  ) {
    return {
      success: false,
      message:
        "Проект уже завершён",
    };
  }

  if (
    project.status !==
    "in_progress"
  ) {
    return {
      success: false,

      message:
        "На текущем статусе проект нельзя завершить",
    };
  }

  /*
   * 5. У проекта должен быть
   * выбран подрядчик.
   */
  if (
    !project.selected_contractor_id
  ) {
    return {
      success: false,

      message:
        "У проекта не выбран подрядчик",
    };
  }

  /*
   * 6. Загружаем этапы.
   */
  const {
    data: stages,
    error: stagesError,
  } = await supabase
    .from(
      "project_stages"
    )
    .select(`
      id,
      title,
      status,
      progress_weight
    `)
    .eq(
      "project_id",
      projectId
    );

  if (stagesError) {
    console.error(
      "Ошибка загрузки этапов:",
      {
        message:
          stagesError.message,

        details:
          stagesError.details,

        hint:
          stagesError.hint,

        code:
          stagesError.code,
      }
    );

    return {
      success: false,

      message:
        "Не удалось проверить этапы проекта",
    };
  }

  /*
   * Без этапов завершать
   * проект нельзя.
   */
  if (
    !stages ||
    stages.length === 0
  ) {
    return {
      success: false,

      message:
        "Нельзя завершить проект без этапов",
    };
  }

  /*
   * 7. Проверяем, что все этапы
   * действительно приняты заказчиком.
   */
  const incompleteStages =
    stages.filter(
      (stage) =>
        stage.status !==
        "completed"
    );

  if (
    incompleteStages.length >
    0
  ) {
    return {
      success: false,

      message:
        `Нельзя завершить проект: не завершено этапов — ${incompleteStages.length}.`,
    };
  }

  /*
   * 8. Проверяем сумму долей.
   *
   * Для окончательного завершения
   * должно быть ровно 100%.
   */
  const totalWeight =
    stages.reduce(
      (
        sum,
        stage
      ) =>
        sum +
        Number(
          stage.progress_weight ??
            0
        ),
      0
    );

  if (
    totalWeight !== 100
  ) {
    return {
      success: false,

      message:
        `Нельзя завершить проект: сумма долей этапов составляет ${totalWeight}%, необходимо 100%.`,
    };
  }

  /*
   * 9. Завершаем проект.
   */
  const completedAt =
    new Date().toISOString();

  const {
    data: completedProject,
    error: updateError,
  } = await supabase
    .from("projects")
    .update({
      status:
        "completed",

      completed_at:
        completedAt,

      updated_at:
        completedAt,
    })
    .eq(
      "id",
      projectId
    )
    .eq(
      "customer_id",
      user.id
    )
    .select(`
      id,
      title,
      status,
      completed_at
    `)
    .maybeSingle();

  if (
    updateError ||
    !completedProject
  ) {
    console.error(
      "Ошибка завершения проекта:",
      {
        message:
          updateError?.message,

        details:
          updateError?.details,

        hint:
          updateError?.hint,

        code:
          updateError?.code,
      }
    );

    return {
      success: false,

      message:
        "Не удалось завершить проект",
    };
  }

  /*
   * 10. Записываем событие
   * в историю проекта.
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
        "project_completed",

      title:
        "Проект завершён",

      description:
        "Заказчик подтвердил завершение проекта.",

      metadata: {
        completed_at:
          completedAt,

        stages_count:
          stages.length,

        total_progress_weight:
          totalWeight,
      },
    });

  if (eventError) {
    console.error(
      "Ошибка создания события завершения проекта:",
      {
        message:
          eventError.message,

        details:
          eventError.details,

        hint:
          eventError.hint,

        code:
          eventError.code,
      }
    );
  }

  /*
   * 11. Уведомляем подрядчика.
   *
   * Ошибка уведомления не должна
   * отменять уже завершённый проект.
   */
  try {
    const recipient =
      await getProjectNotificationRecipient(
        projectId,
        user.id
      );

    if (recipient) {
      const notificationUrl =
        recipient.recipientRole ===
        "customer"
          ? `/customer/work/${projectId}`
          : `/contractor/work/${projectId}`;

      const notificationResult =
        await createNotification({
          userId:
            recipient.recipientUserId,

          actorId:
            user.id,

          notificationType:
            "project_completed",

          title:
            "Проект завершён",

          body:
            `Заказчик подтвердил завершение проекта «${project.title}».`,

          projectId,

          url:
            notificationUrl,

          metadata: {
            project_title:
              project.title,

            completed_at:
              completedAt,

            stages_count:
              stages.length,

            total_progress_weight:
              totalWeight,

            contractor_id:
              project.selected_contractor_id,
          },
        });

      if (
        !notificationResult.success
      ) {
        console.error(
          "Не удалось создать уведомление о завершении проекта:",
          notificationResult.message
        );
      }
    }
  } catch (
    notificationError
  ) {
    console.error(
      "Непредвиденная ошибка создания уведомления о завершении проекта:",
      notificationError
    );
  }

  /*
   * 12. Обновляем страницы.
   */
  revalidateProject(
    projectId
  );

  return {
    success: true,

    message:
      "Проект успешно завершён",
  };
}

function revalidateProject(
  projectId: string
) {
  /*
   * Рабочие пространства.
   */
  revalidatePath(
    `/customer/work/${projectId}`
  );

  revalidatePath(
    `/contractor/work/${projectId}`
  );

  /*
   * Карточка проекта.
   */
  revalidatePath(
    `/customer/projects/${projectId}`
  );

  /*
   * Списки проектов.
   */
  revalidatePath(
    "/customer/projects"
  );

  revalidatePath(
    "/contractor/work"
  );

  /*
   * Кабинеты.
   */
  revalidatePath(
    "/customer/dashboard"
  );

  revalidatePath(
    "/contractor/dashboard"
  );

  /*
   * В layout находится
   * NotificationCenter.
   *
   * Это обновляет счётчик
   * возле колокольчика.
   */
  revalidatePath(
    "/customer",
    "layout"
  );

  revalidatePath(
    "/contractor",
    "layout"
  );
}