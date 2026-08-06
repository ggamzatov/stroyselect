import "server-only";

import { createClient } from
  "@/lib/supabase/server";

type ProjectParticipantData = {
  recipientUserId: string;
  recipientRole:
    | "customer"
    | "contractor";
};

export async function getProjectNotificationRecipient(
  projectId: string,
  actorUserId: string
): Promise<ProjectParticipantData | null> {
  const supabase =
    await createClient();

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
    .eq("id", projectId)
    .maybeSingle();

  if (
    projectError ||
    !project
  ) {
    console.error(
      "Ошибка поиска проекта для уведомления:",
      projectError
    );

    return null;
  }

  /*
   * Сообщение отправил подрядчик.
   * Получатель — заказчик.
   */
  if (
    actorUserId !==
    project.customer_id
  ) {
    return {
      recipientUserId:
        project.customer_id,

      recipientRole:
        "customer",
    };
  }

  /*
   * Сообщение отправил заказчик.
   * Нужно найти владельца выбранной
   * компании подрядчика.
   */
  if (
    !project.selected_contractor_id
  ) {
    return null;
  }

  const {
    data: company,
    error: companyError,
  } = await supabase
    .from("contractor_companies")
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
    companyError ||
    !company
  ) {
    console.error(
      "Ошибка поиска подрядчика для уведомления:",
      companyError
    );

    return null;
  }

  if (
    company.owner_id ===
    actorUserId
  ) {
    return null;
  }

  return {
    recipientUserId:
      company.owner_id,

    recipientRole:
      "contractor",
  };
}