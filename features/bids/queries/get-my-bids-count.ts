import { createClient } from "@/lib/supabase/server";

export async function getMyBidsCount(): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return 0;
  }

  const { data: company, error: companyError } =
    await supabase
      .from("contractor_companies")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

  if (companyError || !company) {
    console.error(
      "Ошибка загрузки компании для подсчёта предложений:",
      companyError
    );

    return 0;
  }

  const { count, error } = await supabase
    .from("project_bids")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("contractor_id", company.id);

  if (error) {
    console.error(
      "Ошибка подсчёта предложений подрядчика:",
      error
    );

    return 0;
  }

  return count ?? 0;
}