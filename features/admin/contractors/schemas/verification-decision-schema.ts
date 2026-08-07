import { z } from "zod";

export const verificationDecisionSchema =
  z
    .object({
      contractorId: z
        .string()
        .uuid(
          "Некорректный идентификатор подрядчика"
        ),

      decision: z.enum([
        "approve",
        "reject",
        "suspend",
        "resume",
        "return_to_draft",
      ]),

      comment: z
        .string()
        .trim()
        .max(
          3000,
          "Комментарий слишком длинный"
        )
        .optional()
        .or(z.literal("")),
    })
    .superRefine(
      (
        values,
        ctx
      ) => {
        const requiresComment =
          [
            "reject",
            "suspend",
            "return_to_draft",
          ].includes(
            values.decision
          );

        if (
          requiresComment &&
          (
            !values.comment ||
            values.comment.trim()
              .length < 3
          )
        ) {
          ctx.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "comment",
            ],

            message:
              "Укажите причину решения",
          });
        }
      }
    );

export type VerificationDecisionInput =
  z.infer<
    typeof verificationDecisionSchema
  >;