"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  projectSchema,
  type ProjectInput,
} from "@/features/projects/schemas/project-schema";

export type SaveProjectResult = {
  success: boolean;
  message: string;
  projectId?: string;
};

export async function saveProject(
  input: ProjectInput,
  projectId?: string
): Promise<SaveProjectResult> {
  const parsed = projectSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Проверьте заполнение формы",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("role, is_blocked")
      .eq("id", user.id)
      .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "customer" ||
    profile.is_blocked
  ) {
    return {
      success: false,
      message:
        "Создавать проекты может только заказчик",
    };
  }

  const values = parsed.data;

  const payload = {
    customer_id: user.id,
    category_id: values.categoryId,
    title: values.title,
    description: values.description,
    property_type: values.propertyType,
    region: values.region,
    city: values.city,
    address: values.address || null,
    budget_min: values.budgetMin ?? null,
    budget_max: values.budgetMax ?? null,
    desired_start_date:
      values.desiredStartDate || null,
    desired_end_date:
      values.desiredEndDate || null,
    updated_at: new Date().toISOString(),
  };

  if (projectId) {
    const { data: existingProject } =
      await supabase
        .from("projects")
        .select("id, status")
        .eq("id", projectId)
        .eq("customer_id", user.id)
        .maybeSingle();

    if (!existingProject) {
      return {
        success: false,
        message: "Проект не найден",
      };
    }

    if (existingProject.status !== "draft") {
      return {
        success: false,
        message:
          "Редактировать можно только черновик",
      };
    }

    const { error } = await supabase
      .from("projects")
      .update(payload)
      .eq("id", projectId)
      .eq("customer_id", user.id);

    if (error) {
      console.error(
        "Ошибка обновления проекта:",
        error
      );

      return {
        success: false,
        message:
          "Не удалось обновить проект",
      };
    }

    revalidatePath("/customer/projects");
    revalidatePath(
      `/customer/projects/${projectId}/edit`
    );

    return {
      success: true,
      message: "Черновик обновлён",
      projectId,
    };
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      ...payload,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(
      "Ошибка создания проекта:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось создать проект",
    };
  }

  revalidatePath("/customer/projects");
  revalidatePath("/customer/dashboard");

  return {
    success: true,
    message: "Черновик проекта создан",
    projectId: data.id,
  };
}