"use server";

import { redirect } from
  "next/navigation";

import bcrypt from
  "bcryptjs";

import { db } from
  "@/lib/db/pool";

import { createUserSession } from
  "@/lib/auth/session";

import {
  loginSchema,
  type LoginInput,
} from
  "@/features/auth/schemas/login-schema";

type UserRow = {
  id: string;
  password_hash: string | null;
  is_active: boolean;
};

export async function loginUser(
  input: LoginInput
) {
  const parsed =
    loginSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        "Проверьте введенные данные",
    };
  }

  const email =
    parsed.data.email
      .trim()
      .toLowerCase();

  const password =
    parsed.data.password;

  /*
   * Ищем пользователя локально.
   *
   * lower(email) позволяет сохранить
   * регистронезависимый вход.
   */
  const result =
    await db.query<UserRow>(
      `
        SELECT
          id,
          password_hash,
          is_active
        FROM
          public.users
        WHERE
          lower(email) = $1
        LIMIT 1
      `,
      [
        email,
      ]
    );

  const user =
    result.rows[0];

  /*
   * Намеренно возвращаем одинаковую
   * ошибку и для неизвестного email,
   * и для неправильного пароля.
   */
  if (
    !user ||
    !user.password_hash
  ) {
    return {
      success: false,
      message:
        "Неверная электронная почта или пароль",
    };
  }

  let passwordMatches =
    false;

  try {
    passwordMatches =
      await bcrypt.compare(
        password,
        user.password_hash
      );
  } catch (error) {
    console.error(
      "Ошибка проверки пароля:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось выполнить вход",
    };
  }

  if (!passwordMatches) {
    return {
      success: false,
      message:
        "Неверная электронная почта или пароль",
    };
  }

  if (!user.is_active) {
    return {
      success: false,
      message:
        "Учетная запись отключена",
    };
  }

  /*
   * Пароль подтверждён.
   * Создаём нашу серверную сессию.
   */
  await createUserSession(
    user.id
  );

  redirect(
    "/dashboard"
  );
}