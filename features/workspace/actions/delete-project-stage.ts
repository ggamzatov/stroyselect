"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

export type DeleteProjectStageResult = {
  success: boolean;
  message: string;
};

export async function deleteProjectStage(
  stageId: string,
  projectId: string
): Promise<DeleteProjectStageResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: "Необходимо войти",
    };
  }

  const { data: project } =
    await supabase
      .from("projects")
      .select(`
        id,
        customer_id,
        status
      `)
      .eq("id", projectId)
      .eq("customer_id", user.id)
      .maybeSingle();

  if (!project) {
    return {
      success: false,
      message:
        "Проект не найден или недоступен",
    };
  }

  const { data: stage, error: stageError } =
    await supabase
      .from("project_stages")
      .select(`
        id,
        title,
        status
      `)
      .eq("id", stageId)
      .eq("project_id", projectId)
      .maybeSingle();

  if (stageError || !stage) {
    return {
      success: false,
      message: "Этап не найден",
    };
  }

  if (
    stage.status !== "planned"
  ) {
    return {
      success: false,
      message:
        "Удалить можно только запланированный этап",
    };
  }

  const { error } = await supabase
    .from("project_stages")
    .delete()
    .eq("id", stageId)
    .eq("project_id", projectId);

  if (error) {
    console.error(
      "Ошибка удаления этапа:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось удалить этап",
    };
  }

  revalidatePath(
    `/customer/work/${projectId}`
  );

  revalidatePath(
    `/contractor/work/${projectId}`
  );

  return {
    success: true,
    message: "Этап удалён",
  };
}