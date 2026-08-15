import "server-only";

import { db } from
  "@/lib/db/pool";

import { createNotification } from
  "@/features/notifications/server/create-notification";

type NotifyContractorBidAcceptedInput = {
  projectId: string;
  bidId: string;
  customerId: string;
};

type NotifyContractorBidAcceptedResult = {
  success: boolean;
  message: string;
  contractorUserId?: string;
  notificationId?: string;
  duplicated?: boolean;
};

type AcceptedBidRow = {
  id: string;
  project_id: string;
  contractor_id: string;

  price:
    string | number;

  duration_days:
    number;

  proposed_start_date:
    Date | string | null;

  status: string;

  company_id:
    string;

  company_owner_id:
    string;

  company_public_name:
    string | null;

  project_customer_id:
    string;

  project_title:
    string;

  project_city:
    string | null;

  project_status:
    string;
};

export async function notifyContractorBidAccepted({
  projectId,
  bidId,
  customerId,
}: NotifyContractorBidAcceptedInput): Promise<
  NotifyContractorBidAcceptedResult
> {
  let bid:
    AcceptedBidRow |
    undefined;

  try {
    const result =
      await db.query<AcceptedBidRow>(
        `
          SELECT
            pb.id,
            pb.project_id,
            pb.contractor_id,
            pb.price,
            pb.duration_days,
            pb.proposed_start_date,
            pb.status,

            cc.id
              AS company_id,

            cc.owner_id
              AS company_owner_id,

            cc.public_name
              AS company_public_name,

            p.customer_id
              AS project_customer_id,

            p.title
              AS project_title,

            p.city
              AS project_city,

            p.status
              AS project_status

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
      "Ошибка загрузки принятого предложения для уведомления:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось загрузить принятое предложение",
    };
  }

  if (!bid) {
    return {
      success: false,
      message:
        "Принятое предложение не найдено",
    };
  }

  if (
    bid.project_customer_id !==
    customerId
  ) {
    return {
      success: false,
      message:
        "Заказчик не является владельцем проекта",
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

  const result =
    await createNotification({
      userId:
        bid.company_owner_id,

      actorId:
        customerId,

      notificationType:
        "bid_accepted",

      title:
        "Ваше предложение принято",

      body:
        `Заказчик выбрал вас подрядчиком по проекту «${bid.project_title}»`,

      projectId:
        bid.project_id,

      url:
        `/contractor/work/${bid.project_id}`,

      deduplicationKey:
        `bid-accepted:${bid.id}:user:${bid.company_owner_id}`,

      metadata: {
        bid_id:
          bid.id,

        project_title:
          bid.project_title,

        contractor_company_id:
          bid.company_id,

        contractor_company_name:
          bid.company_public_name,

        price:
          bid.price,

        duration_days:
          bid.duration_days,

        proposed_start_date:
          bid.proposed_start_date,
      },
    });

  if (!result.success) {
    console.error(
      "Ошибка уведомления подрядчика о принятии предложения:",
      result.message
    );

    return {
      success: false,
      message:
        result.message,
      contractorUserId:
        bid.company_owner_id,
    };
  }

  return {
    success: true,

    message:
      result.duplicated
        ? "Уведомление уже было отправлено"
        : "Подрядчик уведомлён о принятии предложения",

    contractorUserId:
      bid.company_owner_id,

    notificationId:
      result.notificationId,

    duplicated:
      result.duplicated,
  };
}