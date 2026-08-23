"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";
import { getAppBaseUrl, sendTransactionalEmail } from "@/lib/email/send-transactional-email";
import { createAdminAuditLog } from "@/features/admin/audit/server/create-admin-audit-log";
import { issueAccountEmailToken } from "@/features/auth/server/account-email-token";

const userIdSchema = z.string().uuid();
const editableRoleSchema = z.enum(["customer", "contractor"]);
const profileSchema = z.object({
  userId: userIdSchema,
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
});
const createSchema = z.object({
  email: z.string().trim().email().max(320),
  role: editableRoleSchema,
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).optional().or(z.literal("")),
});

type Result = { success: boolean; message: string };

async function requireAdmin() {
  const staff = await requireStaffUser();
  if (staff.profile.role !== "admin") return null;
  return staff;
}

export async function updateUserProfile(input: z.infer<typeof profileSchema>): Promise<Result> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  const admin = await requireAdmin();
  if (!admin) return { success: false, message: "Редактировать пользователей может только администратор" };

  const { userId, firstName, lastName, phone, city } = parsed.data;
  const updated = await db.query<{ id: string }>(`
    UPDATE public.profiles
    SET first_name=$2,last_name=$3,phone=$4,city=$5,updated_at=now()
    WHERE id=$1::uuid AND role::text IN ('customer','contractor')
    RETURNING id
  `, [userId, firstName, lastName || null, phone || null, city || null]);
  if (!updated.rows[0]) return { success: false, message: "Пользователь не найден или его роль нельзя редактировать" };

  await createAdminAuditLog({ adminId: admin.user.id, actionType: "user_profile_updated", entityType: "user", entityId: userId, description: "Администратор обновил профиль пользователя", metadata: { firstName, lastName: lastName || null, phone: phone || null, city: city || null } });
  revalidateUserPaths(userId);
  return { success: true, message: "Профиль пользователя обновлён" };
}

export async function sendTemporaryPassword(userId: string): Promise<Result> {
  if (!userIdSchema.safeParse(userId).success) return { success: false, message: "Некорректный пользователь" };
  const admin = await requireAdmin();
  if (!admin) return { success: false, message: "Сбрасывать пароль может только администратор" };
  if (admin.user.id === userId) return { success: false, message: "Для собственной учётной записи используйте обычную смену пароля" };

  const target = await db.query<{ id: string; email: string | null; role: string }>(`
    SELECT p.id,u.email,p.role::text AS role
    FROM public.profiles p JOIN public.users u ON u.id=p.id
    WHERE p.id=$1::uuid AND p.role::text IN ('customer','contractor') LIMIT 1
  `, [userId]);
  const row = target.rows[0];
  if (!row?.email) return { success: false, message: "У пользователя не указан email" };

  const temporaryPassword = createTemporaryPassword();
  const hash = await bcrypt.hash(temporaryPassword, 12);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE public.users SET password_hash=$2,must_change_password=true,is_active=true,updated_at=now() WHERE id=$1::uuid`, [userId, hash]);
    await client.query(`UPDATE public.auth_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1::uuid AND revoked_at IS NULL`, [userId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка сброса пароля администратором:", error);
    return { success: false, message: "Не удалось подготовить временный пароль" };
  } finally { client.release(); }

  const delivery = await sendTransactionalEmail({
    to: row.email,
    subject: "Временный пароль СтройВыбор",
    html: `<p>Администратор СтройВыбор выполнил сброс пароля вашей учётной записи.</p><p>Временный пароль: <strong>${escapeHtml(temporaryPassword)}</strong></p><p>После входа система потребует установить новый пароль. Не передавайте временный пароль другим лицам.</p><p><a href="${getAppBaseUrl()}/login">Войти в СтройВыбор</a></p>`,
  });
  if (!delivery.success) return { success: false, message: "Пароль сброшен, но письмо не удалось отправить. Повторите операцию после настройки почты." };

  await createAdminAuditLog({ adminId: admin.user.id, actionType: "user_password_reset", entityType: "user", entityId: userId, description: "Администратор выдал временный пароль", metadata: { target_email: row.email, target_role: row.role, sessions_revoked: true } });
  revalidateUserPaths(userId);
  return { success: true, message: "Временный пароль отправлен пользователю по электронной почте" };
}

export async function deactivateUser(userId: string): Promise<Result> {
  if (!userIdSchema.safeParse(userId).success) return { success: false, message: "Некорректный пользователь" };
  const admin = await requireAdmin();
  if (!admin) return { success: false, message: "Удалять пользователей может только администратор" };
  if (admin.user.id === userId) return { success: false, message: "Нельзя удалить собственную учётную запись" };

  const target = await db.query<{ role: string }>(`SELECT role::text AS role FROM public.profiles WHERE id=$1::uuid LIMIT 1`, [userId]);
  if (!target.rows[0] || !["customer", "contractor"].includes(target.rows[0].role)) return { success: false, message: "Пользователь не найден или не может быть удалён" };

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE public.users SET is_active=false,updated_at=now() WHERE id=$1::uuid`, [userId]);
    await client.query(`UPDATE public.profiles SET is_blocked=true,blocked_reason='Учётная запись удалена администратором',blocked_at=now(),blocked_by=$2::uuid,updated_at=now() WHERE id=$1::uuid`, [userId, admin.user.id]);
    await client.query(`UPDATE public.auth_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1::uuid AND revoked_at IS NULL`, [userId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка деактивации пользователя:", error);
    return { success: false, message: "Не удалось удалить учётную запись" };
  } finally { client.release(); }

  await createAdminAuditLog({ adminId: admin.user.id, actionType: "user_deactivated", entityType: "user", entityId: userId, description: "Учётная запись пользователя деактивирована администратором", metadata: { target_role: target.rows[0].role } });
  revalidateUserPaths(userId);
  return { success: true, message: "Учётная запись деактивирована. История проектов сохранена для аудита." };
}

