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

export type UpdateBidStatusResult = {
  success: boolean;
  message: string;
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

  const supabase =
    await createClient();

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
   * Загружаем предложение.
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
      status
    `)
    .eq("id", bidId)
    .maybeSingle();

  if (bidError) {
    console.error(
      "Ошибка загрузки предложения:",
      bidError
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
   * Проверяем, что проект принадлежит
   * текущему заказчику.
   */
  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .select(`
      id,
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
      projectError
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

  const editableStatuses = [
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
   * Принятие предложения.
   */
  if (
    decision === "accepted"
  ) {
    if (
      project.selected_contractor_id
    ) {
      return {
        success: false,
        message:
          "По этому проекту уже выбран подрядчик",
      };
    }

    const allowedProjectStatuses = [
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
     * Назначаем подрядчика проекту.
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
        assignError
      );

      return {
        success: false,
        message:
          assignError?.message ??
          "Не удалось назначить подрядчика",
      };
    }

    /*
     * Принимаем выбранное предложение.
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

    if (acceptedBidError) {
      console.error(
        "Ошибка принятия предложения:",
        acceptedBidError
      );

      return {
        success: false,
        message:
          "Подрядчик назначен, но не удалось обновить статус предложения",
      };
    }

    /*
     * Отклоняем остальные активные предложения.
     */
    const {
      error: rejectOthersError,
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

    if (rejectOthersError) {
      console.error(
        "Ошибка отклонения остальных предложений:",
        rejectOthersError
      );
    }

    /*
     * Создаём событие проекта.
     *
     * Ошибка события не отменяет
     * уже выполненный выбор подрядчика.
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
        },
      });

    if (eventError) {
      console.error(
        "Ошибка создания события выбора подрядчика:",
        eventError
      );
    }

    /*
     * Уведомляем выбранного подрядчика.
     *
     * Ошибка уведомления не должна
     * отменять уже выполненный выбор.
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

      console.log(
        "Результат уведомления выбранного подрядчика:",
        notificationResult
      );

      if (
        !notificationResult.success
      ) {
        console.error(
          "Не удалось уведомить подрядчика:",
          notificationResult.message
        );
      }
    } catch (
      notificationError
    ) {
      console.error(
        "Непредвиденная ошибка уведомления подрядчика:",
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
   * Обычная смена статуса:
   * viewed, shortlisted или rejected.
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
      updateError
    );

    return {
      success: false,
      message:
        "Не удалось изменить статус предложения",
    };
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