import { createClient } from "@/lib/supabase/server";

export async function getMyContractorCompany() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: company, error } = await supabase
    .from("contractor_companies")
    .select(`
      *,
       verification_comment,
      contractor_services (
        category_id
      ),
      contractor_service_areas (
        city,
        region,
        travel_radius_km,
        is_primary
      )
    `)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Ошибка загрузки компании:",
      error
    );

    throw new Error(
      "Не удалось загрузить профиль подрядчика"
    );
  }

  return company;
}