"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { requireActiveProject } from "@/lib/projects/require-active-project";
import {
  contractorReviewSchema,
  type ContractorReviewInput,
} from "@/features/reviews/schemas/contractor-review-schema";
import { createNotification } from "@/features/notifications/server/create-notification";
import { getProjectNotificationRecipient } from "@/features/notifications/server/get-project-notification-recipient";

export type SaveContractorReviewResult = { success: boolean; message: string };

export async function saveContractorReview(input: ContractorReviewInput): Promise<SaveContractorReviewResult> {
  const parsed = contractorReviewSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте отзыв" };

  const activeUser = await requireActiveUser();
  if (!activeUser.success) return { success: false, message: activeUser.message };
  const { user, profile } = activeUser;
  if (profile.role !== "customer") return { success: false, message: "Оставить отзыв может только заказчик" };

  const values = parsed.data;
  const activeProject = await requireActiveProject(values.projectId);
  if (!activeProject.success) return { success: false, message: activeProject.message };

  const project = activeProject.project;
  if (project.customer_id !== user.id) return { success: false, message: "Проект не найден" };
  if (project.status !== "completed") return { success: false, message: "Отзыв можно оставить только после завершения проекта" };
  if (!project.selected_contractor_id) return { success: false, message: "Подрядчик проекта не найден" };

  const projectId = project.id;
  const contractorId = project.selected_contractor_id;
  const client = await db.connect();
  let reviewId: string | undefined;
  let created = false;

  try {
    await client.query("BEGIN");
    const existingResult = await client.query<{ id: string }>(
      `SELECT id FROM public.contractor_reviews WHERE project_id=$1 AND customer_id=$2 LIMIT 1 FOR UPDATE`,
      [projectId, user.id]
    );
    const existing = existingResult.rows[0];

    if (existing) {
      const result = await client.query<{ id: string }>(
        `
          UPDATE public.contractor_reviews
          SET contractor_id=$1, rating=$2, quality_rating=$3,
              deadline_rating=$4, communication_rating=$5, budget_rating=$6,
              comment=$7, moderation_status='published', moderated_by=NULL,
              moderated_at=NULL, moderation_note=NULL, updated_at=now()
          WHERE id=$8 AND customer_id=$9
          RETURNING id
        `,
        [
          contractorId,
          values.rating,
          values.qualityRating ?? null,
          values.deadlineRating ?? null,
          values.communicationRating ?? null,
          values.budgetRating ?? null,
          values.comment?.trim() || null,
          existing.id,
          user.id,
        ]
      );
      reviewId = result.rows[0]?.id;
    } else {
      const result = await client.query<{ id: string }>(
        `
          INSERT INTO public.contractor_reviews (
            project_id, contractor_id, customer_id, rating,
            quality_rating, deadline_rating, communication_rating, budget_rating,
            comment, moderation_status, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'published',now())
          RETURNING id
        `,
        [
          projectId,
          contractorId,
          user.id,
          values.rating,
          values.qualityRating ?? null,
          values.deadlineRating ?? null,
          values.communicationRating ?? null,
          values.budgetRating ?? null,
          values.comment?.trim() || null,
        ]
      );
      reviewId = result.rows[0]?.id;
      created = true;
    }

    if (!reviewId) throw new Error("Отзыв не был сохранён");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка сохранения отзыва:", error);
    return { success: false, message: created ? "Не удалось опубликовать отзыв" : "Не удалось обновить отзыв" };
  } finally {
    client.release();
  }

  if (created && reviewId) {
    try {
      const recipient = await getProjectNotificationRecipient(projectId, user.id);
      if (recipient) {
        await createNotification({
          userId: recipient.recipientUserId,
          actorId: user.id,
          notificationType: "contractor_review_received",
          title: "Получен новый отзыв",
          body: `Заказчик оценил вашу работу на ${values.rating} из 5.`,
          projectId,
          url: `/contractor/work/${projectId}`,
          metadata: {
            review_id: reviewId,
            rating: values.rating,
            quality_rating: values.qualityRating ?? null,
            deadline_rating: values.deadlineRating ?? null,
            communication_rating: values.communicationRating ?? null,
            budget_rating: values.budgetRating ?? null,
          },
        });
      }
    } catch (error) {
      console.error("Ошибка уведомления о новом отзыве:", error);
    }
  }

  revalidateReviewPages(projectId, contractorId);
  return { success: true, message: created ? "Отзыв опубликован" : "Отзыв обновлён" };
}

function revalidateReviewPages(projectId: string, contractorId: string) {
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/customer/projects/${projectId}`);
  revalidatePath(`/customer/contractors/${contractorId}`);
  revalidatePath("/customer/bids");
  revalidatePath("/contractor", "layout");
}
