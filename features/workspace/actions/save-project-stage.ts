"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import {
  projectStageSchema,
  type ProjectStageInput,
} from
  "@/features/workspace/schemas/project-stage-schema";

import { createNotification } from
  "@/features/notifications/server/create-notification";

import { getProjectNotificationRecipient } from
  "@/features/notifications/server/get-project-notification-recipient";

export type SaveProjectStageResult = {
  success: boolean;
  message: string;
  stageId?: string;
};

export async function saveProjectStage(
  input: ProjectStageInput
): Promise<SaveProjectStageResult> {
  /*
   * 1. Проверяем входные данные.
   */
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

  /*
   * 2. Supabase client.
   */
  const supabase =
    await createClient();

  /*
   * 3. Проверяем авторизацию.
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

  const values =
    parsed.data;

  /*
   * 4. Получаем компанию подрядчика.
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
   * 5. Проверяем, что проект
   * действительно назначен этой компании.
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
    console.error(
      "Ошибка проверки проекта:",
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
   * Этапы разрешено менять только
   * после выбора подрядчика и во время работы.
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
        "На текущем статусе проекта нельзя менять этапы",
    };
  }

  /*
   * 6. Данные этапа.
   */
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

  /*
   * ==========================================
   * РЕДАКТИРОВАНИЕ СУЩЕСТВУЮЩЕГО ЭТАПА
   * ==========================================
   */
  if (
    values.stageId
  ) {
    /*
     * Сначала получаем текущий этап.
     *
     * Это позволяет проверить его статус
     * и сохранить старые значения
     * для metadata уведомления.
     */
    const {
      data: existingStage,
      error: existingStageError,
    } = await supabase
      .from(
        "project_stages"
      )
      .select(`
        id,
        title,
        description,
        price,
        progress_weight,
        status,
        planned_start_date,
        planned_end_date
      `)
      .eq(
        "id",
        values.stageId
      )
      .eq(
        "project_id",
        values.projectId
      )
      .maybeSingle();

    if (
      existingStageError ||
      !existingStage
    ) {
      console.error(
        "Ошибка загрузки этапа перед обновлением:",
        {
          message:
            existingStageError
              ?.message,

          details:
            existingStageError
              ?.details,

          hint:
            existingStageError
              ?.hint,

          code:
            existingStageError
              ?.code,
        }
      );

      return {
        success: false,

        message:
          "Этап не найден",
      };
    }

    /*
     * Принятый этап менять нельзя.
     */
    if (
      existingStage.status ===
      "completed"
    ) {
      return {
        success: false,

        message:
          "Принятый этап нельзя редактировать",
      };
    }

    /*
     * Этап, который сейчас проверяет заказчик,
     * тоже лучше не менять.
     */
    if (
      existingStage.status ===
      "awaiting_review"
    ) {
      return {
        success: false,

        message:
          "Этап находится на проверке заказчика и пока не может быть изменён",
      };
    }

    const {
      data: updatedStage,
      error: updateError,
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
      .select(`
        id,
        title,
        status
      `)
      .maybeSingle();

    if (
      updateError ||
      !updatedStage
    ) {
      console.error(
        "Ошибка обновления этапа:",
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
          "Не удалось обновить этап",
      };
    }

    /*
     * Создаём событие проекта.
     */
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
          "stage_updated",

        title:
          "Этап работ изменён",

        description:
          updatedStage.title,

        metadata: {
          stage_id:
            updatedStage.id,

          old_title:
            existingStage.title,

          new_title:
            updatedStage.title,

          progress_weight:
            values.progressWeight,

          price:
            values.price ??
            null,
        },
      });

    if (eventError) {
      console.error(
        "Ошибка создания события изменения этапа:",
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
     * Создаём уведомление заказчику.
     *
     * Ошибка уведомления не отменяет
     * уже выполненное обновление этапа.
     */
    try {
      const recipient =
        await getProjectNotificationRecipient(
          values.projectId,
          user.id
        );

      if (recipient) {
        const notificationUrl =
          recipient.recipientRole ===
          "customer"
            ? `/customer/work/${values.projectId}`
            : `/contractor/work/${values.projectId}`;

        const notificationResult =
          await createNotification({
            userId:
              recipient.recipientUserId,

            actorId:
              user.id,

            notificationType:
              "stage_updated",

            title:
              "Изменён этап работ",

            body:
              getStageUpdatedNotificationBody({
                oldTitle:
                  existingStage.title,

                newTitle:
                  updatedStage.title,

                progressWeight:
                  values.progressWeight,

                price:
                  values.price ??
                  null,
              }),

            projectId:
              values.projectId,

            url:
              notificationUrl,

            metadata: {
              stage_id:
                updatedStage.id,

              old_title:
                existingStage.title,

              new_title:
                updatedStage.title,

              progress_weight:
                values.progressWeight,

              price:
                values.price ??
                null,

              contractor_id:
                company.id,
            },
          });

        if (
          !notificationResult.success
        ) {
          console.error(
            "Не удалось создать уведомление об изменении этапа:",
            notificationResult.message
          );
        }
      }
    } catch (
      notificationError
    ) {
      console.error(
        "Непредвиденная ошибка создания уведомления об изменении этапа:",
        notificationError
      );
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

  /*
   * ==========================================
   * СОЗДАНИЕ НОВОГО ЭТАПА
   * ==========================================
   */

  /*
   * Определяем следующий sort_order.
   */
  const {
    data: lastStage,
    error: lastStageError,
  } = await supabase
    .from(
      "project_stages"
    )
    .select(`
      sort_order
    `)
    .eq(
      "project_id",
      values.projectId
    )
    .order(
      "sort_order",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (lastStageError) {
    console.error(
      "Ошибка определения порядка этапа:",
      {
        message:
          lastStageError.message,

        details:
          lastStageError.details,

        hint:
          lastStageError.hint,

        code:
          lastStageError.code,
      }
    );
  }

  const nextSortOrder =
    (
      lastStage
        ?.sort_order ??
      -1
    ) + 1;

  /*
   * Создаём этап.
   */
  const {
    data: createdStage,
    error: insertError,
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
    .select(`
      id,
      title,
      status,
      progress_weight,
      price,
      planned_start_date,
      planned_end_date
    `)
    .single();

  if (
    insertError ||
    !createdStage
  ) {
    console.error(
      "Ошибка создания этапа:",
      {
        message:
          insertError?.message,

        details:
          insertError?.details,

        hint:
          insertError?.hint,

        code:
          insertError?.code,
      }
    );

    return {
      success: false,

      message:
        "Не удалось создать этап",
    };
  }

  /*
   * Создаём событие проекта.
   */
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

        progress_weight:
          values.progressWeight,

        price:
          values.price ??
          null,

        planned_start_date:
          values.plannedStartDate ||
          null,

        planned_end_date:
          values.plannedEndDate ||
          null,
      },
    });

  if (eventError) {
    console.error(
      "Ошибка создания события:",
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
   * Создаём уведомление заказчику.
   */
  try {
    const recipient =
      await getProjectNotificationRecipient(
        values.projectId,
        user.id
      );

    if (recipient) {
      const notificationUrl =
        recipient.recipientRole ===
        "customer"
          ? `/customer/work/${values.projectId}`
          : `/contractor/work/${values.projectId}`;

      const notificationResult =
        await createNotification({
          userId:
            recipient.recipientUserId,

          actorId:
            user.id,

          notificationType:
            "stage_created",

          title:
            "Добавлен новый этап",

          body:
            getStageCreatedNotificationBody({
              title:
                createdStage.title,

              progressWeight:
                values.progressWeight,

              price:
                values.price ??
                null,
            }),

          projectId:
            values.projectId,

          url:
            notificationUrl,

          metadata: {
            stage_id:
              createdStage.id,

            stage_title:
              createdStage.title,

            progress_weight:
              values.progressWeight,

            price:
              values.price ??
              null,

            planned_start_date:
              values.plannedStartDate ||
              null,

            planned_end_date:
              values.plannedEndDate ||
              null,

            contractor_id:
              company.id,
          },
        });

      if (
        !notificationResult.success
      ) {
        console.error(
          "Не удалось создать уведомление о новом этапе:",
          notificationResult.message
        );
      }
    }
  } catch (
    notificationError
  ) {
    console.error(
      "Непредвиденная ошибка создания уведомления о новом этапе:",
      notificationError
    );
  }

  /*
   * Обновляем рабочее пространство.
   */
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

function getStageCreatedNotificationBody({
  title,
  progressWeight,
  price,
}: {
  title: string;
  progressWeight: number;
  price:
    | number
    | null;
}) {
  const parts = [
    `Подрядчик добавил этап «${title}».`,
  ];

  if (
    progressWeight > 0
  ) {
    parts.push(
      `Доля проекта: ${progressWeight}%.`
    );
  }

  if (
    price !== null
  ) {
    parts.push(
      `Стоимость: ${formatMoney(
        price
      )}.`
    );
  }

  return parts.join(
    " "
  );
}

function getStageUpdatedNotificationBody({
  oldTitle,
  newTitle,
  progressWeight,
  price,
}: {
  oldTitle: string;
  newTitle: string;
  progressWeight: number;
  price:
    | number
    | null;
}) {
  const parts:
    string[] = [];

  if (
    oldTitle !==
    newTitle
  ) {
    parts.push(
      `Этап «${oldTitle}» переименован в «${newTitle}».`
    );
  } else {
    parts.push(
      `Подрядчик изменил этап «${newTitle}».`
    );
  }

  if (
    progressWeight > 0
  ) {
    parts.push(
      `Доля проекта: ${progressWeight}%.`
    );
  }

  if (
    price !== null
  ) {
    parts.push(
      `Стоимость: ${formatMoney(
        price
      )}.`
    );
  }

  return parts.join(
    " "
  );
}

function formatMoney(
  value: number
) {
  return new Intl.NumberFormat(
    "ru-RU",
    {
      style:
        "currency",

      currency:
        "RUB",

      maximumFractionDigits:
        0,
    }
  ).format(
    value
  );
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

  /*
   * Уведомления находятся
   * в layout.
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