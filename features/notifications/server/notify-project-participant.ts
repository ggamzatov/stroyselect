import { createClient } from
  "@/lib/supabase/server";

export type ProjectNotificationType =
  | "new_message"
  | "chat_file_uploaded"

  | "stage_created"
  | "stage_updated"
  | "stage_deleted"
  | "stage_started"
  | "stage_submitted"
  | "stage_approved"
  | "stage_revision_requested"

  | "file_uploaded"
  | "file_deleted"

  | "project_started"
  | "project_completed"

  | "review_created"
  | "review_updated";

type Input = {
  projectId: string;

  actorUserId: string;

  notificationType:
    ProjectNotificationType;

  title: string;

  body?: string | null;

  customerUrl?: string | null;

  contractorUrl?: string | null;
};

export async function notifyProjectParticipant({
  projectId,
  actorUserId,
  notificationType,
  title,
  body,
  customerUrl,
  contractorUrl,
}: Input) {
  const supabase =
    await createClient();

  /*
   * Получаем заказчика
   * и выбранную компанию подрядчика.
   */
  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .select(`
      id,
      customer_id,
      selected_contractor_id
    `)
    .eq(
      "id",
      projectId
    )
    .maybeSingle();

  if (
    projectError ||
    !project
  ) {
    console.error(
      "Ошибка определения проекта для уведомления:",
      {
        projectId,

        message:
          projectError?.message,

        details:
          projectError?.details,

        hint:
          projectError?.hint,

        code:
          projectError?.code,
      }
    );

    return {
      success: false,
    };
  }

  let contractorUserId:
    string | null =
    null;

  /*
   * selected_contractor_id содержит id
   * contractor_companies, поэтому отдельно
   * получаем owner_id.
   */
  if (
    project.selected_contractor_id
  ) {
    const {
      data: company,
      error: companyError,
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

    if (companyError) {
      console.error(
        "Ошибка определения владельца компании:",
        {
          projectId,

          message:
            companyError.message,

          details:
            companyError.details,

          hint:
            companyError.hint,

          code:
            companyError.code,
        }
      );
    }

    contractorUserId =
      company?.owner_id ??
      null;
  }

  const customerUserId =
    project.customer_id;

  let recipientId:
    string | null =
    null;

  let destinationUrl:
    string | null =
    null;

  /*
   * Событие создал заказчик.
   * Уведомляем подрядчика.
   */
  if (
    actorUserId ===
    customerUserId
  ) {
    recipientId =
      contractorUserId;

    destinationUrl =
      contractorUrl ??
      `/contractor/work/${projectId}`;
  }

  /*
   * Событие создал подрядчик.
   * Уведомляем заказчика.
   */
  if (
    contractorUserId &&
    actorUserId ===
      contractorUserId
  ) {
    recipientId =
      customerUserId;

    destinationUrl =
      customerUrl ??
      `/customer/work/${projectId}`;
  }

  /*
   * Подрядчик ещё не выбран
   * или пользователь не является
   * участником проекта.
   */
  if (!recipientId) {
    return {
      success: true,
    };
  }

  /*
   * Защита от уведомления
   * самому себе.
   */
  if (
    recipientId ===
    actorUserId
  ) {
    return {
      success: true,
    };
  }

  const {
    error: notificationError,
  } = await supabase
    .from("notifications")
    .insert({
      user_id:
        recipientId,

      notification_type:
        notificationType,

      title:
        title.trim(),

      body:
        body?.trim() ||
        null,

      url:
        destinationUrl,

      is_read:
        false,
    });

  if (
    notificationError
  ) {
    console.error(
      "Ошибка создания уведомления:",
      {
        projectId,
        actorUserId,
        recipientId,
        notificationType,

        message:
          notificationError.message,

        details:
          notificationError.details,

        hint:
          notificationError.hint,

        code:
          notificationError.code,
      }
    );

    return {
      success: false,
    };
  }

  return {
    success: true,
  };
}