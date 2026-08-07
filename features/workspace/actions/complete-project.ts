"use server";

import { revalidatePath } from
  "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import { requireActiveUser } from
  "@/lib/auth/require-active-user";

import { requireActiveProject } from
  "@/lib/projects/require-active-project";

import { createNotification } from
  "@/features/notifications/server/create-notification";

export type CompleteProjectResult = {
  success: boolean;
  message: string;
};

export async function completeProject(
  projectId: string
): Promise<CompleteProjectResult> {
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
        "Завершить проект может только заказчик",
    };
  }

  const activeProject =
    await requireActiveProject(
      projectId
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
    project.status ===
    "completed"
  ) {
    return {
      success: false,
      message:
        "Проект уже завершён",
    };
  }

  if (
    project.status !==
    "in_progress"
  ) {
    return {
      success: false,
      message:
        "На текущем статусе проект нельзя завершить",
    };
  }

  const supabase =
    await createClient();

  const {
    data: stages,
    error: stagesError,
  } = await supabase
    .from(
      "project_stages"
    )
    .select(`
      id,
      status,
      progress_weight
    `)
    .eq(
      "project_id",
      projectId
    );

  if (stagesError) {
    return {
      success: false,
      message:
        "Не удалось проверить этапы проекта",
    };
  }

  if (
    !stages ||
    stages.length === 0
  ) {
    return {
      success: false,
      message:
        "Нельзя завершить проект без этапов",
    };
  }

  const incompleteStages =
    stages.filter(
      (stage) =>
        stage.status !==
        "completed"
    );

  if (
    incompleteStages.length >
    0
  ) {
    return {
      success: false,
      message:
        `Нельзя завершить проект: не завершено этапов — ${incompleteStages.length}.`,
    };
  }

  const totalWeight =
    stages.reduce(
      (
        sum,
        stage
      ) =>
        sum +
        Number(
          stage.progress_weight ??
          0
        ),
      0
    );

  if (
    totalWeight !== 100
  ) {
    return {
      success: false,
      message:
        `Нельзя завершить проект: сумма долей этапов составляет ${totalWeight}%, необходимо 100%.`,
    };
  }

  const completedAt =
    new Date().toISOString();

  const {
    error: updateError,
  } = await supabase
    .from("projects")
    .update({
      status:
        "completed",

      completed_at:
        completedAt,

      updated_at:
        completedAt,
    })
    .eq(
      "id",
      projectId
    )
    .eq(
      "customer_id",
      user.id
    )
    .eq(
      "status",
      "in_progress"
    );

  if (updateError) {
    return {
      success: false,
      message:
        "Не удалось завершить проект",
    };
  }

  const {
    error: eventError,
  } = await supabase
    .from(
      "project_events"
    )
    .insert({
      project_id:
        projectId,

      author_id:
        user.id,

      event_type:
        "project_completed",

      title:
        "Проект завершён",

      description:
        "Заказчик подтвердил завершение проекта.",

      metadata: {},
    });

  if (eventError) {
    console.error(
      "Ошибка создания события завершения проекта:",
      eventError
    );
  }

  /*
   * Уведомляем подрядчика.
   */
  if (
    project.selected_contractor_id
  ) {
    try {
      const {
        data: company,
      } = await supabase
        .from(
          "contractor_companies"
        )
        .select(`
          id,
          owner_id
        `)
        .eq(
          "id",
          project.selected_contractor_id
        )
        .maybeSingle();

      if (
        company?.owner_id
      ) {
        await createNotification({
          userId:
            company.owner_id,

          actorId:
            user.id,

          notificationType:
            "project_completed",

          title:
            "Проект завершён",

          body:
            `Заказчик подтвердил завершение проекта «${project.title}».`,

          projectId,

          url:
            `/contractor/work/${projectId}`,

          metadata: {
            completed_at:
              completedAt,
          },
        });
      }
    } catch (error) {
      console.error(
        "Ошибка уведомления о завершении проекта:",
        error
      );
    }
  }

  revalidateProject(
    projectId
  );

  return {
    success: true,
    message:
      "Проект успешно завершён",
  };
}

function revalidateProject(
  projectId: string
) {
  revalidatePath(
    `/customer/work/${projectId}`
  );

  revalidatePath(
    `/contractor/work/${projectId}`
  );

  revalidatePath(
    `/customer/projects/${projectId}`
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
}