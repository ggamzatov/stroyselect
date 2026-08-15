"use server";

import { revalidatePath } from "next/cache";

import { db } from
  "@/lib/db/pool";

import {
  requireActiveUser,
} from "@/lib/auth/require-active-user";

export type DeleteProjectResult = {
  success: boolean;
  message: string;
};

type ProjectRow = {
  id: string;
  status: string;
};

export async function deleteProject(
  projectId: string
): Promise<DeleteProjectResult> {
  const auth =
    await requireActiveUser();

  if (!auth.success) {
    return {
      success: false,
      message:
        auth.message,
    };
  }

  if (
    auth.profile.role !==
    "customer"
  ) {
    return {
      success: false,
      message:
        "Удалять проекты может только заказчик",
    };
  }

  try {
    const projectResult =
      await db.query<ProjectRow>(
        `
          SELECT
            id,
            status

          FROM
            public.projects

          WHERE
            id = $1
            AND customer_id = $2

          LIMIT 1
        `,
        [
          projectId,
          auth.user.id,
        ]
      );

    const project =
      projectResult.rows[0];

    if (!project) {
      return {
        success: false,
        message:
          "Проект не найден",
      };
    }

    if (
      project.status !==
      "draft"
    ) {
      return {
        success: false,
        message:
          "Удалить можно только проект со статусом «Черновик»",
      };
    }

    const deleteResult =
      await db.query<{
        id: string;
      }>(
        `
          DELETE FROM
            public.projects

          WHERE
            id = $1
            AND customer_id = $2
            AND status = 'draft'

          RETURNING
            id
        `,
        [
          projectId,
          auth.user.id,
        ]
      );

    if (
      !deleteResult.rows[0]
    ) {
      return {
        success: false,
        message:
          "Не удалось удалить проект",
      };
    }

    revalidatePath(
      "/customer/dashboard"
    );

    revalidatePath(
      "/customer/projects"
    );

    return {
      success: true,
      message:
        "Черновик удалён",
    };
  } catch (error) {
    console.error(
      "Ошибка удаления проекта:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось удалить проект",
    };
  }
}