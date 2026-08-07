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

import { getProjectNotificationRecipient } from
  "@/features/notifications/server/get-project-notification-recipient";

type StageAction =
  | "start"
  | "submit"
  | "resume";

export type UpdateProjectStageStatusResult = {
  success: boolean;
  message: string;
};

export async function updateProjectStageStatus(
  stageId: string,
  projectId: string,
  action: StageAction
): Promise<UpdateProjectStageStatusResult> {
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
    "contractor"
  ) {
    return {
      success: false,
      message:
        "Управлять этапами может только подрядчик",
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

  const supabase =
    await createClient();

  const {
    data: company,
    error: companyError,
  } = await supabase
    .from(
      "contractor_companies"
    )
    .select(
      "id"
    )
    .eq(
      "owner_id",
      user.id
    )
    .maybeSingle();

  if (
    companyError ||
    !company
  ) {
    return {
      success: false,
      message:
        "Компания подрядчика не найдена",
    };
  }

  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .select(`
      id,
      status,
      selected_contractor_id
    `)
    .eq(
      "id",
      projectId
    )
    .eq(
      "selected_contractor_id",
      company.id
    )
    .maybeSingle();

  if (
    projectError ||
    !project
  ) {
    return {
      success: false,
      message:
        "Проект не найден или не назначен вашей компании",
    };
  }

  if (
    ![
      "contractor_selected",
      "in_progress",
    ].includes(
      project.status
    )
  ) {
    return {
      success: false,
      message:
        "На текущем статусе проекта нельзя управлять этапами",
    };
  }

  const {
    data: stage,
    error: stageError,
  } = await supabase
    .from(
      "project_stages"
    )
    .select(`
      id,
      title,
      status
    `)
    .eq(
      "id",
      stageId
    )
    .eq(
      "project_id",
      projectId
    )
    .maybeSingle();

  if (
    stageError ||
    !stage
  ) {
    return {
      success: false,
      message:
        "Этап не найден",
    };
  }

  const now =
    new Date().toISOString();

  if (action === "start") {
    if (
      stage.status !==
      "planned"
    ) {
      return {
        success: false,
        message:
          "Начать можно только запланированный этап",
      };
    }

    const {
      error,
    } = await supabase
      .from(
        "project_stages"
      )
      .update({
        status:
          "in_progress",

        actual_started_at:
          now,

        actual_completed_at:
          null,

        submitted_for_review_at:
          null,

        reviewed_at:
          null,

        reviewed_by:
          null,

        customer_review_comment:
          null,

        updated_at:
          now,
      })
      .eq(
        "id",
        stageId
      )
      .eq(
        "project_id",
        projectId
      )
      .eq(
        "status",
        "planned"
      );

    if (error) {
      return {
        success: false,
        message:
          "Не удалось начать этап",
      };
    }

    if (
      project.status ===
      "contractor_selected"
    ) {
      await supabase
        .from("projects")
        .update({
          status:
            "in_progress",

          work_started_at:
            now,

          updated_at:
            now,
        })
        .eq(
          "id",
          projectId
        )
        .eq(
          "selected_contractor_id",
          company.id
        )
        .eq(
          "status",
          "contractor_selected"
        );
    }

    await createStageEvent({
      supabase,
      projectId,
      authorId:
        user.id,
      eventType:
        "stage_started",
      title:
        "Этап начат",
      description:
        stage.title,
      stageId,
    });

    await notifyParticipant({
      projectId,
      actorId:
        user.id,
      type:
        "stage_started",
      title:
        "Начат новый этап",
      body:
        `Подрядчик начал этап «${stage.title}».`,
      stageId,
    });

    revalidateWorkspace(
      projectId
    );

    return {
      success: true,
      message:
        "Этап переведён в работу",
    };
  }

  if (action === "submit") {
    if (
      stage.status !==
      "in_progress"
    ) {
      return {
        success: false,
        message:
          "На проверку можно отправить только выполняемый этап",
      };
    }

    const {
      error,
    } = await supabase
      .from(
        "project_stages"
      )
      .update({
        status:
          "awaiting_review",

        submitted_for_review_at:
          now,

        customer_review_comment:
          null,

        reviewed_at:
          null,

        reviewed_by:
          null,

        updated_at:
          now,
      })
      .eq(
        "id",
        stageId
      )
      .eq(
        "project_id",
        projectId
      )
      .eq(
        "status",
        "in_progress"
      );

    if (error) {
      return {
        success: false,
        message:
          "Не удалось отправить этап на проверку",
      };
    }

    await createStageEvent({
      supabase,
      projectId,
      authorId:
        user.id,
      eventType:
        "stage_submitted_for_review",
      title:
        "Этап отправлен на проверку",
      description:
        stage.title,
      stageId,
    });

    await notifyParticipant({
      projectId,
      actorId:
        user.id,
      type:
        "stage_submitted",
      title:
        "Этап готов к приёмке",
      body:
        `Подрядчик завершил этап «${stage.title}» и отправил его на проверку.`,
      stageId,
    });

    revalidateWorkspace(
      projectId
    );

    return {
      success: true,
      message:
        "Этап отправлен заказчику на проверку",
    };
  }

  if (
    stage.status !==
    "revision_required"
  ) {
    return {
      success: false,
      message:
        "Возобновить можно только этап с замечанием",
    };
  }

  const {
    error,
  } = await supabase
    .from(
      "project_stages"
    )
    .update({
      status:
        "in_progress",

      submitted_for_review_at:
        null,

      reviewed_at:
        null,

      reviewed_by:
        null,

      updated_at:
        now,
    })
    .eq(
      "id",
      stageId
    )
    .eq(
      "project_id",
      projectId
    )
    .eq(
      "status",
      "revision_required"
    );

  if (error) {
    return {
      success: false,
      message:
        "Не удалось возобновить этап",
    };
  }

  await createStageEvent({
    supabase,
    projectId,
    authorId:
      user.id,
    eventType:
      "stage_started",
    title:
      "Исправление замечаний начато",
    description:
      stage.title,
    stageId,
  });

  await notifyParticipant({
    projectId,
    actorId:
      user.id,
    type:
      "stage_started",
    title:
      "Подрядчик начал доработку",
    body:
      `Подрядчик возобновил этап «${stage.title}» и приступил к устранению замечаний.`,
    stageId,
  });

  revalidateWorkspace(
    projectId
  );

  return {
    success: true,
    message:
      "Этап возвращён в работу",
  };
}

async function notifyParticipant({
  projectId,
  actorId,
  type,
  title,
  body,
  stageId,
}: {
  projectId: string;
  actorId: string;
  type: string;
  title: string;
  body: string;
  stageId: string;
}) {
  try {
    const recipient =
      await getProjectNotificationRecipient(
        projectId,
        actorId
      );

    if (!recipient) {
      return;
    }

    await createNotification({
      userId:
        recipient.recipientUserId,

      actorId,

      notificationType:
        type,

      title,

      body,

      projectId,

      url:
        recipient.recipientRole ===
        "customer"
          ? `/customer/work/${projectId}`
          : `/contractor/work/${projectId}`,

      metadata: {
        stage_id:
          stageId,
      },
    });
  } catch (error) {
    console.error(
      "Ошибка уведомления об этапе:",
      error
    );
  }
}

async function createStageEvent({
  supabase,
  projectId,
  authorId,
  eventType,
  title,
  description,
  stageId,
}: {
  supabase:
    Awaited<
      ReturnType<
        typeof createClient
      >
    >;
  projectId: string;
  authorId: string;
  eventType: string;
  title: string;
  description: string;
  stageId: string;
}) {
  const {
    error,
  } = await supabase
    .from(
      "project_events"
    )
    .insert({
      project_id:
        projectId,

      author_id:
        authorId,

      event_type:
        eventType,

      title,

      description,

      metadata: {
        stage_id:
          stageId,
      },
    });

  if (error) {
    console.error(
      "Ошибка создания события:",
      error
    );
  }
}

function revalidateWorkspace(
  projectId: string
) {
  revalidatePath(
    `/contractor/work/${projectId}`
  );

  revalidatePath(
    `/customer/work/${projectId}`
  );

  revalidatePath(
    `/customer/projects/${projectId}`
  );

  revalidatePath(
    "/contractor/dashboard"
  );

  revalidatePath(
    "/customer/dashboard"
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