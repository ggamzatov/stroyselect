"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

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

export async function updateBidStatus(
  input: CustomerBidDecisionInput
): Promise<UpdateBidStatusResult> {
  /*
   * 1. Проверяем входные данные.
   */
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

  /*
   * 2. Supabase.
   */
  const supabase =
    await createClient();

  /*
   * 3. Авторизация.
   */
  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      success: false,
      message:
        "Необходимо войти",
    };
  }

  const {
    bidId,
    decision,
  } = parsed.data;

  /*
   * 4. Загружаем предложение.
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
      status,
      price,
      duration_days
    `)
    .eq(
      "id",
      bidId
    )
    .maybeSingle();

  if (bidError) {
    console.error(
      "Ошибка загрузки предложения:",
      {
        message:
          bidError.message,

        details:
          bidError.details,

        hint:
          bidError.hint,

        code:
          bidError.code,
      }
    );

    return {
      success: false,

      message:
        "Не удалось загрузить предложение",
    };
  }

  if (!bid) {
    return {
      success: false,
      message:
        "Предложение не найдено",
    };
  }

  /*
   * 5. Проверяем, что проект
   * принадлежит текущему заказчику.
   */
  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .select(`
      id,
      title,
      customer_id,
      status,
      selected_contractor_id,
      selected_bid_id
    `)
    .eq(
      "id",
      bid.project_id
    )
    .eq(
      "customer_id",
      user.id
    )
    .maybeSingle();

  if (projectError) {
    console.error(
      "Ошибка загрузки проекта:",
      {
        message:
          projectError.message,

        details:
          projectError.details,

        hint:
          projectError.hint,

        code:
          projectError.code,
      }
    );

    return {
      success: false,
      message:
        "Не удалось проверить проект",
    };
  }

  if (!project) {
    return {
      success: false,

      message:
        "Проект не найден или у вас нет доступа",
    };
  }

  /*
   * 6. Изменять можно только
   * активные предложения.
   */
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
    return {
      success: false,

      message:
        "Статус этого предложения уже нельзя изменить",
    };
  }

  const now =
    new Date().toISOString();

  /*
   * ===================================
   * ПРИНЯТИЕ ПРЕДЛОЖЕНИЯ
   * ===================================
   */
  if (
    decision ===
    "accepted"
  ) {
    /*
     * Подрядчик уже выбран.
     */
    if (
      project.selected_contractor_id
    ) {
      return {
        success: false,

        message:
          "По этому проекту уже выбран подрядчик",
      };
    }

    const allowedProjectStatuses =
      [
        "published",
        "collecting_bids",
      ];

    if (
      !allowedProjectStatuses.includes(
        project.status
      )
    ) {
      return {
        success: false,

        message:
          "Текущий статус проекта не позволяет выбрать подрядчика",
      };
    }

    /*
     * 7. Назначаем подрядчика.
     */
    const {
      data: updatedProject,
      error: assignError,
    } = await supabase
      .from("projects")
      .update({
        status:
          "contractor_selected",

        selected_contractor_id:
          bid.contractor_id,

        selected_bid_id:
          bid.id,

        contractor_selected_at:
          now,

        updated_at:
          now,
      })
      .eq(
        "id",
        project.id
      )
      .eq(
        "customer_id",
        user.id
      )
      .is(
        "selected_contractor_id",
        null
      )
      .select(`
        id,
        status,
        selected_contractor_id
      `)
      .maybeSingle();

    if (
      assignError ||
      !updatedProject
    ) {
      console.error(
        "Ошибка назначения подрядчика:",
        {
          message:
            assignError?.message,

          details:
            assignError?.details,

          hint:
            assignError?.hint,

          code:
            assignError?.code,
        }
      );

      return {
        success: false,

        message:
          assignError?.message ??
          "Не удалось назначить подрядчика",
      };
    }

    /*
     * 8. Принимаем выбранное предложение.
     */
    const {
      error: acceptedBidError,
    } = await supabase
      .from("project_bids")
      .update({
        status:
          "accepted",

        updated_at:
          now,
      })
      .eq(
        "id",
        bid.id
      )
      .eq(
        "project_id",
        project.id
      );

    if (
      acceptedBidError
    ) {
      console.error(
        "Ошибка принятия предложения:",
        {
          message:
            acceptedBidError.message,

          details:
            acceptedBidError.details,

          hint:
            acceptedBidError.hint,

          code:
            acceptedBidError.code,
        }
      );

      return {
        success: false,

        message:
          "Подрядчик назначен, но не удалось обновить статус предложения",
      };
    }

    /*
     * 9. Отклоняем остальные
     * активные предложения.
     */
    const {
      error:
        rejectOthersError,
    } = await supabase
      .from("project_bids")
      .update({
        status:
          "rejected",

        updated_at:
          now,
      })
      .eq(
        "project_id",
        project.id
      )
      .neq(
        "id",
        bid.id
      )
      .in(
        "status",
        [
          "submitted",
          "viewed",
          "shortlisted",
        ]
      );

    if (
      rejectOthersError
    ) {
      console.error(
        "Ошибка отклонения остальных предложений:",
        {
          message:
            rejectOthersError.message,

          details:
            rejectOthersError.details,

          hint:
            rejectOthersError.hint,

          code:
            rejectOthersError.code,
        }
      );
    }

    /*
     * 10. История проекта.
     */
    const {
      error: eventError,
    } = await supabase
      .from("project_events")
      .insert({
        project_id:
          project.id,

        author_id:
          user.id,

        event_type:
          "contractor_selected",

        title:
          "Подрядчик выбран",

        description:
          "Заказчик принял предложение подрядчика",

        metadata: {
          bid_id:
            bid.id,

          contractor_id:
            bid.contractor_id,

          selected_at:
            now,

          price:
            bid.price,

          duration_days:
            bid.duration_days,
        },
      });

    if (eventError) {
      console.error(
        "Ошибка создания события выбора подрядчика:",
        {
          message:
            eventError.message,

          details:
            eventError.details,

          hint:
            eventError.hint,

          code:
            eventError.code,
        }
      );
    }

    /*
     * 11. Уведомляем выбранного
     * подрядчика.
     *
     * Эта функция у тебя уже была.
     */
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
    } catch (
      notificationError
    ) {
      console.error(
        "Непредвиденная ошибка уведомления выбранного подрядчика:",
        notificationError
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
   * ===================================
   * VIEWED / SHORTLISTED / REJECTED
   * ===================================
   */

  const {
    error: updateError,
  } = await supabase
    .from("project_bids")
    .update({
      status:
        decision,

      updated_at:
        now,
    })
    .eq(
      "id",
      bid.id
    )
    .eq(
      "project_id",
      project.id
    );

  if (updateError) {
    console.error(
      "Ошибка изменения статуса предложения:",
      {
        message:
          updateError.message,

        details:
          updateError.details,

        hint:
          updateError.hint,

        code:
          updateError.code,
      }
    );

    return {
      success: false,

      message:
        "Не удалось изменить статус предложения",
    };
  }

  /*
   * Если заказчик отклонил
   * конкретное предложение —
   * уведомляем подрядчика.
   */
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
    } catch (
      notificationError
    ) {
      console.error(
        "Непредвиденная ошибка уведомления об отклонении предложения:",
        notificationError
      );
    }

    /*
     * Добавляем событие
     * в историю проекта.
     */
    const {
      error: rejectEventError,
    } = await supabase
      .from("project_events")
      .insert({
        project_id:
          project.id,

        author_id:
          user.id,

        event_type:
          "bid_rejected",

        title:
          "Предложение отклонено",

        description:
          "Заказчик отклонил предложение подрядчика",

        metadata: {
          bid_id:
            bid.id,

          contractor_id:
            bid.contractor_id,

          rejected_at:
            now,
        },
      });

    if (
      rejectEventError
    ) {
      console.error(
        "Ошибка создания события отклонения предложения:",
        {
          message:
            rejectEventError.message,

          details:
            rejectEventError.details,

          hint:
            rejectEventError.hint,

          code:
            rejectEventError.code,
        }
      );
    }
  }

  /*
   * Для viewed и shortlisted
   * пока не создаём отдельные
   * уведомления подрядчику.
   *
   * Это специально, чтобы
   * не создавать лишний шум.
   */

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
}

function revalidateBidPaths(
  projectId: string
) {
  /*
   * Заказчик.
   */
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

  /*
   * Подрядчик.
   */
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

  /*
   * Header + колокольчик.
   */
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
  switch (
    decision
  ) {
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