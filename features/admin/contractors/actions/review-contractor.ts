"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import {
  verificationDecisionSchema,
  type VerificationDecisionInput,
} from
  "@/features/admin/contractors/schemas/verification-decision-schema";

import { createNotification } from
  "@/features/notifications/server/create-notification";

export type ReviewContractorResult = {
  success: boolean;
  message: string;
};

const STAFF_ROLES = [
  "admin",
  "moderator",
  "manager",
];

type ContractorStatus =
  | "draft"
  | "pending"
  | "verified"
  | "rejected"
  | "suspended";

type ContractorDecision =
  | "approve"
  | "reject"
  | "suspend"
  | "resume"
  | "return_to_draft";

const ALLOWED_TRANSITIONS: Record<
  ContractorStatus,
  ContractorStatus[]
> = {
  draft: [
    "pending",
  ],

  pending: [
    "verified",
    "rejected",
  ],

  verified: [
    "suspended",
  ],

  rejected: [
    "draft",
  ],

  suspended: [
    "verified",
    "draft",
  ],
};

export async function reviewContractor(
  input: VerificationDecisionInput
): Promise<ReviewContractorResult> {
  /*
   * 1. Валидация.
   */
  const parsed =
    verificationDecisionSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,

      message:
        parsed.error.issues[0]
          ?.message ??
        "Проверьте данные решения",
    };
  }

  const supabase =
    await createClient();

  /*
   * 2. Авторизация.
   */
  const {
    data: {
      user,
    },
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
        "Необходимо войти в систему",
    };
  }

  /*
   * 3. Проверяем права администратора.
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
        "Недостаточно прав для проверки подрядчиков",
    };
  }

  const {
    contractorId,
    decision,
  } =
    parsed.data;

  const comment =
    parsed.data.comment
      ?.trim() ??
    "";

  /*
   * 4. Получаем компанию.
   *
   * owner_id понадобится
   * для уведомления подрядчика.
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
      owner_id,
      public_name,
      verification_status,
      verification_comment
    `)
    .eq(
      "id",
      contractorId
    )
    .maybeSingle();

  if (
    companyError ||
    !company
  ) {
    console.error(
      "Ошибка загрузки подрядчика:",
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
        "Подрядчик не найден",
    };
  }

  const previousStatus =
    company.verification_status as
      ContractorStatus;

  /*
   * 5. Определяем новый статус.
   */
  const newStatus =
    getNewStatus(
      decision
    );

  if (
    previousStatus ===
    newStatus
  ) {
    return {
      success: false,

      message:
        "У подрядчика уже установлен этот статус",
    };
  }

  /*
   * 6. Проверяем допустимость
   * перехода.
   */
  const allowedNextStatuses =
    ALLOWED_TRANSITIONS[
      previousStatus
    ] ??
    [];

  if (
    !allowedNextStatuses.includes(
      newStatus
    )
  ) {
    return {
      success: false,

      message:
        getInvalidTransitionMessage(
          previousStatus,
          newStatus
        ),
    };
  }

  /*
   * 7. Повторная серверная
   * проверка комментария.
   *
   * На клиентскую валидацию
   * полагаться нельзя.
   */
  if (
    requiresComment(
      decision
    ) &&
    comment.length < 3
  ) {
    return {
      success: false,

      message:
        "Укажите причину решения",
    };
  }

  const now =
    new Date().toISOString();

  /*
   * Для verified комментарий
   * очищаем.
   *
   * Для остальных статусов
   * сохраняем решение администратора.
   */
  const verificationComment =
    newStatus ===
    "verified"
      ? null
      : comment ||
        null;

  /*
   * 8. Обновляем компанию.
   */
  const {
    data: updatedCompany,
    error: updateError,
  } = await supabase
    .from(
      "contractor_companies"
    )
    .update({
      verification_status:
        newStatus,

      verification_comment:
        verificationComment,

      updated_at:
        now,
    })
    .eq(
      "id",
      contractorId
    )
    .eq(
      "verification_status",
      previousStatus
    )
    .select(`
      id,
      owner_id,
      public_name,
      verification_status
    `)
    .maybeSingle();

  if (
    updateError ||
    !updatedCompany
  ) {
    console.error(
      "Ошибка изменения статуса подрядчика:",
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
        "Не удалось изменить статус подрядчика. Возможно, статус уже был изменён другим администратором.",
    };
  }

  /*
   * 9. Журнал модерации.
   */
  const {
    error: logError,
  } = await supabase
    .from(
      "contractor_verification_logs"
    )
    .insert({
      contractor_id:
        contractorId,

      admin_id:
        user.id,

      previous_status:
        previousStatus,

      new_status:
        newStatus,

      comment:
        comment ||
        null,
    });

  if (logError) {
    console.error(
      "Ошибка записи журнала проверки подрядчика:",
      {
        message:
          logError.message,

        details:
          logError.details,

        hint:
          logError.hint,

        code:
          logError.code,
      }
    );

    /*
     * Статус уже изменён,
     * поэтому действие не откатываем.
     *
     * Позже вынесем изменение статуса
     * и аудит в PostgreSQL transaction/RPC.
     */
  }

  /*
   * 10. Уведомляем подрядчика.
   *
   * Ошибка уведомления не должна
   * отменять решение администратора.
   */
  try {
    if (
      updatedCompany.owner_id
    ) {
      const notification =
        getVerificationNotification({
          companyName:
            updatedCompany.public_name,

          newStatus,

          comment,
        });

      const notificationResult =
        await createNotification({
          userId:
            updatedCompany.owner_id,

          actorId:
            user.id,

          notificationType:
            notification.type,

          title:
            notification.title,

          body:
            notification.body,

          url:
            "/contractor/company",

          metadata: {
            contractor_id:
              contractorId,

            company_name:
              updatedCompany.public_name,

            previous_status:
              previousStatus,

            new_status:
              newStatus,

            admin_comment:
              comment ||
              null,

            decided_at:
              now,
          },
        });

      if (
        !notificationResult.success
      ) {
        console.error(
          "Не удалось отправить уведомление подрядчику:",
          notificationResult.message
        );
      }
    }
  } catch (
    notificationError
  ) {
    console.error(
      "Ошибка уведомления подрядчика о решении администрации:",
      notificationError
    );
  }

  /*
   * 11. Обновляем страницы.
   */
  revalidateContractorPages(
    contractorId
  );

  return {
    success: true,

    message:
      getSuccessMessage(
        newStatus
      ),
  };
}

