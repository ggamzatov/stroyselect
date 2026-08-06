import { z } from "zod";

export const chatAttachmentSchema =
  z.object({
    projectId: z
      .string()
      .uuid(
        "Некорректный идентификатор проекта"
      ),

    messageText: z
      .string()
      .trim()
      .max(
        5000,
        "Сообщение слишком длинное"
      )
      .optional()
      .or(z.literal("")),
  });

export type ChatAttachmentInput =
  z.infer<
    typeof chatAttachmentSchema
  >;