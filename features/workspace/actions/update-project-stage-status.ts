"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import { createNotification } from
  "@/features/notifications/server/create-notification";

import { getProjectNotificationRecipient } from
  "@/features/notifications/server/get-project-notification-recipient";

type StageAction =
  | "start"
  | "submit"
  | "resume";

export type UpdateProjectStageStatusResult = {
  success: boolean;
  message: string;
};

export async function updateProjectStageStatus(
  stageId: string,
  projectId: string,
  action: StageAction
): Promise<UpdateProjectStageStatusResult> {
  const supabase =
    await createClient();

  /*
   * Авторизация.
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
   * Компания подрядчика.
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
      public_name
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
      {
        message:
          companyError?.message,

        details:
          companyError?.details,

        hint:
          companyError?.hint,

        code:
          companyError?.code,
      }
    );

    return {
      success: false,

      message:
        "Компания подрядчика не найдена",
    };
  }

  /*
   * Проект должен быть назначен
   * текущей компании.
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
      status,
      selected_contractor_id
    `)
    .eq(
      "id",
      projectId
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
    console.error(
      "Ошибка загрузки проекта:",
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
        "Проект не найден или не назначен вашей компании",
    };
  }

  /*
   * Управлять этапами можно только
   * после назначения подрядчика
   * и во время выполнения проекта.
   */
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
        "На текущем статусе проекта нельзя управлять этапами",
    };
  }

  /*
   * Загружаем этап.
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
      "Ошибка загрузки этапа:",
      {
        message:
          stageError?.message,

        details:
          stageError?.details,

        hint:
          stageError?.hint,

        code:
          stageError?.code,
      }
    );

    return {
      success: false,
      message:
        "Этап не найден",
    };
  }

  const now =
    new Date().toISOString();

  /*
   * =====================================
   * НАЧАТЬ ЭТАП
   * =====================================
   */
  if (
    action ===
    "start"
  ) {
    if (
      stage.status !==
      "planned"
    ) {
      return {
        success: false,

        message:
          "Начать можно только запланированный этап",
      };
    }

    const {
      error,
    } = await supabase
      .from(
        "project_stages"
      )
      .update({
        status:
          "in_progress",

        actual_started_at:
          now,

        actual_completed_at:
          null,

        submitted_for_review_at:
          null,

        reviewed_at:
          null,

        reviewed_by:
          null,

        customer_review_comment:
          null,

        updated_at:
          now,
      })
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

    if (error) {
      console.error(
        "Ошибка начала этапа:",
        {
          message:
            error.message,

          details:
            error.details,

          hint:
            error.hint,

          code:
            error.code,
        }
      );

      return {
        success: false,
        message:
          "Не удалось начать этап",
      };
    }

    /*
     * Если это первый запущенный этап,
     * переводим весь проект в работу.
     */
    if (
      project.status ===
      "contractor_selected"
    ) {
      const {
        error:
          projectUpdateError,
      } = await supabase
        .from("projects")
        .update({
          status:
            "in_progress",

          work_started_at:
            now,

          updated_at:
            now,
        })
        .eq(
          "id",
          projectId
        )
        .eq(
          "selected_contractor_id",
          company.id
        )
        .eq(
          "status",
          "contractor_selected"
        );

      if (
        projectUpdateError
      ) {
        console.error(
          "Ошибка запуска проекта:",
          {
            message:
              projectUpdateError.message,

            details:
              projectUpdateError.details,

            hint:
              projectUpdateError.hint,

            code:
              projectUpdateError.code,
          }
        );
      }
    }

    /*
     * История проекта.
     */
    await createStageEvent({
      supabase,
      projectId,
      authorId:
        user.id,

      eventType:
        "stage_started",

      title:
        "Этап начат",

      description:
        stage.title,

      stageId,
    });

    /*
     * Уведомляем заказчика,
     * что подрядчик начал этап.
     */
    await notifySecondParticipant({
      projectId,
      actorId:
        user.id,

      notificationType:
        "stage_started",

      title:
        "Начат новый этап",

      body:
        `Подрядчик начал выполнение этапа «${stage.title}».`,

      metadata: {
        stage_id:
          stage.id,

        stage_title:
          stage.title,

        started_at:
          now,
      },
    });

    revalidateWorkspace(
      projectId
    );

    return {
      success: true,

      message:
        "Этап переведён в работу",
    };
  }

  /*
   * =====================================
   * ОТПРАВИТЬ ЭТАП НА ПРОВЕРКУ
   * =====================================
   */
  if (
    action ===
    "submit"
  ) {
    if (
      stage.status !==
      "in_progress"
    ) {
      return {
        success: false,

        message:
          "На проверку можно отправить только выполняемый этап",
      };
    }

    const {
      error,
    } = await supabase
      .from(
        "project_stages"
      )
      .update({
        status:
          "awaiting_review",

        submitted_for_review_at:
          now,

        customer_review_comment:
          null,

        reviewed_at:
          null,

        reviewed_by:
          null,

        updated_at:
          now,
      })
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
        "in_progress"
      );

    if (error) {
      console.error(
        "Ошибка отправки этапа на проверку:",
        {
          message:
            error.message,

          details:
            error.details,

          hint:
            error.hint,

          code:
            error.code,
        }
      );

      return {
        success: false,

        message:
          "Не удалось отправить этап на проверку",
      };
    }

    /*
     * История проекта.
     */
    await createStageEvent({
      supabase,
      projectId,

      authorId:
        user.id,

      eventType:
        "stage_submitted_for_review",

      title:
        "Этап отправлен на проверку",

      description:
        stage.title,

      stageId,
    });

    /*
     * Главное уведомление заказчику.
     */
    await notifySecondParticipant({
      projectId,

      actorId:
        user.id,

      notificationType:
        "stage_submitted",

      title:
        "Этап готов к приёмке",

      body:
        `Подрядчик завершил этап «${stage.title}» и отправил его на проверку.`,

      metadata: {
        stage_id:
          stage.id,

        stage_title:
          stage.title,

        submitted_for_review_at:
          now,
      },
    });

    revalidateWorkspace(
      projectId
    );

    return {
      success: true,

      message:
        "Этап отправлен заказчику на проверку",
    };
  }

  /*
   * =====================================
   * ВОЗОБНОВИТЬ ПОСЛЕ ЗАМЕЧАНИЯ
   * =====================================
   */

  if (
    stage.status !==
    "revision_required"
  ) {
    return {
      success: false,

      message:
        "Возобновить можно только этап с замечанием",
    };
  }

  const {
    error,
  } = await supabase
    .from(
      "project_stages"
    )
    .update({
      status:
        "in_progress",

      submitted_for_review_at:
        null,

      reviewed_at:
        null,

      reviewed_by:
        null,

      updated_at:
        now,
    })
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
      "revision_required"
    );

  if (error) {
    console.error(
      "Ошибка возобновления этапа:",
      {
        message:
          error.message,

        details:
          error.details,

        hint:
          error.hint,

        code:
          error.code,
      }
    );

    return {
      success: false,

      message:
        "Не удалось возобновить этап",
    };
  }

  /*
   * История.
   */
  await createStageEvent({
    supabase,

    projectId,

    authorId:
      user.id,

    eventType:
      "stage_started",

    title:
      "Исправление замечаний начато",

    description:
      stage.title,

    stageId,
  });

  /*
   * Уведомляем заказчика,
   * что подрядчик приступил
   * к исправлению замечаний.
   */
  await notifySecondParticipant({
    projectId,

    actorId:
      user.id,

    notificationType:
      "stage_started",

    title:
      "Подрядчик начал доработку",

    body:
      `Подрядчик возобновил этап «${stage.title}» и приступил к устранению замечаний.`,

    metadata: {
      stage_id:
        stage.id,

      stage_title:
        stage.title,

      resumed_at:
        now,
    },
  });

  revalidateWorkspace(
    projectId
  );

  return {
    success: true,

    message:
      "Этап возвращён в работу",
  };
}

