"use server";

import { revalidatePath } from
  "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import { requireActiveUser } from
  "@/lib/auth/require-active-user";

import { requireActiveProject } from
  "@/lib/projects/require-active-project";

import {
  contractorReviewSchema,
  type ContractorReviewInput,
} from
  "@/features/reviews/schemas/contractor-review-schema";

import { createNotification } from
  "@/features/notifications/server/create-notification";

import { getProjectNotificationRecipient } from
  "@/features/notifications/server/get-project-notification-recipient";

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

  const values =
    parsed.data;

  const activeUser =
    await requireActiveUser();

  if (!activeUser.success) {
    return {
      success: false,
      message:
        activeUser.message,
    };
  }

  const {
    user,
    profile,
  } = activeUser;

  if (
    profile.role !==
    "customer"
  ) {
    return {
      success: false,
      message:
        "Оставить отзыв может только заказчик",
    };
  }

  const activeProject =
    await requireActiveProject(
      values.projectId
    );

  if (!activeProject.success) {
    return {
      success: false,
      message:
        activeProject.message,
    };
  }

  const project =
    activeProject.project;

  if (
    project.customer_id !==
    user.id
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

  const supabase =
    await createClient();

  const payload = {
    project_id:
      projectId,

    contractor_id:
      contractorId,

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
    .select(
      "id"
    )
    .eq(
      "project_id",
      projectId
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

  /*
   * Редактирование существующего
   * отзыва — без повторного уведомления.
   */
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
      return {
        success: false,
        message:
          "Не удалось обновить отзыв",
      };
    }

    revalidateReviewPages(
      projectId,
      contractorId
    );

    return {
      success: true,
      message:
        "Отзыв обновлён",
    };
  }

  const {
    data: createdReview,
    error: insertError,
  } = await supabase
    .from(
      "contractor_reviews"
    )
    .insert(
      payload
    )
    .select(
      "id"
    )
    .single();

  if (
    insertError ||
    !createdReview
  ) {
    return {
      success: false,
      message:
        "Не удалось опубликовать отзыв",
    };
  }

  /*
   * Уведомление только
   * о новом отзыве.
   */
  try {
    const recipient =
      await getProjectNotificationRecipient(
        projectId,
        user.id
      );

    if (recipient) {
      await createNotification({
        userId:
          recipient.recipientUserId,

        actorId:
          user.id,

        notificationType:
          "contractor_review_received",

        title:
          "Получен новый отзыв",

        body:
          `Заказчик оценил вашу работу на ${values.rating} из 5.`,

        projectId,

        url:
          `/contractor/work/${projectId}`,

        metadata: {
          review_id:
            createdReview.id,

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
        },
      });
    }
  } catch (error) {
    console.error(
      "Ошибка уведомления о новом отзыве:",
      error
    );
  }

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

  revalidatePath(
    "/contractor",
    "layout"
  );
}