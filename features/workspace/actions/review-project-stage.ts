"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const reviewSchema = z.object({
  stageId: z.string().uuid(),
  projectId: z.string().uuid(),

  decision: z.enum([
    "approve",
    "revision",
  ]),

  comment: z
    .string()
    .trim()
    .max(
      3000,
      "Замечание слишком длинное"
    )
    .optional()
    .or(z.literal("")),
});

type ReviewInput = z.infer<
  typeof reviewSchema
>;

export type ReviewProjectStageResult = {
  success: boolean;
  message: string;
};

export async function reviewProjectStage(
  input: ReviewInput
): Promise<ReviewProjectStageResult> {
  const parsed = reviewSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Проверьте данные",
    };
  }
   const comment = parsed.data.comment?.trim() ?? "";

if (
  parsed.data.decision === "revision" &&
  comment.length < 2
) {
  return {
    success: false,
    message: "Укажите замечание подрядчику",
  };
}

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Необходимо войти",
    };
  }

  const { data, error } =
    await supabase.rpc(
      "review_project_stage",
      {
        target_stage_id:
          parsed.data.stageId,

        target_project_id:
          parsed.data.projectId,

        decision:
          parsed.data.decision,

         review_comment:
             comment || null,
      }
    );

  if (error) {
    console.error(
      "Ошибка проверки этапа:",
      error
    );

    return {
      success: false,
      message:
        error.message ||
        "Не удалось обработать этап",
    };
  }

  revalidatePath(
    `/customer/work/${parsed.data.projectId}`
  );

  revalidatePath(
    `/contractor/work/${parsed.data.projectId}`
  );

  revalidatePath("/customer/dashboard");
  revalidatePath("/contractor/dashboard");

  const result = data as {
    success?: boolean;
    message?: string;
  } | null;

  return {
    success:
      result?.success ?? true,

    message:
      result?.message ??
      "Решение сохранено",
  };
}