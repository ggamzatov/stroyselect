import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function getAssignedProjects() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: company, error: companyError } =
    await supabase
      .from("contractor_companies")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

  if (companyError) {
    console.error(
      "Ошибка загрузки компании:",
      companyError
    );

    throw new Error(
      "Не удалось загрузить компанию"
    );
  }

  if (!company) {
    return [];
  }

  const { data: projects, error } =
    await supabase
      .from("projects")
      .select(`
        id,
        title,
        description,
        city,
        address,
        status,
        budget_min,
        budget_max,
        desired_start_date,
        desired_end_date,
        contractor_selected_at,
        work_started_at,
        completed_at,
        selected_bid_id,
        service_categories (
          id,
          name
        ),
        project_bids!projects_selected_bid_id_fkey (
          id,
          price,
          duration_days,
          proposed_start_date,
          status
        )
      `)
      .eq(
        "selected_contractor_id",
        company.id
      )
      .in("status", [
        "contractor_selected",
        "in_progress",
        "completed",
        "disputed",
      ])
      .order("contractor_selected_at", {
        ascending: false,
      });

  if (error) {
    console.error(
      "Ошибка загрузки назначенных проектов:",
      error
    );

    throw new Error(
      "Не удалось загрузить назначенные проекты"
    );
  }

  return projects ?? [];
}