/*
 * Универсальная отправка уведомления
 * второму участнику проекта.
 */
async function notifySecondParticipant({
  projectId,
  actorId,
  notificationType,
  title,
  body,
  metadata,
}: {
  projectId: string;

  actorId: string;

  notificationType: string;

  title: string;

  body: string;

  metadata:
    Record<
      string,
      unknown
    >;
}) {
  try {
    const recipient =
      await getProjectNotificationRecipient(
        projectId,
        actorId
      );

    if (!recipient) {
      return;
    }

    const notificationUrl =
      recipient.recipientRole ===
      "customer"
        ? `/customer/work/${projectId}`
        : `/contractor/work/${projectId}`;

    const result =
      await createNotification({
        userId:
          recipient.recipientUserId,

        actorId,

        notificationType,

        title,

        body,

        projectId,

        url:
          notificationUrl,

        metadata,
      });

    if (!result.success) {
      console.error(
        "Не удалось создать уведомление этапа:",
        result.message
      );
    }
  } catch (
    notificationError
  ) {
    /*
     * Ошибка уведомления
     * не должна отменять
     * изменение статуса этапа.
     */
    console.error(
      "Непредвиденная ошибка уведомления этапа:",
      notificationError
    );
  }
}

/*
 * История проекта.
 */
async function createStageEvent({
  supabase,
  projectId,
  authorId,
  eventType,
  title,
  description,
  stageId,
}: {
  supabase:
    Awaited<
      ReturnType<
        typeof createClient
      >
    >;

  projectId: string;

  authorId: string;

  eventType: string;

  title: string;

  description: string;

  stageId: string;
}) {
  const {
    error,
  } = await supabase
    .from(
      "project_events"
    )
    .insert({
      project_id:
        projectId,

      author_id:
        authorId,

      event_type:
        eventType,

      title,

      description,

      metadata: {
        stage_id:
          stageId,
      },
    });

  if (error) {
    console.error(
      "Ошибка создания события:",
      {
        message:
          error.message,

        details:
          error.details,

        hint:
          error.hint,

        code:
          error.code,
      }
    );
  }
}

/*
 * Обновление страниц.
 */
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

  /*
   * Колокольчик находится
   * в layout.
   */
  revalidatePath(
    "/contractor",
    "layout"
  );

  revalidatePath(
    "/customer",
    "layout"
  );
}