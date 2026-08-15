import "server-only";

import { db } from
  "@/lib/db/pool";

import { createNotification } from
  "@/features/notifications/server/create-notification";

type Input = {
  projectId: string;
  bidId: string;
  customerId: string;
};

type RejectedBidRow = {
  id: string;
  project_id: string;
  contractor_id: string;

  company_id:
    string;

  company_owner_id:
    string;

  company_public_name:
    string | null;

  project_id_joined:
    string;

  project_title:
    string;

  project_customer_id:
    string;
};

export async function notifyContractorBidRejected({
  projectId,
  bidId,
  customerId,
}: Input) {
  let bid:
    RejectedBidRow |
    undefined;

  try {
    const result =
      await db.query<RejectedBidRow>(
        `
          SELECT
            pb.id,
            pb.project_id,
            pb.contractor_id,

            cc.id
              AS company_id,

            cc.owner_id
              AS company_owner_id,

            cc.public_name
              AS company_public_name,

            p.id
              AS project_id_joined,

            p.title
              AS project_title,

            p.customer_id
              AS project_customer_id

          FROM
            public.project_bids pb

          JOIN
            public.contractor_companies cc
            ON cc.id =
              pb.contractor_id

          JOIN
            public.projects p
            ON p.id =
              pb.project_id

          WHERE
            pb.id = $1
            AND pb.project_id = $2

          LIMIT 1
        `,
        [
          bidId,
          projectId,
        ]
      );

    bid =
      result.rows[0];
  } catch (error) {
    console.error(
      "Ошибка загрузки предложения для уведомления об отклонении:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось определить подрядчика",
    };
  }

  if (!bid) {
    return {
      success: false,
      message:
        "Не удалось определить подрядчика",
    };
  }

  if (
    bid.project_customer_id !==
    customerId
  ) {
    return {
      success: false,
      message:
        "Нет доступа к проекту",
    };
  }

  if (
    !bid.company_owner_id
  ) {
    return {
      success: false,
      message:
        "Владелец компании подрядчика не найден",
    };
  }

  if (
    bid.company_owner_id ===
    customerId
  ) {
    return {
      success: true,
      message:
        "Уведомление не требуется",
    };
  }

  const notificationResult =
    await createNotification({
      userId:
        bid.company_owner_id,

      actorId:
        customerId,

      notificationType:
        "bid_rejected",

      title:
        "Предложение отклонено",

      body:
        `Заказчик отклонил ваше предложение по проекту «${bid.project_title}».`,

      projectId:
        projectId,

      url:
        `/contractor/projects/${projectId}`,

      deduplicationKey:
        `bid-rejected:${bid.id}:user:${bid.company_owner_id}`,

      metadata: {
        bid_id:
          bid.id,

        contractor_id:
          bid.contractor_id,

        project_title:
          bid.project_title,
      },
    });

  if (
    !notificationResult.success
  ) {
    return {
      success: false,
      message:
        notificationResult.message,
    };
  }

  return {
    success: true,

    message:
      notificationResult.duplicated
        ? "Уведомление уже было отправлено"
        : "Подрядчик уведомлён",
  };
}