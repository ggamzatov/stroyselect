import { createClient } from "@/lib/supabase/server";

export async function getMyProjects() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from("projects")
    .select(`
      id,
      title,
      description,
      city,
      budget_min,
      budget_max,
      status,
      published_at,
      created_at,
      updated_at,
      service_categories (
        id,
        name
      )
    `)
    .eq("customer_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Ошибка загрузки проектов:",
      error
    );

    throw new Error(
      "Не удалось загрузить проекты"
    );
  }

  return data ?? [];
}