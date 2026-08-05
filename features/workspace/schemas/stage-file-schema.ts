import { z } from "zod";

export const stageFileCategorySchema =
  z.enum([
    "before_photo",
    "progress_photo",
    "after_photo",
    "document",
    "invoice",
    "other",
  ]);

export const stageFileMetadataSchema =
  z.object({
    projectId: z.string().uuid(),

    stageId: z.string().uuid(),

    fileCategory:
      stageFileCategorySchema,

    description: z
      .string()
      .trim()
      .max(
        1000,
        "Описание слишком длинное"
      )
      .optional()
      .or(z.literal("")),
  });

export type StageFileCategory =
  z.infer<
    typeof stageFileCategorySchema
  >;