function getNewStatus(
  decision:
    ContractorDecision
): ContractorStatus {
  switch (decision) {
    case "approve":
      return "verified";

    case "reject":
      return "rejected";

    case "suspend":
      return "suspended";

    case "resume":
      return "verified";

    case "return_to_draft":
      return "draft";
  }
}

function requiresComment(
  decision:
    ContractorDecision
) {
  return [
    "reject",
    "suspend",
    "return_to_draft",
  ].includes(
    decision
  );
}

function getInvalidTransitionMessage(
  from:
    ContractorStatus,

  to:
    ContractorStatus
) {
  if (
    from === "pending" &&
    ![
      "verified",
      "rejected",
    ].includes(to)
  ) {
    return "Профиль на проверке можно только подтвердить или отклонить";
  }

  if (
    from ===
      "verified" &&
    to !==
      "suspended"
  ) {
    return "Подтверждённого подрядчика можно только приостановить";
  }

  if (
    from ===
      "rejected" &&
    to !==
      "draft"
  ) {
    return "Отклонённый профиль можно вернуть только на редактирование";
  }

  if (
    from ===
    "suspended"
  ) {
    return "Приостановленного подрядчика можно восстановить или вернуть на редактирование";
  }

  return `Недопустимый переход статуса: ${from} → ${to}`;
}

function getVerificationNotification({
  companyName,
  newStatus,
  comment,
}: {
  companyName: string;

  newStatus:
    ContractorStatus;

  comment:
    string;
}) {
  switch (newStatus) {
    case "verified":
      return {
        type:
          "company_verified",

        title:
          "Профиль подрядчика подтверждён",

        body:
          `Компания «${companyName}» прошла проверку. Теперь вы можете получать проекты и отправлять предложения.`,
      };

    case "rejected":
      return {
        type:
          "company_rejected",

        title:
          "Профиль подрядчика отклонён",

        body:
          comment
            ? `Компания «${companyName}» не прошла проверку. Комментарий администратора: ${getNotificationPreview(
                comment
              )}`
            : `Компания «${companyName}» не прошла проверку.`,
      };

    case "suspended":
      return {
        type:
          "company_suspended",

        title:
          "Работа подрядчика приостановлена",

        body:
          comment
            ? `Доступ компании «${companyName}» временно приостановлен. Причина: ${getNotificationPreview(
                comment
              )}`
            : `Доступ компании «${companyName}» временно приостановлен.`,
      };

    case "draft":
      return {
        type:
          "company_returned_to_draft",

        title:
          "Профиль возвращён на редактирование",

        body:
          comment
            ? `Профиль компании «${companyName}» необходимо доработать. Комментарий: ${getNotificationPreview(
                comment
              )}`
            : `Профиль компании «${companyName}» возвращён на редактирование.`,
      };

    default:
      return {
        type:
          "company_status_changed",

        title:
          "Статус профиля изменён",

        body:
          `Статус компании «${companyName}» изменён.`,
      };
  }
}

function getNotificationPreview(
  value:
    string
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
    240
  ) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    237
  )}...`;
}

function getSuccessMessage(
  status:
    ContractorStatus
) {
  switch (status) {
    case "verified":
      return "Подрядчик подтверждён";

    case "rejected":
      return "Профиль подрядчика отклонён";

    case "suspended":
      return "Профиль подрядчика приостановлен";

    case "draft":
      return "Профиль возвращён на редактирование";

    case "pending":
      return "Профиль отправлен на проверку";
  }
}

function revalidateContractorPages(
  contractorId:
    string
) {
  revalidatePath(
    "/admin/dashboard"
  );

  revalidatePath(
    "/admin/contractors"
  );

  revalidatePath(
    `/admin/contractors/${contractorId}`
  );

  revalidatePath(
    "/contractor/dashboard"
  );

  revalidatePath(
    "/contractor/company"
  );

  /*
   * Обновляем колокольчик
   * подрядчика.
   */
  revalidatePath(
    "/contractor",
    "layout"
  );
}