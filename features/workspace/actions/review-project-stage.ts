"use server";

import { revalidatePath } from
  "next/cache";

import { z } from "zod";

import { createClient } from
  "@/lib/supabase/server";

import { requireActiveUser } from
  "@/lib/auth/require-active-user";

import { requireActiveProject } from
  "@/lib/projects/require-active-project";

const reviewSchema =
  z.object({
    stageId:
      z.string().uuid(),

    projectId:
      z.string().uuid(),

    decision:
      z.enum([
        "approve",
        "revision",
      ]),

    comment:
      z
        .string()
        .trim()
        .max(
          3000,
          "Замечание слишком длинное"
        )
        .optional()
        .or(
          z.literal("")
        ),
  });

type ReviewInput =
  z.infer<
    typeof reviewSchema
  >;

export type ReviewProjectStageResult = {
  success: boolean;
  message: string;
};

export async function reviewProjectStage(
  input: ReviewInput
): Promise<ReviewProjectStageResult> {
  const parsed =
    reviewSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]
          ?.message ??
        "Проверьте данные",
    };
  }

  const comment =
    parsed.data.comment
      ?.trim() ??
    "";

  if (
    parsed.data.decision ===
      "revision" &&
    comment.length < 2
  ) {
    return {
      success: false,
      message:
        "Укажите замечание подрядчику",
    };
  }

  const activeUser =
    await requireActiveUser();

  if (!activeUser.success) {
    return {
      success: false,
      message:
        activeUser.message,
    };
  }

  if (
    activeUser.profile.role !==
    "customer"
  ) {
    return {
      success: false,
      message:
        "Принимать этапы может только заказчик",
    };
  }

  const activeProject =
    await requireActiveProject(
      parsed.data.projectId
    );

  if (!activeProject.success) {
    return {
      success: false,
      message:
        activeProject.message,
    };
  }

  if (
    activeProject.project
      .customer_id !==
    activeUser.user.id
  ) {
    return {
      success: false,
      message:
        "У вас нет доступа к этому проекту",
    };
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "review_project_stage",
    {
      target_stage_id:
        parsed.data.stageId,

      target_project_id:
        parsed.data.projectId,

      decision:
        parsed.data.decision,

      review_comment:
        comment ||
        null,
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

  revalidatePath(
    "/customer/dashboard"
  );

  revalidatePath(
    "/contractor/dashboard"
  );

  revalidatePath(
    "/customer",
    "layout"
  );

  revalidatePath(
    "/contractor",
    "layout"
  );

  const result =
    data as {
      success?: boolean;
      message?: string;
    } | null;

  return {
    success:
      result?.success ??
      true,

    message:
      result?.message ??
      "Решение сохранено",
  };
}