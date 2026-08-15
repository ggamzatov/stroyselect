"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { createNotification } from "@/features/notifications/server/create-notification";
import { createAdminAuditLog } from "@/features/admin/audit/server/create-admin-audit-log";

const STAFF_ROLES = ["admin", "moderator", "manager"];

const schema = z.object({
  userId: z.string().uuid("Некорректный идентификатор пользователя"),
  action: z.enum(["block", "unblock"]),
  reason: z.string().trim().max(2000, "Причина слишком длинная").optional().or(z.literal("")),
});

export type UpdateUserBlockStatusInput = z.infer<typeof schema>;
export type UpdateUserBlockStatusResult = { success: boolean; message: string };

type TargetProfileRow = {
  id: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_blocked: boolean;
};

export async function updateUserBlockStatus(
  input: UpdateUserBlockStatusInput
): Promise<UpdateUserBlockStatusResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  const activeUser = await requireActiveUser();
  if (!activeUser.success) return { success: false, message: activeUser.message };

  if (!STAFF_ROLES.includes(activeUser.profile.role)) {
    return { success: false, message: "Недостаточно прав" };
  }

  const { userId, action } = parsed.data;
  const reason = parsed.data.reason?.trim() ?? "";
  const shouldBlock = action === "block";

  if (activeUser.user.id === userId) {
    return { success: false, message: "Нельзя изменить статус собственной учётной записи" };
  }

  if (shouldBlock && reason.length < 3) {
    return { success: false, message: "Укажите причину блокировки" };
  }

  const client = await db.connect();
  let targetProfile: TargetProfileRow | undefined;
  const now = new Date().toISOString();

  try {
    await client.query("BEGIN");

    const targetResult = await client.query<TargetProfileRow>(
      `
        SELECT
          id,
          role::text AS role,
          first_name,
          last_name,
          email,
          is_blocked
        FROM public.profiles
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [userId]
    );

    targetProfile = targetResult.rows[0];
    if (!targetProfile) {
      await client.query("ROLLBACK");
      return { success: false, message: "Пользователь не найден" };
    }

    if (STAFF_ROLES.includes(targetProfile.role) && activeUser.profile.role !== "admin") {
      await client.query("ROLLBACK");
      return { success: false, message: "Изменять статус сотрудников может только администратор" };
    }

    if (targetProfile.is_blocked === shouldBlock) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: shouldBlock ? "Пользователь уже заблокирован" : "Пользователь уже активен",
      };
    }

    const updateResult = await client.query<{ id: string }>(
      `
        UPDATE public.profiles
        SET
          is_blocked = $1,
          blocked_reason = $2,
          blocked_at = $3,
          blocked_by = $4,
          updated_at = now()
        WHERE id = $5
          AND is_blocked = $6
        RETURNING id
      `,
      [
        shouldBlock,
        shouldBlock ? reason : null,
        shouldBlock ? now : null,
        shouldBlock ? activeUser.user.id : null,
        userId,
        targetProfile.is_blocked,
      ]
    );

    if (!updateResult.rows[0]) throw new Error("Статус пользователя уже изменился");

    await client.query(
      `
        UPDATE public.users
        SET is_active = $1, updated_at = now()
        WHERE id = $2
      `,
      [!shouldBlock, userId]
    );

    if (shouldBlock) {
      await client.query(
        `
          UPDATE public.auth_sessions
          SET revoked_at = COALESCE(revoked_at, now())
          WHERE user_id = $1 AND revoked_at IS NULL
        `,
        [userId]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка изменения статуса пользователя:", error);
    return { success: false, message: "Не удалось изменить статус пользователя" };
  } finally {
    client.release();
  }

  if (!targetProfile) return { success: false, message: "Пользователь не найден" };

  const auditResult = await createAdminAuditLog({
    adminId: activeUser.user.id,
    actionType: shouldBlock ? "user_blocked" : "user_unblocked",
    entityType: "user",
    entityId: targetProfile.id,
    description: shouldBlock ? `Пользователь заблокирован. Причина: ${reason}` : "Пользователь разблокирован",
    metadata: {
      target_role: targetProfile.role,
      target_email: targetProfile.email,
      previous_is_blocked: targetProfile.is_blocked,
      new_is_blocked: shouldBlock,
      reason: shouldBlock ? reason : null,
    },
  });

  if (!auditResult.success) {
    console.error("Не удалось записать действие администратора в журнал:", auditResult.message);
  }

  try {
    const notificationResult = await createNotification({
      userId: targetProfile.id,
      actorId: activeUser.user.id,
      notificationType: shouldBlock ? "account_blocked" : "account_unblocked",
      title: shouldBlock ? "Учётная запись ограничена" : "Учётная запись восстановлена",
      body: shouldBlock
        ? `Администрация ограничила доступ к вашей учётной записи. Причина: ${getPreview(reason)}`
        : "Администрация восстановила доступ к вашей учётной записи.",
      url: "/dashboard",
      metadata: {
        action: shouldBlock ? "block" : "unblock",
        reason: shouldBlock ? reason : null,
        admin_id: activeUser.user.id,
        changed_at: now,
      },
      deduplicationKey: `user-status:${targetProfile.id}:${shouldBlock ? "blocked" : "active"}:${now}`,
    });
    if (!notificationResult.success) {
      console.error("Не удалось отправить уведомление пользователю:", notificationResult.message);
    }
  } catch (error) {
    console.error("Ошибка отправки уведомления пользователю:", error);
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/dashboard");

  if (targetProfile.role === "contractor") {
    revalidatePath("/contractor/dashboard");
    revalidatePath("/contractor/company");
    revalidatePath("/contractor", "layout");
  }

  if (targetProfile.role === "customer") {
    revalidatePath("/customer/dashboard");
    revalidatePath("/customer", "layout");
  }

  return { success: true, message: shouldBlock ? "Пользователь заблокирован" : "Пользователь восстановлен" };
}

function getPreview(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length <= 300 ? normalized : `${normalized.slice(0, 297)}...`;
}
