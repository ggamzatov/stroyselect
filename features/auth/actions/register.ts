"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  registerSchema,
  type RegisterInput,
} from "@/features/auth/schemas/register-schema";

export type RegisterState = {
  success: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof RegisterInput, string[]>>;
};

export async function registerUser(
  input: RegisterInput
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверьте заполнение формы",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  const {
    role,
    firstName,
    lastName,
    email,
    password,
  } = parsed.data;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        first_name: firstName,
        last_name: lastName ?? null,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
  console.error("SUPABASE SIGNUP ERROR:", {
    message: error.message,
    code: error.code,
    status: error.status,
    name: error.name,
  });

  return {
    success: false,
    message: translateAuthError(error.code, error.message),
  };
}

  redirect("/registration-success");
}

function translateAuthError(
  code: string | undefined,
  message: string
): string {
  console.error("AUTH ERROR CODE:", code);
  console.error("AUTH ERROR MESSAGE:", message);

  switch (code) {
    case "email_rate_limit_exceeded":
      return "Превышен лимит отправки писем. Подождите около часа или подключите собственный SMTP.";

    case "over_email_send_rate_limit":
      return "Слишком много писем отправлено за короткое время. Попробуйте позже.";

    case "user_already_exists":
      return "Пользователь с такой почтой уже зарегистрирован.";

    case "email_address_invalid":
      return "Указан недействительный адрес электронной почты.";

    case "weak_password":
      return "Пароль слишком простой.";

    case "signup_disabled":
      return "Регистрация пользователей временно отключена.";

    default:
      return `Ошибка регистрации: ${message}`;
  }
}