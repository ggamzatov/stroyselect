import { z } from "zod";

export const verificationDecisionSchema =
  z.discriminatedUnion("decision", [
    z.object({
      contractorId: z.string().uuid(),

      decision: z.literal("approve"),

      comment: z
        .string()
        .trim()
        .max(
          2000,
          "Комментарий слишком длинный"
        )
        .optional()
        .or(z.literal("")),
    }),

    z.object({
      contractorId: z.string().uuid(),

      decision: z.literal("reject"),

      comment: z
        .string()
        .trim()
        .min(
          10,
          "Укажите причину отклонения минимум из 10 символов"
        )
        .max(
          2000,
          "Комментарий слишком длинный"
        ),
    }),

    z.object({
      contractorId: z.string().uuid(),

      decision: z.literal("suspend"),

      comment: z
        .string()
        .trim()
        .min(
          10,
          "Укажите причину приостановки"
        )
        .max(
          2000,
          "Комментарий слишком длинный"
        ),
    }),

    z.object({
      contractorId: z.string().uuid(),

      decision: z.literal("return_to_draft"),

      comment: z
        .string()
        .trim()
        .min(
          10,
          "Укажите, что необходимо исправить"
        )
        .max(
          2000,
          "Комментарий слишком длинный"
        ),
    }),
  ]);

export type VerificationDecisionInput =
  z.infer<typeof verificationDecisionSchema>;