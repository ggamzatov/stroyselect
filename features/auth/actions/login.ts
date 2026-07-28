"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  type LoginInput,
} from "@/features/auth/schemas/login-schema";

export async function loginUser(input: LoginInput) {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверьте введенные данные",
    };
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      success: false,
      message: "Неверная электронная почта или пароль",
    };
  }

  redirect("/dashboard");
}