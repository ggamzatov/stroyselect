import "server-only";

import { z } from "zod";

import { createAdminClient } from
  "@/lib/supabase/admin";

const notificationSchema =
  z.object({
    userId: z
      .string()
      .uuid(
        "Некорректный идентификатор получателя"
      ),

    actorId: z
      .string()
      .uuid(
        "Некорректный идентификатор инициатора"
      )
      .nullable()
      .optional(),

    notificationType: z
      .string()
      .trim()
      .min(
        1,
        "Тип уведомления обязателен"
      )
      .max(
        100,
        "Тип уведомления слишком длинный"
      ),

    title: z
      .string()
      .trim()
      .min(
        1,
        "Заголовок уведомления обязателен"
      )
      .max(
        200,
        "Заголовок уведомления слишком длинный"
      ),

    body: z
      .string()
      .trim()
      .max(
        2000,
        "Текст уведомления слишком длинный"
      )
      .nullable()
      .optional(),

    projectId: z
      .string()
      .uuid(
        "Некорректный идентификатор проекта"
      )
      .nullable()
      .optional(),

    messageId: z
      .string()
      .uuid(
        "Некорректный идентификатор сообщения"
      )
      .nullable()
      .optional(),

    url: z
      .string()
      .trim()
      .max(
        1000,
        "Ссылка уведомления слишком длинная"
      )
      .nullable()
      .optional(),

    metadata: z
      .record(
        z.string(),
        z.unknown()
      )
      .optional(),

    deduplicationKey: z
      .string()
      .trim()
      .min(
        1,
        "Ключ дедупликации не может быть пустым"
      )
      .max(
        300,
        "Ключ дедупликации слишком длинный"
      )
      .nullable()
      .optional(),
  });

export type CreateNotificationInput =
  z.infer<
    typeof notificationSchema
  >;

export type CreateNotificationResult = {
  success: boolean;
  message: string;
  notificationId?: string;
  duplicated?: boolean;
};

export async function createNotification(
  input: CreateNotificationInput
): Promise<CreateNotificationResult> {
  const parsed =
    notificationSchema.safeParse(
      input
    );

  if (!parsed.success) {
    console.error(
      "Некорректные данные уведомления:",
      parsed.error.flatten()
    );

    return {
      success: false,
      message:
        parsed.error.issues[0]
          ?.message ??
        "Некорректные данные уведомления",
    };
  }

  const values =
    parsed.data;

  /*
   * Не создаём уведомление,
   * если пользователь является
   * одновременно инициатором и получателем.
   */
  if (
    values.actorId &&
    values.actorId ===
      values.userId
  ) {
    return {
      success: true,
      message:
        "Уведомление самому себе не требуется",
    };
  }

  const supabase =
    createAdminClient();

  const {
    data: notification,
    error,
  } = await supabase
    .from("notifications")
    .insert({
      user_id:
        values.userId,

      actor_id:
        values.actorId ??
        null,

      notification_type:
        values.notificationType,

      title:
        values.title,

      body:
        normalizeNullableText(
          values.body
        ),

      project_id:
        values.projectId ??
        null,

      message_id:
        values.messageId ??
        null,

      url:
        normalizeNullableText(
          values.url
        ),

      metadata:
        values.metadata ??
        {},

      deduplication_key:
        normalizeNullableText(
          values.deduplicationKey
        ),
    })
    .select(`
      id,
      deduplication_key
    `)
    .single();

  /*
   * Ошибка 23505 означает, что запись
   * с таким deduplication_key уже есть.
   *
   * Это не считается ошибкой бизнес-логики:
   * уведомление уже было отправлено.
   */
  if (
    error?.code === "23505"
  ) {
    return {
      success: true,
      message:
        "Такое уведомление уже существует",
      duplicated:
        true,
    };
  }

  if (
    error ||
    !notification
  ) {
    console.error(
      "Ошибка создания уведомления:",
      {
        userId:
          values.userId,

        actorId:
          values.actorId ??
          null,

        notificationType:
          values.notificationType,

        projectId:
          values.projectId ??
          null,

        messageId:
          values.messageId ??
          null,

        deduplicationKey:
          values.deduplicationKey ??
          null,

        error,
      }
    );

    return {
      success: false,
      message:
        error?.message ??
        "Не удалось создать уведомление",
    };
  }

  return {
    success: true,
    message:
      "Уведомление создано",
    notificationId:
      notification.id,
    duplicated:
      false,
  };
}

function normalizeNullableText(
  value:
    | string
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized
    ? normalized
    : null;
}