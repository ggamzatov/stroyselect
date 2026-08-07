import { createClient } from
  "@/lib/supabase/server";

export type ActiveProjectCheckResult =
  | {
      success: true;

      project: {
        id: string;
        title: string;
        status: string;
        customer_id: string;
        selected_contractor_id:
          | string
          | null;
        is_admin_blocked: boolean;
        admin_block_reason:
          | string
          | null;
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

export async function requireActiveProject(
  projectId: string
): Promise<ActiveProjectCheckResult> {
  const supabase =
    await createClient();

  const {
    data: project,
    error,
  } = await supabase
    .from("projects")
    .select(`
      id,
      title,
      status,
      customer_id,
      selected_contractor_id,
      is_admin_blocked,
      admin_block_reason
    `)
    .eq(
      "id",
      projectId
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Ошибка проверки административного статуса проекта:",
      {
        projectId,

        message:
          error.message,

        details:
          error.details,

        hint:
          error.hint,

        code:
          error.code,
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
}