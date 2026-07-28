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
    return {
      success: false,
      message: translateAuthError(error.message),
    };
  }

  redirect("/registration-success");
}

function translateAuthError(message: string): string {
  if (message.toLowerCase().includes("already registered")) {
    return "Пользователь с такой почтой уже зарегистрирован";
  }

  if (message.toLowerCase().includes("password")) {
    return "Пароль не соответствует требованиям";
  }

  return "Не удалось создать учетную запись";
}