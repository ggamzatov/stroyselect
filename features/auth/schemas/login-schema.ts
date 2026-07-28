import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Введите корректную электронную почту"),

  password: z
    .string()
    .min(1, "Введите пароль"),
});

export type LoginInput = z.infer<typeof loginSchema>;