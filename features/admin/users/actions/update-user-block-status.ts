"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { createClient } from
  "@/lib/supabase/server";

import { createNotification } from
  "@/features/notifications/server/create-notification";

  import { createAdminAuditLog } from
  "@/features/admin/audit/server/create-admin-audit-log";
const STAFF_ROLES = [
  "admin",
  "moderator",
  "manager",
];

const schema = z.object({
  userId: z
    .string()
    .uuid(
      "Некорректный идентификатор пользователя"
    ),

  action: z.enum([
    "block",
    "unblock",
  ]),

  reason: z
    .string()
    .trim()
    .max(
      2000,
      "Причина слишком длинная"
    )
    .optional()
    .or(z.literal("")),
});

export type UpdateUserBlockStatusInput =
  z.infer<typeof schema>;

export type UpdateUserBlockStatusResult = {
  success: boolean;
  message: string;
};

export async function updateUserBlockStatus(
  input: UpdateUserBlockStatusInput
): Promise<UpdateUserBlockStatusResult> {
  const parsed =
    schema.safeParse(input);

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
    userId,
    action,
  } = parsed.data;

  const reason =
    parsed.data.reason
      ?.trim() ?? "";

  /*
   * Для блокировки причина
   * обязательна.
   */
  if (
    action === "block" &&
    reason.length < 3
  ) {
    return {
      success: false,
      message:
        "Укажите причину блокировки",
    };
  }

  const supabase =
    await createClient();

  /*
   * Текущий пользователь.
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
   * Нельзя заблокировать себя.
   */
  if (
    user.id === userId
  ) {
    return {
      success: false,
      message:
        "Нельзя изменить статус собственной учётной записи",
    };
  }

  /*
   * Проверяем права администратора.
   */
  const {
    data: adminProfile,
    error: adminError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      is_blocked
    `)
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (
    adminError ||
    !adminProfile ||
    adminProfile.is_blocked ||
    !STAFF_ROLES.includes(
      adminProfile.role
    )
  ) {
    return {
      success: false,
      message:
        "Недостаточно прав",
    };
  }

  /*
   * Пользователь,
   * над которым выполняется действие.
   */
  const {
    data: targetProfile,
    error: targetError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      first_name,
      last_name,
      email,
      is_blocked
    `)
    .eq(
      "id",
      userId
    )
    .maybeSingle();

  if (
    targetError ||
    !targetProfile
  ) {
    return {
      success: false,
      message:
        "Пользователь не найден",
    };
  }

  /*
   * manager/moderator не должны
   * управлять staff-аккаунтами.
   *
   * Staff может менять только admin.
   */
  if (
    STAFF_ROLES.includes(
      targetProfile.role
    ) &&
    adminProfile.role !==
      "admin"
  ) {
    return {
      success: false,

      message:
        "Изменять статус сотрудников может только администратор",
    };
  }

  const shouldBlock =
    action === "block";

  if (
    targetProfile.is_blocked ===
    shouldBlock
  ) {
    return {
      success: false,

      message:
        shouldBlock
          ? "Пользователь уже заблокирован"
          : "Пользователь уже активен",
    };
  }

  const now =
    new Date().toISOString();

  /*
   * Меняем статус.
   */
  const {
  data: updatedProfile,
  error: updateError,
} = await supabase
  .from("profiles")
  .update({
    is_blocked:
      shouldBlock,

    blocked_reason:
      shouldBlock
        ? reason
        : null,

    blocked_at:
      shouldBlock
        ? now
        : null,

    blocked_by:
      shouldBlock
        ? user.id
        : null,

    updated_at:
      now,
  })
  .eq(
    "id",
    userId
  )
  .eq(
    "is_blocked",
    targetProfile.is_blocked
  )
  .select(`
    id,
    role,
    first_name,
    last_name,
    email,
    is_blocked,
    blocked_reason,
    blocked_at,
    blocked_by
  `)
  .maybeSingle();

if (updateError) {
  console.error(
    "Ошибка изменения статуса пользователя:",
    {
      message:
        updateError.message,

      details:
        updateError.details,

      hint:
        updateError.hint,

      code:
        updateError.code,

      targetUserId:
        userId,

      adminUserId:
        user.id,
    }
  );

  return {
    success: false,
    message:
      updateError.message ||
      "Не удалось изменить статус пользователя",
  };
}

