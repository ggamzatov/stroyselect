"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

const schema = z.object({
  password: z.string().min(10, "Пароль должен содержать не менее 10 символов").max(128),
  confirmPassword: z.string().min(1),
}).refine((value) => value.password === value.confirmPassword, { message: "Пароли не совпадают", path: ["confirmPassword"] });

export type ChangePasswordState = { success: boolean; message: string };

export async function changePassword(_: ChangePasswordState | null, formData: FormData): Promise<ChangePasswordState> {
  const parsed = schema.safeParse({ password: String(formData.get("password") ?? ""), confirmPassword: String(formData.get("confirmPassword") ?? "") });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте пароль" };

  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  const hash = await bcrypt.hash(parsed.data.password, 12);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE public.users SET password_hash=$2,must_change_password=false,updated_at=now() WHERE id=$1::uuid`, [auth.user.id, hash]);
    await client.query(`UPDATE public.auth_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1::uuid AND revoked_at IS NULL`, [auth.user.id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка смены пароля:", error);
    return { success: false, message: "Не удалось изменить пароль" };
  } finally { client.release(); }

  redirect("/login?passwordChanged=1");
}
