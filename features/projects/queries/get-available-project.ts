import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from
  "@/lib/supabase/server";

export async function getAvailableProject(
  projectId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: company } = await supabase
    .from("contractor_companies")
    .select(`
      id,
      verification_status,
      accepts_new_projects
    `)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (
    !company ||
    company.verification_status !== "verified"
  ) {
    redirect("/contractor/company");
  }

  const { data: project, error } =
    await supabase
      .from("projects")
      .select(`
        id,
        category_id,
        title,
        description,
        property_type,
        region,
        city,
        address,
        budget_min,
        budget_max,
        desired_start_date,
        desired_end_date,
        status,
        published_at,
        service_categories (
          id,
          name
        )
      `)
      .eq("id", projectId)
      .in("status", [
        "published",
        "collecting_bids",
      ])
      .maybeSingle();

  if (error) {
    console.error(
      "Ошибка загрузки проекта:",
      error
    );

    throw new Error(
      "Не удалось загрузить проект"
    );
  }

  if (!project) {
    notFound();
  }

  const { data: existingBid } =
    await supabase
      .from("project_bids")
      .select(`
        id,
        price,
        duration_days,
        message,
        proposed_start_date,
        status,
        created_at,
        updated_at
      `)
      .eq("project_id", projectId)
      .eq("contractor_id", company.id)
      .maybeSingle();

  return {
    project,
    company,
    existingBid,
  };
}