export async function createManagedUser(input: z.infer<typeof createSchema>): Promise<Result> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  const admin = await requireAdmin();
  if (!admin) return { success: false, message: "Создавать пользователей может только администратор" };

  const email = parsed.data.email.toLowerCase();
  const exists = await db.query<{ id: string }>(`SELECT id FROM public.users WHERE lower(email)=$1 LIMIT 1`, [email]);
  if (exists.rows[0]) return { success: false, message: "Пользователь с таким email уже существует" };

  const temporaryPassword = createTemporaryPassword();
  const hash = await bcrypt.hash(temporaryPassword, 12);
  const client = await db.connect();
  let userId = "";
  let verifyToken = "";
  try {
    await client.query("BEGIN");
    const created = await client.query<{ id: string }>(`
      INSERT INTO public.users(id,email,password_hash,email_confirmed_at,raw_user_meta_data,is_active,must_change_password)
      VALUES(gen_random_uuid(),$1,$2,NULL,$3::jsonb,true,true) RETURNING id
    `, [email, hash, JSON.stringify({ role: parsed.data.role, first_name: parsed.data.firstName, last_name: parsed.data.lastName || null, created_by_admin: admin.user.id })]);
    userId = created.rows[0]?.id ?? "";
    if (!userId) throw new Error("Пользователь не создан");
    await client.query(`INSERT INTO public.profiles(id,role,first_name,last_name,email,is_blocked) VALUES($1::uuid,$2,$3,$4,$5,false)`, [userId, parsed.data.role, parsed.data.firstName, parsed.data.lastName || null, email]);
    verifyToken = await issueAccountEmailToken(userId, "verify_email", 60 * 24, client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка создания пользователя администратором:", error);
    return { success: false, message: "Не удалось создать пользователя" };
  } finally { client.release(); }

  const verificationUrl = `${getAppBaseUrl()}/verify-email?token=${encodeURIComponent(verifyToken)}`;
  await sendTransactionalEmail({
    to: email,
    subject: "Учётная запись СтройВыбор создана",
    html: `<p>Администратор создал для вас учётную запись СтройВыбор.</p><p>Временный пароль: <strong>${escapeHtml(temporaryPassword)}</strong></p><p><a href="${verificationUrl}">Подтвердите электронную почту</a>, затем войдите в сервис. После входа потребуется установить новый пароль.</p>`,
  });
  await createAdminAuditLog({ adminId: admin.user.id, actionType: "user_created", entityType: "user", entityId: userId, description: "Администратор создал пользователя", metadata: { email, role: parsed.data.role } });
  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");
  return { success: true, message: "Пользователь создан. Временный пароль и ссылка подтверждения отправлены по email." };
}

function createTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.randomBytes(16);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char); }
function revalidateUserPaths(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/contractor/dashboard");
  revalidatePath("/customer/dashboard");
}
