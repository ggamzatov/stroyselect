import { z } from "zod";

export const projectMessageSchema =
  z.object({
    projectId: z
      .string()
      .uuid(
        "Некорректный идентификатор проекта"
      ),

    messageText: z
      .string()
      .trim()
      .min(
        1,
        "Введите сообщение"
      )
      .max(
        5000,
        "Сообщение слишком длинное"
      ),

    replyToId: z
      .preprocess(
        (value) => {
          if (
            value === "" ||
            value === null ||
            value === undefined
          ) {
            return undefined;
          }

          return value;
        },

        z
          .string()
          .uuid()
          .optional()
      ),
  });

export type ProjectMessageInput =
  z.infer<
    typeof projectMessageSchema
  >;