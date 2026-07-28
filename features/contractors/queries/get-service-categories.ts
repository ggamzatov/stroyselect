import { createClient } from "@/lib/supabase/server";

export async function getServiceCategories() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error(
      "Ошибка загрузки категорий:",
      error
    );

    throw new Error(
      "Не удалось загрузить категории услуг"
    );
  }

  return data;
}