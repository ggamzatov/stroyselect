"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type StartProjectWorkResult = {
  success: boolean;
  message: string;
};

export async function startProjectWork(
  projectId: string
): Promise<StartProjectWorkResult> {
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

  const { data: company, error: companyError } =
    await supabase
      .from("contractor_companies")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

  if (companyError || !company) {
    return {
      success: false,
      message:
        "Профиль подрядчика не найден",
    };
  }

  const now = new Date().toISOString();

  const { data: project, error } =
    await supabase
      .from("projects")
      .update({
        status: "in_progress",
        work_started_at: now,
        updated_at: now,
      })
      .eq("id", projectId)
      .eq(
        "selected_contractor_id",
        company.id
      )
      .eq(
        "status",
        "contractor_selected"
      )
      .select("id, status")
      .maybeSingle();

  if (error || !project) {
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

  revalidatePath("/contractor/dashboard");
  revalidatePath("/contractor/work");
  revalidatePath(
    `/contractor/work/${projectId}`
  );
  revalidatePath(
    `/customer/projects/${projectId}`
  );

  return {
    success: true,
    message:
      "Проект переведён в статус «В работе»",
  };
}