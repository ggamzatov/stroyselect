"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { createNotification } from "@/features/notifications/server/create-notification";
import { createAdminAuditLog } from "@/features/admin/audit/server/create-admin-audit-log";

const STAFF_ROLES = ["admin", "moderator", "manager"];

const schema = z.object({
  projectId: z.string().uuid(),
  action: z.enum(["block", "unblock"]),
  reason: z.string().trim().max(3000).optional().or(z.literal("")),
});

type Input = z.infer<typeof schema>;

export type UpdateProjectAdminStatusResult = {
  success: boolean;
  message: string;
};

type ProjectRow = {
  id: string;
  title: string;
  customer_id: string;
  selected_contractor_id: string | null;
  status: string;
  is_admin_blocked: boolean;
  admin_block_reason: string | null;
};

export async function updateProjectAdminStatus(
  input: Input
): Promise<UpdateProjectAdminStatusResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  const activeUser = await requireActiveUser();
  if (!activeUser.success) return { success: false, message: activeUser.message };
  if (!STAFF_ROLES.includes(activeUser.profile.role)) {
    return { success: false, message: "Недостаточно прав" };
  }

  const { projectId, action } = parsed.data;
  const reason = parsed.data.reason?.trim() ?? "";
  const shouldBlock = action === "block";

  if (shouldBlock && reason.length < 3) {
    return { success: false, message: "Укажите причину блокировки проекта" };
  }

  const client = await db.connect();
  let project: ProjectRow | undefined;

  try {
    await client.query("BEGIN");

    const projectResult = await client.query<ProjectRow>(
      `
        SELECT
          id, title, customer_id, selected_contractor_id,
          status::text AS status, is_admin_blocked, admin_block_reason
        FROM public.projects
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [projectId]
    );

    project = projectResult.rows[0];
    if (!project) {
      await client.query("ROLLBACK");
      return { success: false, message: "Проект не найден" };
    }

    if (project.is_admin_blocked === shouldBlock) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: shouldBlock ? "Проект уже заблокирован" : "Проект уже активен",
      };
    }

    const updateResult = await client.query<{ id: string }>(
      `
        UPDATE public.projects
        SET
          is_admin_blocked = $1,
          admin_block_reason = $2,
          admin_blocked_at = $3,
          admin_blocked_by = $4,
          updated_at = now()
        WHERE id = $5
          AND is_admin_blocked = $6
        RETURNING id
      `,
      [
        shouldBlock,
        shouldBlock ? reason : null,
        shouldBlock ? new Date().toISOString() : null,
        shouldBlock ? activeUser.user.id : null,
        projectId,
        project.is_admin_blocked,
      ]
    );

    if (!updateResult.rows[0]) {
      throw new Error("Состояние проекта уже изменилось");
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка административной блокировки проекта:", error);
    return { success: false, message: "Не удалось изменить состояние проекта" };
  } finally {
    client.release();
  }

  if (!project) return { success: false, message: "Проект не найден" };

  await createAdminAuditLog({
    adminId: activeUser.user.id,
    actionType: shouldBlock ? "project_blocked" : "project_unblocked",
    entityType: "project",
    entityId: project.id,
    description: shouldBlock
      ? `Проект «${project.title}» заблокирован администрацией`
      : `Проект «${project.title}» восстановлен администрацией`,
    metadata: {
      previous_admin_blocked: project.is_admin_blocked,
      new_admin_blocked: shouldBlock,
      reason: shouldBlock ? reason : null,
      project_status: project.status,
    },
  });

  try {
    await createNotification({
      userId: project.customer_id,
      actorId: activeUser.user.id,
      notificationType: shouldBlock ? "project_admin_blocked" : "project_admin_unblocked",
      title: shouldBlock ? "Проект ограничен администрацией" : "Проект восстановлен",
      body: shouldBlock
        ? `Доступ к проекту «${project.title}» ограничен. Причина: ${reason}`
        : `Проект «${project.title}» снова доступен.`,
      projectId: project.id,
      url: `/customer/projects/${project.id}`,
      metadata: { reason: shouldBlock ? reason : null },
    });
  } catch (error) {
    console.error("Ошибка уведомления заказчика:", error);
  }

  if (project.selected_contractor_id) {
    try {
      const companyResult = await db.query<{ owner_id: string }>(
        `SELECT owner_id FROM public.contractor_companies WHERE id = $1 LIMIT 1`,
        [project.selected_contractor_id]
      );
      const ownerId = companyResult.rows[0]?.owner_id;
      if (ownerId) {
        await createNotification({
          userId: ownerId,
          actorId: activeUser.user.id,
          notificationType: shouldBlock ? "project_admin_blocked" : "project_admin_unblocked",
          title: shouldBlock ? "Проект ограничен администрацией" : "Проект восстановлен",
          body: shouldBlock
            ? `Доступ к проекту «${project.title}» ограничен администрацией.`
            : `Проект «${project.title}» снова доступен.`,
          projectId: project.id,
          url: `/contractor/work/${project.id}`,
          metadata: { reason: shouldBlock ? reason : null },
        });
      }
    } catch (error) {
      console.error("Ошибка уведомления подрядчика:", error);
    }
  }

  revalidateProjectPages(projectId);
  return { success: true, message: shouldBlock ? "Проект заблокирован" : "Проект восстановлен" };
}

function revalidateProjectPages(projectId: string) {
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/customer/projects");
  revalidatePath(`/customer/projects/${projectId}`);
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
  revalidatePath("/customer", "layout");
  revalidatePath("/contractor", "layout");
}
