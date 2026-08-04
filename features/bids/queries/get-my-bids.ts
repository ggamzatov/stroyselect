import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function getMyBids() {
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
      "Не удалось загрузить профиль подрядчика"
    );
  }

  if (!company) {
    return [];
  }

  const { data: bids, error } = await supabase
    .from("project_bids")
    .select(`
      id,
      project_id,
      price,
      duration_days,
      message,
      proposed_start_date,
      status,
      created_at,
      updated_at,

      projects!project_bids_project_id_fkey (
        id,
        title,
        city,
        status,
        budget_min,
        budget_max
      )
    `)
    .eq("contractor_id", company.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Ошибка загрузки предложений:",
      {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      }
    );

    throw new Error(
      `Не удалось загрузить предложения: ${error.message}`
    );
  }

  return bids ?? [];
}