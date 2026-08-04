import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getMyProject(
  projectId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: project, error } =
    await supabase
      .from("projects")
      .select(`
        id,
        customer_id,
        category_id,
        title,
        description,
        property_type,
        region,
        city,
        address,
        latitude,
        longitude,
        budget_min,
        budget_max,
        desired_start_date,
        desired_end_date,
        status,
        published_at,
        created_at,
        updated_at,
        service_categories (
          id,
          name,
          slug
        )
      `)
      .eq("id", projectId)
      .eq("customer_id", user.id)
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

  return project;
}