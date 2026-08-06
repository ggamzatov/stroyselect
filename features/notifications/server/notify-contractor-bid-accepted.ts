import "server-only";

import { createAdminClient } from
  "@/lib/supabase/admin";

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

export async function notifyContractorBidAccepted({
  projectId,
  bidId,
  customerId,
}: NotifyContractorBidAcceptedInput): Promise<
  NotifyContractorBidAcceptedResult
> {
  const supabase =
    createAdminClient();

  /*
   * Загружаем проект и принятое предложение.
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
      price,
      duration_days,
      proposed_start_date,
      status,

      company:contractor_companies!project_bids_contractor_id_fkey (
        id,
        owner_id,
        public_name
      ),

      project:projects!project_bids_project_id_fkey (
        id,
        customer_id,
        title,
        city,
        status
      )
    `)
    .eq("id", bidId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (
    bidError ||
    !bid
  ) {
    console.error(
      "Ошибка загрузки принятого предложения для уведомления:",
      bidError
    );

    return {
      success: false,
      message:
        bidError?.message ??
        "Принятое предложение не найдено",
    };
  }

  const company =
    normalizeRelation(
      bid.company
    );

  const project =
    normalizeRelation(
      bid.project
    );

  if (!company) {
    return {
      success: false,
      message:
        "Компания подрядчика не найдена",
    };
  }

  if (!project) {
    return {
      success: false,
      message:
        "Проект не найден",
    };
  }

  /*
   * Дополнительная защита:
   * уведомление может отправить только
   * заказчик этого проекта.
   */
  if (
    project.customer_id !==
    customerId
  ) {
    return {
      success: false,
      message:
        "Заказчик не является владельцем проекта",
    };
  }

  if (!company.owner_id) {
    return {
      success: false,
      message:
        "Владелец компании подрядчика не найден",
    };
  }

  const result =
    await createNotification({
      userId:
        company.owner_id,

      actorId:
        customerId,

      notificationType:
        "bid_accepted",

      title:
        "Ваше предложение принято",

      body:
        `Заказчик выбрал вас подрядчиком по проекту «${project.title}»`,

      projectId:
        project.id,

      url:
        `/contractor/work/${project.id}`,

      deduplicationKey:
        `bid-accepted:${bid.id}:user:${company.owner_id}`,

      metadata: {
        bid_id:
          bid.id,

        project_title:
          project.title,

        contractor_company_id:
          company.id,

        contractor_company_name:
          company.public_name,

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
        company.owner_id,
    };
  }

  return {
    success: true,

    message:
      result.duplicated
        ? "Уведомление уже было отправлено"
        : "Подрядчик уведомлён о принятии предложения",

    contractorUserId:
      company.owner_id,

    notificationId:
      result.notificationId,

    duplicated:
      result.duplicated,
  };
}

type CompanyRelation = {
  id: string;
  owner_id: string;
  public_name: string | null;
};

type ProjectRelation = {
  id: string;
  customer_id: string;
  title: string;
  city: string | null;
  status: string;
};

function normalizeRelation<T>(
  value:
    | T
    | T[]
    | null
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}