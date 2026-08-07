"use server";

import { revalidatePath } from
  "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import { createNotification } from
  "@/features/notifications/server/create-notification";

import { getProjectNotificationRecipient } from
  "@/features/notifications/server/get-project-notification-recipient";

import {
  contractorReviewSchema,
  type ContractorReviewInput,
} from
  "@/features/reviews/schemas/contractor-review-schema";

export type SaveContractorReviewResult = {
  success: boolean;
  message: string;
};

export async function saveContractorReview(
  input: ContractorReviewInput
): Promise<SaveContractorReviewResult> {
  const parsed =
    contractorReviewSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]
          ?.message ??
        "Проверьте отзыв",
    };
  }

  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      success: false,
      message:
        "Необходимо войти",
    };
  }

  const values =
    parsed.data;

  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .select(`
      id,
      customer_id,
      selected_contractor_id,
      status
    `)
    .eq(
      "id",
      values.projectId
    )
    .eq(
      "customer_id",
      user.id
    )
    .maybeSingle();

  if (
    projectError ||
    !project
  ) {
    return {
      success: false,
      message:
        "Проект не найден",
    };
  }

  if (
    project.status !==
    "completed"
  ) {
    return {
      success: false,
      message:
        "Отзыв можно оставить только после завершения проекта",
    };
  }

  if (
    !project.selected_contractor_id
  ) {
    return {
      success: false,
      message:
        "Подрядчик проекта не найден",
    };
  }

  const projectId =
  project.id;

    const contractorId =
  project.selected_contractor_id;

  const payload = {
    project_id:
      project.id,

    contractor_id:
      project.selected_contractor_id,

    customer_id:
      user.id,

    rating:
      values.rating,

    quality_rating:
      values.qualityRating ??
      null,

    deadline_rating:
      values.deadlineRating ??
      null,

    communication_rating:
      values.communicationRating ??
      null,

    comment:
      values.comment
        ?.trim() ||
      null,

    updated_at:
      new Date().toISOString(),
  };

  const {
    data: existingReview,
    error: existingError,
  } = await supabase
    .from(
      "contractor_reviews"
    )
    .select("id")
    .eq(
      "project_id",
      project.id
    )
    .eq(
      "customer_id",
      user.id
    )
    .maybeSingle();

  if (existingError) {
    return {
      success: false,
      message:
        "Не удалось проверить существующий отзыв",
    };
  }

  if (existingReview) {
    const {
      error,
    } = await supabase
      .from(
        "contractor_reviews"
      )
      .update(
        payload
      )
      .eq(
        "id",
        existingReview.id
      );

    if (error) {
      console.error(
        "Ошибка обновления отзыва:",
        error
      );

      return {
        success: false,
        message:
          "Не удалось обновить отзыв",
      };
    }

    revalidateReviewPages(
      project.id,
      project.selected_contractor_id
    );

    return {
      success: true,
      message:
        "Отзыв обновлён",
    };
  }

  const {
    error: insertError,
  } = await supabase
    .from(
      "contractor_reviews"
    )
    .insert(
      payload
    );

  if (insertError) {
    console.error(
      "Ошибка создания отзыва:",
      insertError
    );

    return {
      success: false,
      message:
        "Не удалось опубликовать отзыв",
    };
  }

  /* ← ВСТАВИТЬ ЗДЕСЬ БЛОК УВЕДОМЛЕНИЯ */

    revalidateReviewPages(
    project.id,
    project.selected_contractor_id
    );

    return {
    success: true,
    message:
        "Отзыв опубликован",
    };
  
  

 revalidateReviewPages(
  projectId,
  contractorId
);

  return {
    success: true,
    message:
      "Отзыв опубликован",
  };
}

function revalidateReviewPages(
  projectId: string,
  contractorId: string
) {
  revalidatePath(
    `/customer/work/${projectId}`
  );

  revalidatePath(
    `/customer/projects/${projectId}`
  );

  revalidatePath(
    `/customer/contractors/${contractorId}`
  );

  revalidatePath(
    "/customer/bids"
  );
}