if (!updatedProfile) {
  console.error(
    "Статус пользователя не изменён: UPDATE не затронул ни одной строки",
    {
      targetUserId:
        userId,

      adminUserId:
        user.id,

      expectedPreviousStatus:
        targetProfile.is_blocked,

      requestedStatus:
        shouldBlock,
    }
  );

  return {
    success: false,
    message:
      "Не удалось изменить статус пользователя",
  };
}
const auditResult =
  await createAdminAuditLog({
    adminId:
      user.id,

    actionType:
      shouldBlock
        ? "user_blocked"
        : "user_unblocked",

    entityType:
      "user",

    entityId:
      targetProfile.id,

    description:
      shouldBlock
        ? `Пользователь заблокирован. Причина: ${reason}`
        : "Пользователь разблокирован",

    metadata: {
      target_role:
        targetProfile.role,

      target_email:
        targetProfile.email,

      previous_is_blocked:
        targetProfile.is_blocked,

      new_is_blocked:
        shouldBlock,

      reason:
        shouldBlock
          ? reason
          : null,
    },
  });

if (!auditResult.success) {
  console.error(
    "Не удалось записать действие администратора в журнал:",
    auditResult.message
  );
}
if (!updatedProfile) {
  console.error(
    "Статус пользователя не изменён: UPDATE не затронул ни одной строки",
    {
      targetUserId:
        userId,

      adminUserId:
        user.id,

      expectedPreviousStatus:
        targetProfile.is_blocked,

      requestedStatus:
        shouldBlock,
    }
  );

  return {
    success: false,
    message:
      "Не удалось изменить статус пользователя. Проверьте права администратора.",
  };
}
  /*
   * Уведомление пользователю.
   *
   * Ошибка уведомления
   * не откатывает блокировку.
   */
  try {
    const notificationResult =
      await createNotification({
        userId:
          targetProfile.id,

        actorId:
          user.id,

        notificationType:
          shouldBlock
            ? "account_blocked"
            : "account_unblocked",

        title:
          shouldBlock
            ? "Учётная запись ограничена"
            : "Учётная запись восстановлена",

        body:
          shouldBlock
            ? `Администрация ограничила доступ к вашей учётной записи. Причина: ${getPreview(
                reason
              )}`
            : "Администрация восстановила доступ к вашей учётной записи.",

        url:
          "/dashboard",

        metadata: {
          action:
            shouldBlock
              ? "block"
              : "unblock",

          reason:
            shouldBlock
              ? reason
              : null,

          admin_id:
            user.id,

          changed_at:
            now,
        },

        deduplicationKey:
          `user-status:${targetProfile.id}:${shouldBlock ? "blocked" : "active"}:${now}`,
      });

    if (
      !notificationResult.success
    ) {
      console.error(
        "Не удалось отправить уведомление пользователю:",
        notificationResult.message
      );
    }
  } catch (
    notificationError
  ) {
    console.error(
      "Ошибка отправки уведомления пользователю:",
      notificationError
    );
  }

  /*
   * Обновляем административные страницы.
   */
  revalidatePath(
    "/admin/users"
  );

  revalidatePath(
    `/admin/users/${userId}`
  );

  revalidatePath(
    "/admin/dashboard"
  );

  /*
   * Если это подрядчик,
   * обновляем и его кабинет.
   */
  if (
    targetProfile.role ===
    "contractor"
  ) {
    revalidatePath(
      "/contractor/dashboard"
    );

    revalidatePath(
      "/contractor/company"
    );

    revalidatePath(
      "/contractor",
      "layout"
    );
  }

  if (
    targetProfile.role ===
    "customer"
  ) {
    revalidatePath(
      "/customer/dashboard"
    );

    revalidatePath(
      "/customer",
      "layout"
    );
  }

  return {
    success: true,

    message:
      shouldBlock
        ? "Пользователь заблокирован"
        : "Пользователь восстановлен",
  };
}

function getPreview(
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
    300
  ) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    297
  )}...`;
}