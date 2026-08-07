"use server";

import { revalidatePath } from
  "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import { requireActiveUser } from
  "@/lib/auth/require-active-user";

import { requireActiveProject } from
  "@/lib/projects/require-active-project";

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
  const parsed =
    bidSchema.safeParse(
      input
    );

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

  const values =
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
  } = activeUser;

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

  const activeProject =
    await requireActiveProject(
      values.projectId
    );

  if (!activeProject.success) {
    return {
      success: false,
      message:
        activeProject.message,
    };
  }

  const project =
    activeProject.project;

  const supabase =
    await createClient();

  const {
    data: company,
    error: companyError,
  } = await supabase
    .from(
      "contractor_companies"
    )
    .select(`
      id,
      owner_id,
      public_name,
      verification_status,
      accepts_new_projects
    `)
    .eq(
      "owner_id",
      user.id
    )
    .maybeSingle();

  if (
    companyError ||
    !company
  ) {
    return {
      success: false,
      message:
        "Компания подрядчика не найдена",
    };
  }

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

  if (
    project.status !==
    "published"
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

  const {
    data: existingBid,
    error: existingBidError,
  } = await supabase
    .from(
      "project_bids"
    )
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
    return {
      success: false,
      message:
        "Не удалось проверить существующее предложение",
    };
  }

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
      values.message
        ?.trim() ||
      null,

    updated_at:
      new Date().toISOString(),
  };

  let savedBidId: string;
  let isNewBid =
    false;

  if (existingBid) {
    const {
      data: updatedBid,
      error,
    } = await supabase
      .from(
        "project_bids"
      )
      .update(
        bidPayload
      )
      .eq(
        "id",
        existingBid.id
      )
      .eq(
        "contractor_id",
        company.id
      )
      .select(
        "id"
      )
      .maybeSingle();

    if (
      error ||
      !updatedBid
    ) {
      return {
        success: false,
        message:
          error?.message ??
          "Не удалось обновить предложение",
      };
    }

    savedBidId =
      updatedBid.id;
  } else {
    const {
      data: createdBid,
      error,
    } = await supabase
      .from(
        "project_bids"
      )
      .insert({
        ...bidPayload,
        status:
          "submitted",
      })
      .select(
        "id"
      )
      .single();

    if (
      error ||
      !createdBid
    ) {
      if (
        error?.code ===
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
          error?.message ??
          "Не удалось отправить предложение",
      };
    }

    savedBidId =
      createdBid.id;

    isNewBid =
      true;
  }

  if (isNewBid) {
    const {
      error: eventError,
    } = await supabase
      .from(
        "project_events"
      )
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
    } catch (error) {
      console.error(
        "Ошибка уведомления о новом предложении:",
        error
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

  revalidatePath(
    "/customer",
    "layout"
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

  const personalName =
    [
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