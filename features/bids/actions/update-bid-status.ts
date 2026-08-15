"use server";

import { revalidatePath } from
  "next/cache";

import { db } from
  "@/lib/db/pool";

import { requireActiveUser } from
  "@/lib/auth/require-active-user";

import { requireActiveProject } from
  "@/lib/projects/require-active-project";

import {
  customerBidDecisionSchema,
  type CustomerBidDecisionInput,
} from
  "@/features/bids/schemas/customer-bid-decision-schema";

import {
  notifyContractorBidAccepted,
} from
  "@/features/notifications/server/notify-contractor-bid-accepted";

import {
  notifyContractorBidRejected,
} from
  "@/features/notifications/server/notify-contractor-bid-rejected";

export type UpdateBidStatusResult = {
  success: boolean;
  message: string;
};

type BidRow = {
  id: string;
  project_id: string;
  contractor_id: string;
  status: string;

  price:
    string | number;

  duration_days:
    number;
};

type ProjectRow = {
  id: string;
  title: string;
  customer_id: string;
  status: string;

  selected_contractor_id:
    string | null;

  selected_bid_id:
    string | null;

  is_admin_blocked:
    boolean;

  admin_block_reason:
    string | null;
};

export async function updateBidStatus(
  input: CustomerBidDecisionInput
): Promise<UpdateBidStatusResult> {
  const parsed =
    customerBidDecisionSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,

      message:
        parsed.error.issues[0]
          ?.message ??
        "Некорректное решение",
    };
  }

  const {
    bidId,
    decision,
  } =
    parsed.data;

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
  } =
    activeUser;

  if (
    profile.role !==
    "customer"
  ) {
    return {
      success: false,
      message:
        "Управлять предложениями может только заказчик",
    };
  }

  /*
   * Сначала определяем project_id
   * предложения.
   */
  let initialBid:
    BidRow |
    undefined;

  try {
    const result =
      await db.query<BidRow>(
        `
          SELECT
            id,
            project_id,
            contractor_id,
            status,
            price,
            duration_days

          FROM
            public.project_bids

          WHERE
            id = $1

          LIMIT 1
        `,
        [
          bidId,
        ]
      );

    initialBid =
      result.rows[0];
  } catch (error) {
    console.error(
      "Ошибка загрузки предложения:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось загрузить предложение",
    };
  }

  if (!initialBid) {
    return {
      success: false,
      message:
        "Предложение не найдено",
    };
  }

  const activeProject =
    await requireActiveProject(
      initialBid.project_id
    );

  if (!activeProject.success) {
    return {
      success: false,
      message:
        activeProject.message,
    };
  }

  const client =
    await db.connect();

  let projectId:
    string;

  try {
    await client.query(
      "BEGIN"
    );

    const bidResult =
      await client.query<BidRow>(
        `
          SELECT
            id,
            project_id,
            contractor_id,
            status,
            price,
            duration_days

          FROM
            public.project_bids

          WHERE
            id = $1

          LIMIT 1

          FOR UPDATE
        `,
        [
          bidId,
        ]
      );

    const bid =
      bidResult.rows[0];

    if (!bid) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Предложение не найдено",
      };
    }

    const projectResult =
      await client.query<ProjectRow>(
        `
          SELECT
            id,
            title,
            customer_id,
            status,
            selected_contractor_id,
            selected_bid_id,
            is_admin_blocked,
            admin_block_reason

          FROM
            public.projects

          WHERE
            id = $1
            AND customer_id = $2

          LIMIT 1

          FOR UPDATE
        `,
        [
          bid.project_id,
          user.id,
        ]
      );

    const project =
      projectResult.rows[0];

    if (!project) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Проект не найден или у вас нет доступа",
      };
    }

    projectId =
      project.id;

    if (
      activeProject.project.id !==
      project.id
    ) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Проект предложения не найден",
      };
    }

    if (
      project.is_admin_blocked
    ) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,

        message:
          project.admin_block_reason
            ? `Проект ограничен администрацией. Причина: ${project.admin_block_reason}`
            : "Проект ограничен администрацией",
      };
    }

    const editableStatuses =
      [
        "submitted",
        "viewed",
        "shortlisted",
      ];

    if (
      !editableStatuses.includes(
        bid.status
      )
    ) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,

        message:
          "Статус этого предложения уже нельзя изменить",
      };
    }

    /*
     * ========================================
     * ACCEPTED
     * ========================================
     */
    if (
      decision ===
      "accepted"
    ) {
      if (
        project.selected_contractor_id
      ) {
        await client.query(
          "ROLLBACK"
        );

        return {
          success: false,
          message:
            "По этому проекту уже выбран подрядчик",
        };
      }

      const allowedStatuses =
        [
          "published",
          "collecting_bids",
        ];

      if (
        !allowedStatuses.includes(
          project.status
        )
      ) {
        await client.query(
          "ROLLBACK"
        );

        return {
          success: false,
          message:
            "Текущий статус проекта не позволяет выбрать подрядчика",
        };
      }

      const projectUpdate =
        await client.query<{
          id: string;
        }>(
          `
            UPDATE
              public.projects

            SET
              status =
                'contractor_selected',

              selected_contractor_id =
                $1,

              selected_bid_id =
                $2,

              contractor_selected_at =
                now(),

              updated_at =
                now()

            WHERE
              id = $3

              AND customer_id =
                $4

              AND selected_contractor_id
                IS NULL

              AND is_admin_blocked =
                false

            RETURNING
              id
          `,
          [
            bid.contractor_id,
            bid.id,
            project.id,
            user.id,
          ]
        );

      if (
        !projectUpdate.rows[0]
      ) {
        throw new Error(
          "Не удалось назначить подрядчика"
        );
      }

      const acceptedUpdate =
        await client.query<{
          id: string;
        }>(
          `
            UPDATE
              public.project_bids

            SET
              status =
                'accepted',

              updated_at =
                now()

            WHERE
              id = $1

              AND project_id =
                $2

            RETURNING
              id
          `,
          [
            bid.id,
            project.id,
          ]
        );

      if (
        !acceptedUpdate.rows[0]
      ) {
        throw new Error(
          "Не удалось принять предложение"
        );
      }

      await client.query(
        `
          UPDATE
            public.project_bids

          SET
            status =
              'rejected',

            updated_at =
              now()

          WHERE
            project_id = $1

            AND id <> $2

            AND status IN (
              'submitted',
              'viewed',
              'shortlisted'
            )
        `,
        [
          project.id,
          bid.id,
        ]
      );

      await client.query(
        `
          INSERT INTO
            public.project_events (
              project_id,
              author_id,
              event_type,
              title,
              description,
              metadata
            )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6::jsonb
          )
        `,
        [
          project.id,

          user.id,

          "contractor_selected",

          "Подрядчик выбран",

          "Заказчик принял предложение подрядчика",

          JSON.stringify({
            bid_id:
              bid.id,

            contractor_id:
              bid.contractor_id,

            selected_at:
              new Date()
                .toISOString(),

            price:
              bid.price,

            duration_days:
              bid.duration_days,
          }),
        ]
      );

      await client.query(
        "COMMIT"
      );

      try {
        const notificationResult =
          await notifyContractorBidAccepted({
            projectId:
              project.id,

            bidId:
              bid.id,

            customerId:
              user.id,
          });

        if (
          !notificationResult.success
        ) {
          console.error(
            "Не удалось уведомить выбранного подрядчика:",
            notificationResult.message
          );
        }
      } catch (error) {
        console.error(
          "Непредвиденная ошибка уведомления выбранного подрядчика:",
          error
        );
      }

      revalidateBidPaths(
        project.id
      );

      return {
        success: true,
        message:
          "Предложение принято. Подрядчик назначен на проект.",
      };
    }

    /*
     * ========================================
     * VIEWED / SHORTLISTED / REJECTED
     * ========================================
     */

    const updateResult =
      await client.query<{
        id: string;
      }>(
        `
          UPDATE
            public.project_bids

          SET
            status = $1,
            updated_at = now()

          WHERE
            id = $2
            AND project_id = $3

          RETURNING
            id
        `,
        [
          decision,
          bid.id,
          project.id,
        ]
      );

    if (
      !updateResult.rows[0]
    ) {
      throw new Error(
        "Предложение не было обновлено"
      );
    }

    if (
      decision ===
      "rejected"
    ) {
      await client.query(
        `
          INSERT INTO
            public.project_events (
              project_id,
              author_id,
              event_type,
              title,
              description,
              metadata
            )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6::jsonb
          )
        `,
        [
          project.id,

          user.id,

          "bid_rejected",

          "Предложение отклонено",

          "Заказчик отклонил предложение подрядчика",

          JSON.stringify({
            bid_id:
              bid.id,

            contractor_id:
              bid.contractor_id,

            rejected_at:
              new Date()
                .toISOString(),
          }),
        ]
      );
    }

    await client.query(
      "COMMIT"
    );

    if (
      decision ===
      "rejected"
    ) {
      try {
        const notificationResult =
          await notifyContractorBidRejected({
            projectId:
              project.id,

            bidId:
              bid.id,

            customerId:
              user.id,
          });

        if (
          !notificationResult.success
        ) {
          console.error(
            "Не удалось уведомить подрядчика об отклонении:",
            notificationResult.message
          );
        }
      } catch (error) {
        console.error(
          "Непредвиденная ошибка уведомления об отклонении предложения:",
          error
        );
      }
    }

    revalidateBidPaths(
      project.id
    );

    return {
      success: true,
      message:
        getDecisionMessage(
          decision
        ),
    };
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    console.error(
      "Ошибка изменения статуса предложения:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось изменить статус предложения",
    };
  } finally {
    client.release();
  }
}

function revalidateBidPaths(
  projectId: string
) {
  revalidatePath(
    "/customer/dashboard"
  );

  revalidatePath(
    "/customer/bids"
  );

  revalidatePath(
    `/customer/projects/${projectId}`
  );

  revalidatePath(
    `/customer/work/${projectId}`
  );

  revalidatePath(
    "/customer/projects"
  );

  revalidatePath(
    "/contractor/dashboard"
  );

  revalidatePath(
    "/contractor/bids"
  );

  revalidatePath(
    "/contractor/work"
  );

  revalidatePath(
    `/contractor/projects/${projectId}`
  );

  revalidatePath(
    `/contractor/work/${projectId}`
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

function getDecisionMessage(
  decision:
    | "viewed"
    | "shortlisted"
    | "accepted"
    | "rejected"
) {
  switch (decision) {
    case "viewed":
      return (
        "Предложение отмечено как просмотренное"
      );

    case "shortlisted":
      return (
        "Подрядчик добавлен в короткий список"
      );

    case "accepted":
      return (
        "Предложение принято"
      );

    case "rejected":
      return (
        "Предложение отклонено"
      );
  }
}