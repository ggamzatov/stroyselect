import { createClient } from
  "@/lib/supabase/server";

import { createNotification } from
  "@/features/notifications/server/create-notification";

type Input = {
  projectId: string;
  bidId: string;
  customerId: string;
};

export async function notifyContractorBidRejected({
  projectId,
  bidId,
  customerId,
}: Input) {
  const supabase =
    await createClient();

  /*
   * Получаем предложение,
   * подрядчика и проект.
   */
  const {
    data: bid,
    error: bidError,
  } = await supabase
    .from("project_bids")
    .select(`
      id,
      project_id,
      contractor_id,

      contractor_companies!project_bids_contractor_id_fkey (
        id,
        owner_id,
        public_name
      ),

      projects!project_bids_project_id_fkey (
        id,
        title,
        customer_id
      )
    `)
    .eq(
      "id",
      bidId
    )
    .eq(
      "project_id",
      projectId
    )
    .maybeSingle();

  if (
    bidError ||
    !bid
  ) {
    console.error(
      "Ошибка загрузки предложения для уведомления об отклонении:",
      {
        message:
          bidError?.message,

        details:
          bidError?.details,

        hint:
          bidError?.hint,

        code:
          bidError?.code,
      }
    );

    return {
      success: false,
      message:
        "Не удалось определить подрядчика",
    };
  }

  const project =
    getSingleRelation(
      bid.projects
    );

  if (!project) {
    return {
      success: false,
      message:
        "Проект не найден",
    };
  }

  /*
   * Дополнительная защита:
   * уведомление может отправлять
   * только заказчик проекта.
   */
  if (
    project.customer_id !==
    customerId
  ) {
    return {
      success: false,
      message:
        "Нет доступа к проекту",
    };
  }

  const company =
    getSingleRelation(
      bid.contractor_companies
    );

  if (
    !company ||
    !company.owner_id
  ) {
    return {
      success: false,
      message:
        "Владелец компании подрядчика не найден",
    };
  }

  /*
   * Защита от уведомления
   * самому себе.
   */
  if (
    company.owner_id ===
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
        company.owner_id,

      actorId:
        customerId,

      notificationType:
        "bid_rejected",

      title:
        "Предложение отклонено",

      body:
        `Заказчик отклонил ваше предложение по проекту «${project.title}».`,

      projectId,

      url:
        `/contractor/projects/${projectId}`,

      metadata: {
        bid_id:
          bid.id,

        contractor_id:
          bid.contractor_id,

        project_title:
          project.title,
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
      "Подрядчик уведомлён",
  };
}

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
): T | null {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value;
}