"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { requireActiveProject } from "@/lib/projects/require-active-project";

const reviewSchema = z.object({
  stageId: z.string().uuid(),
  projectId: z.string().uuid(),
  decision: z.enum(["approve", "revision"]),
  comment: z
    .string()
    .trim()
    .max(3000, "Замечание слишком длинное")
    .optional()
    .or(z.literal("")),
});

type ReviewInput = z.infer<typeof reviewSchema>;

export type ReviewProjectStageResult = {
  success: boolean;
  message: string;
};

type StageRow = {
  id: string;
  title: string;
  status: string;
};

export async function reviewProjectStage(
  input: ReviewInput
): Promise<ReviewProjectStageResult> {
  const parsed = reviewSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Проверьте данные",
    };
  }

  const comment = parsed.data.comment?.trim() ?? "";

  if (parsed.data.decision === "revision" && comment.length < 2) {
    return { success: false, message: "Укажите замечание подрядчику" };
  }

  const activeUser = await requireActiveUser();

  if (!activeUser.success) {
    return { success: false, message: activeUser.message };
  }

  if (activeUser.profile.role !== "customer") {
    return { success: false, message: "Принимать этапы может только заказчик" };
  }

  const activeProject = await requireActiveProject(parsed.data.projectId);

  if (!activeProject.success) {
    return { success: false, message: activeProject.message };
  }

  if (activeProject.project.customer_id !== activeUser.user.id) {
    return { success: false, message: "У вас нет доступа к этому проекту" };
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const stageResult = await client.query<StageRow>(
      `
        SELECT id, title, status
        FROM public.project_stages
        WHERE id = $1
          AND project_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [parsed.data.stageId, parsed.data.projectId]
    );

    const stage = stageResult.rows[0];

    if (!stage) {
      await client.query("ROLLBACK");
      return { success: false, message: "Этап не найден" };
    }

    if (stage.status !== "awaiting_review") {
      await client.query("ROLLBACK");
      return { success: false, message: "Этот этап сейчас нельзя принять" };
    }

    if (parsed.data.decision === "approve") {
      await client.query(
        `
          UPDATE public.project_stages
          SET
            status = 'completed',
            actual_completed_at = now(),
            reviewed_at = now(),
            reviewed_by = $1,
            customer_review_comment = NULL,
            updated_at = now()
          WHERE id = $2
            AND project_id = $3
        `,
        [activeUser.user.id, stage.id, parsed.data.projectId]
      );

      await client.query(
        `
          INSERT INTO public.project_events (
            project_id,
            author_id,
            event_type,
            title,
            description,
            metadata
          )
          VALUES ($1, $2, 'stage_approved', $3, $4, $5::jsonb)
        `,
        [
          parsed.data.projectId,
          activeUser.user.id,
          "Этап принят заказчиком",
          stage.title,
          JSON.stringify({ stage_id: stage.id }),
        ]
      );

      await client.query("COMMIT");
      revalidateWorkspace(parsed.data.projectId);

      return { success: true, message: "Этап принят" };
    }

    await client.query(
      `
        UPDATE public.project_stages
        SET
          status = 'revision_required',
          actual_completed_at = NULL,
          reviewed_at = now(),
          reviewed_by = $1,
          customer_review_comment = $2,
          updated_at = now()
        WHERE id = $3
          AND project_id = $4
      `,
      [activeUser.user.id, comment, stage.id, parsed.data.projectId]
    );

    await client.query(
      `
        INSERT INTO public.project_events (
          project_id,
          author_id,
          event_type,
          title,
          description,
          metadata
        )
        VALUES ($1, $2, 'stage_revision_requested', $3, $4, $5::jsonb)
      `,
      [
        parsed.data.projectId,
        activeUser.user.id,
        "Этап возвращён на доработку",
        comment,
        JSON.stringify({ stage_id: stage.id, stage_title: stage.title }),
      ]
    );

    await client.query("COMMIT");
    revalidateWorkspace(parsed.data.projectId);

    return { success: true, message: "Этап возвращён на доработку" };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка проверки этапа:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Не удалось обработать этап",
    };
  } finally {
    client.release();
  }
}

function revalidateWorkspace(projectId: string) {
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
  revalidatePath("/customer/dashboard");
  revalidatePath("/contractor/dashboard");
  revalidatePath("/customer", "layout");
  revalidatePath("/contractor", "layout");
}
