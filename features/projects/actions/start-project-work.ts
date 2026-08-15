"use server";

import { revalidatePath } from
  "next/cache";

import { db } from
  "@/lib/db/pool";

import { requireActiveUser } from
  "@/lib/auth/require-active-user";

export type StartProjectWorkResult = {
  success: boolean;
  message: string;
};

type CompanyRow = {
  id: string;
};

export async function startProjectWork(
  projectId: string
): Promise<StartProjectWorkResult> {
  const activeUser =
    await requireActiveUser();

  if (!activeUser.success) {
    return {
      success: false,
      message:
        activeUser.message,
    };
  }

  if (
    activeUser.profile.role !==
    "contractor"
  ) {
    return {
      success: false,
      message:
        "Начать работы может только подрядчик",
    };
  }

  try {
    const companyResult =
      await db.query<CompanyRow>(
        `
          SELECT
            id

          FROM
            public.contractor_companies

          WHERE
            owner_id = $1

          LIMIT 1
        `,
        [
          activeUser.user.id,
        ]
      );

    const company =
      companyResult.rows[0];

    if (!company) {
      return {
        success: false,
        message:
          "Профиль подрядчика не найден",
      };
    }

    const result =
      await db.query<{
        id: string;
        status: string;
      }>(
        `
          UPDATE
            public.projects

          SET
            status =
              'in_progress',

            work_started_at =
              now(),

            updated_at =
              now()

          WHERE
            id = $1

            AND selected_contractor_id =
              $2

            AND status =
              'contractor_selected'

            AND is_admin_blocked =
              false

          RETURNING
            id,
            status
        `,
        [
          projectId,
          company.id,
        ]
      );

    const project =
      result.rows[0];

    if (!project) {
      return {
        success: false,
        message:
          "Не удалось начать работы по проекту",
      };
    }

    revalidatePath(
      "/contractor/dashboard"
    );

    revalidatePath(
      "/contractor/work"
    );

    revalidatePath(
      `/contractor/work/${projectId}`
    );

    revalidatePath(
      `/customer/projects/${projectId}`
    );

    revalidatePath(
      `/customer/work/${projectId}`
    );

    revalidatePath(
      "/customer/dashboard"
    );

    return {
      success: true,

      message:
        "Проект переведён в статус «В работе»",
    };
  } catch (error) {
    console.error(
      "Ошибка начала работ:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось начать работы по проекту",
    };
  }
}