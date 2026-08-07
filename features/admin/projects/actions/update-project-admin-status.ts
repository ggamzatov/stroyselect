"use server";

import {
  revalidatePath,
} from "next/cache";

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
  projectId: z
    .string()
    .uuid(),

  action: z.enum([
    "block",
    "unblock",
  ]),

  reason: z
    .string()
    .trim()
    .max(3000)
    .optional()
    .or(z.literal("")),
});

type Input =
  z.infer<typeof schema>;

export type UpdateProjectAdminStatusResult = {
  success: boolean;
  message: string;
};

export async function updateProjectAdminStatus(
  input: Input
): Promise<UpdateProjectAdminStatusResult> {
  const parsed =
    schema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]
          ?.message ??
        "Некорректные данные",
    };
  }

  const {
    projectId,
    action,
  } =
    parsed.data;

  const reason =
    parsed.data.reason
      ?.trim() ??
    "";

  if (
    action === "block" &&
    reason.length < 3
  ) {
    return {
      success: false,
      message:
        "Укажите причину блокировки проекта",
    };
  }

  const supabase =
    await createClient();

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
        "Необходимо войти",
    };
  }

  const {
    data: staff,
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
    !staff ||
    staff.is_blocked ||
    !STAFF_ROLES.includes(
      staff.role
    )
  ) {
    return {
      success: false,
      message:
        "Недостаточно прав",
    };
  }

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
      status,
      is_admin_blocked,
      admin_block_reason
    `)
    .eq(
      "id",
      projectId
    )
    .maybeSingle();

  if (
    projectError ||
    !project
  ) {
    return {
      success: false,
      message:
        "Проект не найден",
    };
  }

  const shouldBlock =
    action === "block";

  if (
    project.is_admin_blocked ===
    shouldBlock
  ) {
    return {
      success: false,
      message:
        shouldBlock
          ? "Проект уже заблокирован"
          : "Проект уже активен",
    };
  }

  const now =
    new Date().toISOString();

  const {
    data: updatedProject,
    error: updateError,
  } = await supabase
    .from("projects")
    .update({
      is_admin_blocked:
        shouldBlock,

      admin_block_reason:
        shouldBlock
          ? reason
          : null,

      admin_blocked_at:
        shouldBlock
          ? now
          : null,

      admin_blocked_by:
        shouldBlock
          ? user.id
          : null,

      updated_at:
        now,
    })
    .eq(
      "id",
      projectId
    )
    .eq(
      "is_admin_blocked",
      project.is_admin_blocked
    )
    .select(`
      id,
      title,
      customer_id,
      selected_contractor_id,
      status,
      is_admin_blocked
    `)
    .maybeSingle();

  if (
    updateError ||
    !updatedProject
  ) {
    console.error(
      "Ошибка административной блокировки проекта:",
      updateError
    );

    return {
      success: false,
      message:
        "Не удалось изменить состояние проекта",
    };
  }

  await createAdminAuditLog({
    adminId:
      user.id,

    actionType:
      shouldBlock
        ? "project_blocked"
        : "project_unblocked",

    entityType:
      "project",

    entityId:
      project.id,

    description:
      shouldBlock
        ? `Проект «${project.title}» заблокирован администрацией`
        : `Проект «${project.title}» восстановлен администрацией`,

    metadata: {
      previous_admin_blocked:
        project.is_admin_blocked,

      new_admin_blocked:
        shouldBlock,

      reason:
        shouldBlock
          ? reason
          : null,

      project_status:
        project.status,
    },
  });

  /*
   * Уведомляем заказчика.
   */
  try {
    await createNotification({
      userId:
        project.customer_id,

      actorId:
        user.id,

      notificationType:
        shouldBlock
          ? "project_admin_blocked"
          : "project_admin_unblocked",

      title:
        shouldBlock
          ? "Проект ограничен администрацией"
          : "Проект восстановлен",

      body:
        shouldBlock
          ? `Доступ к проекту «${project.title}» ограничен. Причина: ${reason}`
          : `Проект «${project.title}» снова доступен.`,

      projectId:
        project.id,

      url:
        `/customer/projects/${project.id}`,

      metadata: {
        reason:
          shouldBlock
            ? reason
            : null,
      },
    });
  } catch (
    notificationError
  ) {
    console.error(
      "Ошибка уведомления заказчика:",
      notificationError
    );
  }

  /*
   * Если есть подрядчик —
   * уведомляем владельца компании.
   */
  if (
    project.selected_contractor_id
  ) {
    try {
      const {
        data: company,
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

      if (
        company?.owner_id
      ) {
        await createNotification({
          userId:
            company.owner_id,

          actorId:
            user.id,

          notificationType:
            shouldBlock
              ? "project_admin_blocked"
              : "project_admin_unblocked",

          title:
            shouldBlock
              ? "Проект ограничен администрацией"
              : "Проект восстановлен",

          body:
            shouldBlock
              ? `Доступ к проекту «${project.title}» ограничен администрацией.`
              : `Проект «${project.title}» снова доступен.`,

          projectId:
            project.id,

          url:
            `/contractor/work/${project.id}`,

          metadata: {
            reason:
              shouldBlock
                ? reason
                : null,
          },
        });
      }
    } catch (
      notificationError
    ) {
      console.error(
        "Ошибка уведомления подрядчика:",
        notificationError
      );
    }
  }

  revalidateProjectPages(
    projectId
  );

  return {
    success: true,

    message:
      shouldBlock
        ? "Проект заблокирован"
        : "Проект восстановлен",
  };
}

function revalidateProjectPages(
  projectId: string
) {
  revalidatePath(
    "/admin/projects"
  );

  revalidatePath(
    `/admin/projects/${projectId}`
  );

  revalidatePath(
    "/admin/dashboard"
  );

  revalidatePath(
    "/customer/projects"
  );

  revalidatePath(
    `/customer/projects/${projectId}`
  );

  revalidatePath(
    `/customer/work/${projectId}`
  );

  revalidatePath(
    `/contractor/work/${projectId}`
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