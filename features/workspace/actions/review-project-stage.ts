"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from
  "@/lib/supabase/server";

import { createNotification } from
  "@/features/notifications/server/create-notification";

import { getProjectNotificationRecipient } from
  "@/features/notifications/server/get-project-notification-recipient";

const reviewSchema = z.object({
  stageId: z
    .string()
    .uuid(
      "Некорректный идентификатор этапа"
    ),

  projectId: z
    .string()
    .uuid(
      "Некорректный идентификатор проекта"
    ),

  decision: z.enum([
    "approve",
    "revision",
  ]),

  comment: z
    .string()
    .trim()
    .max(
      3000,
      "Замечание слишком длинное"
    )
    .optional()
    .or(z.literal("")),
});

type ReviewInput =
  z.infer<
    typeof reviewSchema
  >;

export type ReviewProjectStageResult = {
  success: boolean;
  message: string;
};

export async function reviewProjectStage(
  input: ReviewInput
): Promise<ReviewProjectStageResult> {
  /*
   * 1. Проверяем входные данные.
   */
  const parsed =
    reviewSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,

      message:
        parsed.error.issues[0]
          ?.message ??
        "Проверьте данные",
    };
  }

  const {
    stageId,
    projectId,
    decision,
  } = parsed.data;

  const comment =
    parsed.data.comment
      ?.trim() ?? "";

  /*
   * При возврате этапа
   * замечание обязательно.
   */
  if (
    decision === "revision" &&
    comment.length < 2
  ) {
    return {
      success: false,
      message:
        "Укажите замечание подрядчику",
    };
  }

  /*
   * 2. Создаём Supabase client.
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

  /*
   * 4. До вызова RPC загружаем
   * информацию об этапе.
   *
   * Она понадобится для текста
   * уведомления.
   */
  const {
    data: stage,
    error: stageError,
  } = await supabase
    .from("project_stages")
    .select(`
      id,
      project_id,
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
      "Ошибка загрузки этапа перед приёмкой:",
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

  /*
   * Этап должен находиться
   * на проверке заказчика.
   */
  if (
    stage.status !==
    "awaiting_review"
  ) {
    return {
      success: false,
      message:
        "Этот этап сейчас не ожидает приёмки",
    };
  }

  /*
   * 5. Вызываем существующую RPC.
   *
   * Вся основная бизнес-логика
   * приёмки остаётся в базе.
   */
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "review_project_stage",
      {
        target_stage_id:
          stageId,

        target_project_id:
          projectId,

        decision,

        review_comment:
          comment || null,
      }
    );

  if (error) {
    console.error(
      "Ошибка проверки этапа:",
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
        error.message ||
        "Не удалось обработать этап",
    };
  }

  /*
   * RPC возвращает объект вида:
   *
   * {
   *   success: true,
   *   message: "..."
   * }
   */
  const result =
    data as {
      success?: boolean;
      message?: string;
    } | null;

  const operationSuccess =
    result?.success ??
    true;

  const operationMessage =
    result?.message ??
    (
      decision === "approve"
        ? "Этап принят"
        : "Этап возвращён на доработку"
    );

  /*
   * Если RPC сама сообщила,
   * что операция не выполнена,
   * уведомление не создаём.
   */
  if (!operationSuccess) {
    return {
      success: false,
      message:
        operationMessage,
    };
  }

  /*
   * 6. Создаём уведомление подрядчику.
   *
   * Ошибка уведомления НЕ должна
   * отменять уже выполненную приёмку.
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

      /*
       * Заказчик принял этап.
       */
      if (
        decision ===
        "approve"
      ) {
        const notificationResult =
          await createNotification({
            userId:
              recipient.recipientUserId,

            actorId:
              user.id,

            notificationType:
              "stage_approved",

            title:
              "Этап принят заказчиком",

            body:
              `Заказчик принял этап «${stage.title}».`,

            projectId,

            url:
              notificationUrl,

            metadata: {
              stage_id:
                stage.id,

              stage_title:
                stage.title,

              decision:
                "approve",
            },
          });

        if (
          !notificationResult.success
        ) {
          console.error(
            "Не удалось создать уведомление о принятии этапа:",
            notificationResult.message
          );
        }
      }

      /*
       * Заказчик вернул этап
       * на доработку.
       */
      if (
        decision ===
        "revision"
      ) {
        const notificationBody =
          comment
            ? `Этап «${stage.title}»: ${getNotificationPreview(
                comment
              )}`
            : `Этап «${stage.title}» возвращён на доработку.`;

        const notificationResult =
          await createNotification({
            userId:
              recipient.recipientUserId,

            actorId:
              user.id,

            notificationType:
              "stage_revision_requested",

            title:
              "Этап возвращён на доработку",

            body:
              notificationBody,

            projectId,

            url:
              notificationUrl,

            metadata: {
              stage_id:
                stage.id,

              stage_title:
                stage.title,

              decision:
                "revision",

              review_comment:
                comment || null,
            },
          });

        if (
          !notificationResult.success
        ) {
          console.error(
            "Не удалось создать уведомление о возврате этапа:",
            notificationResult.message
          );
        }
      }
    }
  } catch (
    notificationError
  ) {
    console.error(
      "Непредвиденная ошибка создания уведомления о приёмке этапа:",
      notificationError
    );
  }

  /*
   * 7. Обновляем связанные страницы.
   */
  revalidateWorkspace(
    projectId
  );

  return {
    success: true,
    message:
      operationMessage,
  };
}

function revalidateWorkspace(
  projectId: string
) {
  /*
   * Рабочее пространство заказчика.
   */
  revalidatePath(
    `/customer/work/${projectId}`
  );

  /*
   * Рабочее пространство подрядчика.
   */
  revalidatePath(
    `/contractor/work/${projectId}`
  );

  /*
   * Страница проекта заказчика.
   */
  revalidatePath(
    `/customer/projects/${projectId}`
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
   * Header содержит уведомления,
   * поэтому обновляем layout.
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

function getNotificationPreview(
  value: string
) {
  const normalized =
    value
      .trim()
      .replace(
        /\s+/g,
        " "
      );

  /*
   * Короткое замечание
   * показываем полностью.
   */
  if (
    normalized.length <=
    160
  ) {
    return normalized;
  }

  /*
   * Длинное обрезаем,
   * чтобы уведомление
   * не становилось огромным.
   */
  return `${normalized.slice(
    0,
    157
  )}...`;
}