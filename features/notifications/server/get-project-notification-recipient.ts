import "server-only";

import { db } from
  "@/lib/db/pool";

type ProjectParticipantData = {
  recipientUserId: string;
  recipientRole:
    | "customer"
    | "contractor";
};

type ProjectRow = {
  customer_id: string;

  selected_contractor_id:
    string | null;

  contractor_owner_id:
    string | null;
};

export async function getProjectNotificationRecipient(
  projectId: string,
  actorUserId: string
): Promise<ProjectParticipantData | null> {
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

    const project =
      result.rows[0];

    if (!project) {
      console.error(
        "Проект для уведомления не найден:",
        {
          projectId,
        }
      );

      return null;
    }

    /*
     * Событие создал подрядчик.
     * Получатель — заказчик.
     */
    if (
      actorUserId !==
      project.customer_id
    ) {
      /*
       * Дополнительная защита:
       * пользователь должен быть
       * именно выбранным подрядчиком.
       */
      if (
        !project.contractor_owner_id ||
        actorUserId !==
          project.contractor_owner_id
      ) {
        return null;
      }

      return {
        recipientUserId:
          project.customer_id,

        recipientRole:
          "customer",
      };
    }

    /*
     * Событие создал заказчик.
     * Получатель — выбранный подрядчик.
     */
    if (
      !project.selected_contractor_id ||
      !project.contractor_owner_id
    ) {
      return null;
    }

    if (
      project.contractor_owner_id ===
      actorUserId
    ) {
      return null;
    }

    return {
      recipientUserId:
        project.contractor_owner_id,

      recipientRole:
        "contractor",
    };
  } catch (error) {
    console.error(
      "Ошибка поиска участника проекта для уведомления:",
      {
        projectId,
        actorUserId,
        error,
      }
    );

    return null;
  }
}