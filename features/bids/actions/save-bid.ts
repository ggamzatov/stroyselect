"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import {
  bidSchema,
  type BidInput,
} from
  "@/features/bids/schemas/bid-schema";

import { createNotification } from
  "@/features/notifications/server/create-notification";

export type SaveBidResult = {
  success: boolean;
  message: string;
  bidId?: string;
};

export async function saveBid(
  input: BidInput
): Promise<SaveBidResult> {
  /*
   * Проверяем входные данные через Zod.
   */
  const parsed =
    bidSchema.safeParse(input);

  if (!parsed.success) {
    console.error(
      "Ошибка валидации отклика:",
      parsed.error.flatten()
    );

    return {
      success: false,
      message:
        parsed.error.issues[0]
          ?.message ??
        "Проверьте предложение",
    };
  }

  const supabase =
    await createClient();

  /*
   * Проверяем авторизацию.
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
      message: "Необходимо войти",
    };
  }

  const values = parsed.data;

  /*
   * Загружаем профиль пользователя
   * и проверяем его роль.
   */
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      first_name,
      last_name
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    console.error(
      "Ошибка загрузки профиля подрядчика:",
      profileError
    );

    return {
      success: false,
      message:
        "Профиль пользователя не найден",
    };
  }

  if (
    profile.role !==
    "contractor"
  ) {
    return {
      success: false,
      message:
        "Оставлять предложения могут только подрядчики",
    };
  }

  /*
   * Находим компанию текущего
   * подрядчика.
   */
  const {
    data: company,
    error: companyError,
  } = await supabase
    .from("contractor_companies")
    .select(`
      id,
      owner_id,
      public_name,
      verification_status,
      accepts_new_projects
    `)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (
    companyError ||
    !company
  ) {
    console.error(
      "Ошибка загрузки компании подрядчика:",
      companyError
    );

    return {
      success: false,
      message:
        "Компания подрядчика не найдена",
    };
  }

  /*
   * Непроверенная компания
   * не может отправлять отклики.
   */
  if (
    company.verification_status !==
    "verified"
  ) {
    return {
      success: false,
      message:
        "Компания должна пройти проверку администратора",
    };
  }

  if (
    !company.accepts_new_projects
  ) {
    return {
      success: false,
      message:
        "В профиле компании отключён приём новых проектов",
    };
  }

  /*
   * Проверяем проект.
   */
  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .select(`
      id,
      customer_id,
      title,
      status,
      city,
      budget_min,
      budget_max,
      selected_contractor_id
    `)
    .eq(
      "id",
      values.projectId
    )
    .maybeSingle();

  if (
    projectError ||
    !project
  ) {
    console.error(
      "Ошибка загрузки проекта для отклика:",
      projectError
    );

    return {
      success: false,
      message:
        "Проект не найден или недоступен",
    };
  }

  /*
   * Подрядчик не может откликаться
   * на собственный проект.
   */
  if (
    project.customer_id ===
    user.id
  ) {
    return {
      success: false,
      message:
        "Нельзя оставить предложение на собственный проект",
    };
  }

  /*
   * Отклики принимаются только
   * на опубликованные проекты.
   */
  if (
    project.status !== "published"
  ) {
    return {
      success: false,
      message:
        "На этот проект больше нельзя оставить предложение",
    };
  }

  if (
    project.selected_contractor_id
  ) {
    return {
      success: false,
      message:
        "Для проекта уже выбран подрядчик",
    };
  }

  /*
   * Проверяем, существует ли уже
   * отклик этой компании на проект.
   */
  const {
    data: existingBid,
    error: existingBidError,
  } = await supabase
    .from("project_bids")
    .select(`
      id,
      status,
      created_at
    `)
    .eq(
      "project_id",
      values.projectId
    )
    .eq(
      "contractor_id",
      company.id
    )
    .maybeSingle();

  if (existingBidError) {
    console.error(
      "Ошибка проверки существующего предложения:",
      existingBidError
    );

    return {
      success: false,
      message:
        "Не удалось проверить существующее предложение",
    };
  }

  /*
   * Нельзя редактировать уже принятое
   * или отклонённое предложение.
   */
  if (
    existingBid &&
    [
      "accepted",
      "rejected",
      "withdrawn",
    ].includes(
      existingBid.status
    )
  ) {
    return {
      success: false,
      message:
        "Это предложение уже нельзя изменить",
    };
  }

  const bidPayload = {
    project_id:
      values.projectId,

    contractor_id:
      company.id,

    price:
      values.price,

    duration_days:
      values.durationDays,

    proposed_start_date:
      values.proposedStartDate ||
      null,

    message:
      values.message?.trim() ||
      null,

    updated_at:
      new Date().toISOString(),
  };

  let savedBidId: string;
  let isNewBid = false;

  /*
   * Если отклик уже есть —
   * обновляем его.
   */
  if (existingBid) {
    const {
      data: updatedBid,
      error: updateError,
    } = await supabase
      .from("project_bids")
      .update(bidPayload)
      .eq(
        "id",
        existingBid.id
      )
      .eq(
        "contractor_id",
        company.id
      )
      .select("id")
      .maybeSingle();

    if (
      updateError ||
      !updatedBid
    ) {
      console.error(
        "Ошибка обновления предложения:",
        updateError
      );

      return {
        success: false,
        message:
          updateError?.message ??
          "Не удалось обновить предложение",
      };
    }

    savedBidId =
      updatedBid.id;
  } else {
    /*
     * Если отклика ещё нет —
     * создаём новый.
     */
    const {
  data: createdBid,
  error: insertError,
} = await supabase
  .from("project_bids")
  .insert({
    ...bidPayload,

    status: "submitted",
  })
  .select("id")
  .single();

    if (
      insertError ||
      !createdBid
    ) {
      console.error(
        "Ошибка создания предложения:",
        insertError
      );

      /*
       * Обрабатываем возможное
       * ограничение уникальности.
       */
      if (
        insertError?.code ===
        "23505"
      ) {
        return {
          success: false,
          message:
            "Вы уже оставили предложение на этот проект",
        };
      }

      return {
        success: false,
        message:
          insertError?.message ??
          "Не удалось отправить предложение",
      };
    }

    savedBidId =
      createdBid.id;

    isNewBid = true;
  }

  /*
   * Создаём событие проекта.
   * Ошибка события не должна отменять
   * сохранённое предложение.
   */
  if (isNewBid) {
    const {
      error: eventError,
    } = await supabase
      .from("project_events")
      .insert({
        project_id:
          values.projectId,

        author_id:
          user.id,

        event_type:
          "bid_created",

        title:
          "Получено новое предложение",

        description:
          company.public_name
            ? `${company.public_name} оставил предложение`
            : "Подрядчик оставил предложение",

        metadata: {
          bid_id:
            savedBidId,

          contractor_id:
            company.id,

          price:
            values.price,

          duration_days:
            values.durationDays,
        },
      });

    if (eventError) {
      console.error(
        "Ошибка создания события нового предложения:",
        eventError
      );
    }
  }

  /*
   * Создаём уведомление заказчику.
   *
   * Только при первом создании отклика.
   * При обычном редактировании новый
   * красный счётчик не появляется.
   */
  if (isNewBid) {
    try {
      const contractorName =
        getContractorDisplayName({
          publicName:
            company.public_name,

          firstName:
            profile.first_name,

          lastName:
            profile.last_name,
        });

      const notificationResult =
        await createNotification({
          userId:
            project.customer_id,

          actorId:
            user.id,

          notificationType:
            "new_bid",

          title:
            "Новое предложение",

          body:
            `${contractorName} оставил предложение по проекту «${project.title}»`,

          projectId:
            values.projectId,

          url:
            `/customer/projects/${values.projectId}`,

          metadata: {
            bid_id:
              savedBidId,

            contractor_id:
              company.id,

            contractor_name:
              contractorName,

            project_title:
              project.title,

            price:
              values.price,

            duration_days:
              values.durationDays,

            proposed_start_date:
              values.proposedStartDate ||
              null,
          },
        });

      if (
        !notificationResult.success
      ) {
        console.error(
          "Не удалось создать уведомление о новом предложении:",
          notificationResult.message
        );
      }
    } catch (
      notificationError
    ) {
      /*
       * Отклик уже сохранён, поэтому
       * ошибка уведомления не должна
       * возвращать ошибку подрядчику.
       */
      console.error(
        "Непредвиденная ошибка уведомления о предложении:",
        notificationError
      );
    }
  }

  revalidateBidPages(
    values.projectId
  );

  return {
    success: true,

    message:
      existingBid
        ? "Предложение обновлено"
        : "Предложение отправлено",

    bidId:
      savedBidId,
  };
}

function revalidateBidPages(
  projectId: string
) {
  revalidatePath(
    `/contractor/projects/${projectId}`
  );

  revalidatePath(
    "/contractor/projects"
  );

  revalidatePath(
    "/contractor/bids"
  );

  revalidatePath(
    "/contractor/dashboard"
  );

  revalidatePath(
    `/customer/projects/${projectId}`
  );

  revalidatePath(
    "/customer/projects"
  );

  revalidatePath(
    "/customer/bids"
  );

  revalidatePath(
    "/customer/dashboard"
  );
}

function getContractorDisplayName({
  publicName,
  firstName,
  lastName,
}: {
  publicName:
    | string
    | null;

  firstName:
    | string
    | null;

  lastName:
    | string
    | null;
}) {
  const normalizedPublicName =
    publicName?.trim();

  if (normalizedPublicName) {
    return normalizedPublicName;
  }

  const personalName = [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    personalName ||
    "Подрядчик"
  );
}