import { z } from "zod";

const BCRYPT_MAX_PASSWORD_BYTES = 72;

function getUtf8ByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

export const registerSchema = z
  .object({
    role: z.enum(["customer", "contractor"], {
      message: "Выберите роль",
    }),

    firstName: z
      .string()
      .trim()
      .min(2, "Введите имя")
      .max(50, "Имя слишком длинное"),

    lastName: z
      .string()
      .trim()
      .max(50, "Фамилия слишком длинная")
      .optional(),

    email: z
      .string()
      .trim()
      .email("Введите корректную электронную почту"),

    password: z
      .string()
      .min(8, "Пароль должен содержать минимум 8 символов")
      .refine(
        (value) => getUtf8ByteLength(value) <= BCRYPT_MAX_PASSWORD_BYTES,
        "Пароль слишком длинный"
      ),

    confirmPassword: z.string(),

    consent: z.literal(true, {
      message: "Необходимо принять условия",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
