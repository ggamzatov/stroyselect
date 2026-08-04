"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type DeleteProjectResult = {
  success: boolean;
  message: string;
};

export async function deleteProject(
  projectId: string
): Promise<DeleteProjectResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: "Необходимо войти в систему",
    };
  }

  const { data: project, error: projectError } =
    await supabase
      .from("projects")
      .select("id, customer_id, status")
      .eq("id", projectId)
      .eq("customer_id", user.id)
      .maybeSingle();

  if (projectError || !project) {
    return {
      success: false,
      message: "Проект не найден",
    };
  }

  if (project.status !== "draft") {
    return {
      success: false,
      message:
        "Удалить можно только проект со статусом «Черновик»",
    };
  }

  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("customer_id", user.id)
    .eq("status", "draft");

  if (deleteError) {
    console.error(
      "Ошибка удаления проекта:",
      deleteError
    );

    return {
      success: false,
      message: "Не удалось удалить проект",
    };
  }

  revalidatePath("/customer/dashboard");
  revalidatePath("/customer/projects");

  return {
    success: true,
    message: "Черновик удалён",
  };
}