"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from
  "@/lib/supabase/server";

import { requireActiveUser } from
  "@/lib/auth/require-active-user";

import { requireActiveProject } from
  "@/lib/projects/require-active-project";

import { createNotification } from
  "@/features/notifications/server/create-notification";

import { getProjectNotificationRecipient } from
  "@/features/notifications/server/get-project-notification-recipient";

const sendProjectMessageSchema =
  z.object({
    projectId: z
      .string()
      .uuid(
        "Некорректный идентификатор проекта"
      ),

    messageText: z
      .string()
      .trim()
      .min(
        1,
        "Введите сообщение"
      )
      .max(
        5000,
        "Сообщение слишком длинное"
      ),

    replyToId: z.preprocess(
      (value) => {
        if (
          value === "" ||
          value === null ||
          value === undefined
        ) {
          return undefined;
        }

        return value;
      },
      z
        .string()
        .uuid(
          "Некорректное сообщение для ответа"
        )
        .optional()
    ),
  });

export type SendProjectMessageInput =
  z.infer<
    typeof sendProjectMessageSchema
  >;

export type SendProjectMessageResult = {
  success: boolean;
  message: string;
  messageId?: string;
};

export async function sendProjectMessage(
  input: SendProjectMessageInput
): Promise<SendProjectMessageResult> {
  const parsed =
    sendProjectMessageSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]
          ?.message ??
        "Проверьте сообщение",
    };
  }

  const {
    projectId,
    messageText,
    replyToId,
  } = parsed.data;

  /*
   * 1. Аккаунт не должен
   * быть заблокирован.
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

  if (
    ![
      "customer",
      "contractor",
    ].includes(profile.role)
  ) {
    return {
      success: false,
      message:
        "У вас нет доступа к чату проектов",
    };
  }

  /*
   * 2. Проект не должен быть
   * заблокирован администрацией.
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

  const project =
    activeProject.project;

  const supabase =
    await createClient();

  /*
   * 3. Проверяем участие
   * пользователя в проекте.
   */
  let hasAccess =
    project.customer_id ===
    user.id;

  if (
    !hasAccess &&
    project.selected_contractor_id
  ) {
    const {
      data: contractorCompany,
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
        "id",
        project.selected_contractor_id
      )
      .maybeSingle();

    if (companyError) {
      console.error(
        "Ошибка проверки подрядчика перед отправкой сообщения:",
        companyError
      );
    }

    hasAccess =
      contractorCompany
        ?.owner_id ===
      user.id;
  }

  if (!hasAccess) {
    return {
      success: false,
      message:
        "У вас нет доступа к чату этого проекта",
    };
  }

  const allowedProjectStatuses =
    new Set([
      "contractor_selected",
      "in_progress",
      "completed",
      "disputed",
    ]);

  if (
    !allowedProjectStatuses.has(
      project.status
    )
  ) {
    return {
      success: false,
      message:
        "Чат пока недоступен для этого проекта",
    };
  }

  /*
   * Проверяем сообщение,
   * на которое отвечает пользователь.
   */
  if (replyToId) {
    const {
      data: repliedMessage,
      error: replyError,
    } = await supabase
      .from(
        "project_messages"
      )
      .select(`
        id,
        project_id,
        is_deleted
      `)
      .eq(
        "id",
        replyToId
      )
      .eq(
        "project_id",
        projectId
      )
      .maybeSingle();

    if (
      replyError ||
      !repliedMessage
    ) {
      return {
        success: false,
        message:
          "Исходное сообщение не найдено",
      };
    }

    if (
      repliedMessage.is_deleted
    ) {
      return {
        success: false,
        message:
          "Нельзя ответить на удалённое сообщение",
      };
    }
  }

  const normalizedMessage =
    messageText.trim();

  const {
    data: createdMessage,
    error: messageError,
  } = await supabase
    .from(
      "project_messages"
    )
    .insert({
      project_id:
        projectId,

      sender_id:
        user.id,

      message_text:
        normalizedMessage,

      reply_to_id:
        replyToId ?? null,

      edited_at:
        null,

      is_deleted:
        false,

      deleted_at:
        null,

      deleted_by:
        null,
    })
    .select(`
      id,
      project_id,
      sender_id,
      message_text,
      reply_to_id,
      created_at
    `)
    .single();

  if (
    messageError ||
    !createdMessage
  ) {
    console.error(
      "Ошибка отправки сообщения:",
      messageError
    );

    return {
      success: false,
      message:
        messageError?.message ??
        "Не удалось отправить сообщение",
    };
  }

  /*
   * Уведомление второму
   * участнику.
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

      const result =
        await createNotification({
          userId:
            recipient.recipientUserId,

          actorId:
            user.id,

          notificationType:
            "new_message",

          title:
            "Новое сообщение",

          body:
            getNotificationPreview(
              normalizedMessage
            ),

          projectId,

          messageId:
            createdMessage.id,

          url:
            notificationUrl,

          metadata: {
            sender_id:
              user.id,

            reply_to_id:
              replyToId ??
              null,
          },
        });

      if (!result.success) {
        console.error(
          "Не удалось создать уведомление о новом сообщении:",
          result.message
        );
      }
    }
  } catch (error) {
    console.error(
      "Ошибка создания уведомления о сообщении:",
      error
    );
  }

  revalidateChatPages(
    projectId
  );

  return {
    success: true,
    message:
      "Сообщение отправлено",
    messageId:
      createdMessage.id,
  };
}

function revalidateChatPages(
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

  if (
    normalized.length <=
    120
  ) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    117
  )}...`;
}