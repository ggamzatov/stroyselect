import { z } from "zod";

export const bidSchema = z.object({
  projectId: z.string().uuid(),

  price: z
    .number()
    .positive("Стоимость должна быть больше нуля")
    .max(
      10_000_000_000,
      "Указана слишком большая стоимость"
    ),

  durationDays: z
    .number()
    .int()
    .min(1, "Минимальный срок — 1 день")
    .max(3650, "Срок слишком большой"),

  message: z
    .string()
    .trim()
    .min(
      20,
      "Комментарий должен содержать минимум 20 символов"
    )
    .max(
      3000,
      "Комментарий слишком длинный"
    ),

  proposedStartDate: z
    .string()
    .optional()
    .or(z.literal("")),
});

export type BidInput = z.infer<
  typeof bidSchema
>;