"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function publishProject(
  projectId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Необходимо войти",
    };
  }

  const { data: project, error } =
    await supabase
      .from("projects")
      .select(`
        id,
        title,
        description,
        category_id,
        city,
        status
      `)
      .eq("id", projectId)
      .eq("customer_id", user.id)
      .maybeSingle();

  if (error || !project) {
    return {
      success: false,
      message: "Проект не найден",
    };
  }

  if (project.status !== "draft") {
    return {
      success: false,
      message:
        "Этот проект уже опубликован",
    };
  }

  if (
    !project.title ||
    !project.description ||
    !project.category_id ||
    !project.city
  ) {
    return {
      success: false,
      message:
        "Заполните обязательные поля",
    };
  }

  const { error: updateError } =
    await supabase
      .from("projects")
      .update({
        status: "published",
        published_at:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("customer_id", user.id)
      .eq("status", "draft");

  if (updateError) {
    console.error(
      "Ошибка публикации:",
      updateError
    );

    return {
      success: false,
      message:
        "Не удалось опубликовать проект",
    };
  }

  revalidatePath("/customer/dashboard");
  revalidatePath("/customer/projects");
  revalidatePath(
    `/customer/projects/${projectId}`
  );

  return {
    success: true,
    message:
      "Проект опубликован. Подрядчики смогут его увидеть.",
  };
}