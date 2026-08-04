import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function getAvailableProjects() {
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
      .select(`
        id,
        owner_id,
        public_name,
        verification_status,
        accepts_new_projects
      `)
      .eq("owner_id", user.id)
      .maybeSingle();

  console.log("Текущий пользователь:", user.id);
  console.log("Компания подрядчика:", company);
  console.log("Ошибка компании:", companyError);

  if (companyError || !company) {
    return {
      company: null,
      projects: [],
      debugMessage:
        "Компания подрядчика не найдена",
    };
  }

  if (
    company.verification_status !== "verified"
  ) {
    return {
      company,
      projects: [],
      debugMessage:
        `Статус подрядчика: ${company.verification_status}`,
    };
  }

  if (!company.accepts_new_projects) {
    return {
      company,
      projects: [],
      debugMessage:
        "Подрядчик не принимает новые проекты",
    };
  }

  const { data: projects, error: projectsError } =
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
  budget_min,
  budget_max,
  desired_start_date,
  desired_end_date,
  status,
  published_at,
  created_at,
  service_categories (
    id,
    name
  )
`)
      .in("status", [
        "published",
        "collecting_bids",
      ])
      .order("published_at", {
        ascending: false,
      });

  console.log(
    "Опубликованные проекты:",
    projects
  );

  console.log(
    "Ошибка загрузки проектов:",
    projectsError
  );

  if (projectsError) {
    return {
      company,
      projects: [],
      debugMessage:
        projectsError.message,
    };
  }

  return {
    company,
    projects: projects ?? [],
    debugMessage: null,
  };
}