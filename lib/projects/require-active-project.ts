import "server-only";

import { db } from
  "@/lib/db/pool";

export type ActiveProjectCheckResult =
  | {
      success: true;

      project: {
        id: string;
        title: string;
        status: string;
        customer_id: string;

        selected_contractor_id:
          string | null;

        is_admin_blocked:
          boolean;

        admin_block_reason:
          string | null;
      };
    }
  | {
      success: false;

      reason:
        | "not_found"
        | "blocked"
        | "error";

      message: string;
    };

type ActiveProjectRow = {
  id: string;
  title: string;
  status: string;
  customer_id: string;

  selected_contractor_id:
    string | null;

  is_admin_blocked:
    boolean;

  admin_block_reason:
    string | null;
};

export async function requireActiveProject(
  projectId: string
): Promise<ActiveProjectCheckResult> {
  try {
    const result =
      await db.query<ActiveProjectRow>(
        `
          SELECT
            id,
            title,
            status,
            customer_id,
            selected_contractor_id,
            is_admin_blocked,
            admin_block_reason

          FROM
            public.projects

          WHERE
            id = $1

          LIMIT 1
        `,
        [
          projectId,
        ]
      );

    const project =
      result.rows[0];

    if (!project) {
      return {
        success: false,
        reason:
          "not_found",
        message:
          "Проект не найден или у вас нет доступа",
      };
    }

    if (
      project.is_admin_blocked
    ) {
      return {
        success: false,
        reason:
          "blocked",

        message:
          project.admin_block_reason
            ? `Проект ограничен администрацией. Причина: ${project.admin_block_reason}`
            : "Проект ограничен администрацией",
      };
    }

    return {
      success: true,
      project,
    };
  } catch (error) {
    console.error(
      "Ошибка проверки административного статуса проекта:",
      {
        projectId,
        error,
      }
    );

    return {
      success: false,
      reason:
        "error",
      message:
        "Не удалось проверить состояние проекта",
    };
  }
}