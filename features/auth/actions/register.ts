"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { db } from "@/lib/db/pool";
import { enforceRateLimit, getRequestIp, rateLimitMessage } from "@/lib/security/rate-limit";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas/register-schema";

export type RegisterState = {
  success: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof RegisterInput, string[]>>;
};

type ExistingUserRow = { id: string };

export async function registerUser(input: RegisterInput): Promise<RegisterState> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Проверьте заполнение формы",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const ip = await getRequestIp();

  const [ipLimit, emailLimit] = await Promise.all([
    enforceRateLimit({
      scope: "register:ip",
      identity: ip,
      limit: 5,
      windowSeconds: 60 * 60,
      blockSeconds: 60 * 60,
    }),
    enforceRateLimit({
      scope: "register:email-ip",
      identity: `${email}\n${ip}`,
      limit: 3,
      windowSeconds: 60 * 60,
      blockSeconds: 60 * 60,
    }),
  ]);

  const rejectedLimit = !ipLimit.allowed ? ipLimit : !emailLimit.allowed ? emailLimit : null;
  if (rejectedLimit) {
    return { success: false, message: rateLimitMessage(rejectedLimit) };
  }

  const { role, firstName, lastName, password } = parsed.data;

  const existingResult = await db.query<ExistingUserRow>(
    `SELECT id FROM public.users WHERE lower(email) = $1::text LIMIT 1`,
    [email]
  );

  if (existingResult.rows[0]) {
    return {
      success: false,
      message: "Пользователь с такой почтой уже зарегистрирован.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const userResult = await client.query<{ id: string }>(
      `
        INSERT INTO public.users (
          id, email, password_hash, email_confirmed_at, raw_user_meta_data, is_active
        )
        VALUES (gen_random_uuid(), $1::text, $2::text, now(), $3::jsonb, true)
        RETURNING id
      `,
      [
        email,
        passwordHash,
        JSON.stringify({
          role,
          first_name: firstName,
          last_name: lastName ?? null,
        }),
      ]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) throw new Error("Не удалось создать пользователя");

    await client.query(
      `
        INSERT INTO public.profiles (
          id, role, first_name, last_name, email, is_blocked
        )
        VALUES ($1::uuid, $2, $3, $4, $5::text, false)
      `,
      [userId, role, firstName, lastName ?? null, email]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка локальной регистрации:", error);
    return { success: false, message: "Не удалось создать учётную запись" };
  } finally {
    client.release();
  }

  redirect("/registration-success");
}
