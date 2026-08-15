import "server-only";

import { db } from
  "@/lib/db/pool";

import { createNotification } from
  "@/features/notifications/server/create-notification";

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

type ProjectRow = {
  customer_id: string;

  selected_contractor_id:
    string | null;

  contractor_owner_id:
    string | null;
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
  let project:
    ProjectRow |
    undefined;

  try {
    const result =
      await db.query<ProjectRow>(
        `
          SELECT
            p.customer_id,

            p.selected_contractor_id,

            cc.owner_id
              AS contractor_owner_id

          FROM
            public.projects p

          LEFT JOIN
            public.contractor_companies cc
            ON cc.id =
              p.selected_contractor_id

          WHERE
            p.id = $1

          LIMIT 1
        `,
        [
          projectId,
        ]
      );

    project =
      result.rows[0];
  } catch (error) {
    console.error(
      "Ошибка определения проекта для уведомления:",
      {
        projectId,
        actorUserId,
        notificationType,
        error,
      }
    );

    return {
      success: false,
    };
  }

  if (!project) {
    return {
      success: false,
    };
  }

  const customerUserId =
    project.customer_id;

  const contractorUserId =
    project.contractor_owner_id;

  let recipientId:
    string | null =
    null;

  let destinationUrl:
    string | null =
    null;

  /*
   * Событие создал заказчик.
   * Уведомляем выбранного подрядчика.
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
   * Событие создал выбранный подрядчик.
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
   * или actor не является участником проекта.
   */
  if (!recipientId) {
    return {
      success: true,
    };
  }

  if (
    recipientId ===
    actorUserId
  ) {
    return {
      success: true,
    };
  }

  const notificationResult =
    await createNotification({
      userId:
        recipientId,

      actorId:
        actorUserId,

      notificationType,

      title:
        title.trim(),

      body:
        normalizeNullableText(
          body
        ),

      projectId,

      url:
        destinationUrl,

      metadata: {
        project_id:
          projectId,
      },
    });

  if (
    !notificationResult.success
  ) {
    console.error(
      "Ошибка создания уведомления участнику проекта:",
      {
        projectId,
        actorUserId,
        recipientId,
        notificationType,
        message:
          notificationResult.message,
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

function normalizeNullableText(
  value:
    | string
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized
    ? normalized
    : null;
}