import { createClient } from "@/lib/supabase/server";

export async function getAvailableProjectsCount() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
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
    company.verification_status !== "verified" ||
    !company.accepts_new_projects
  ) {
    return 0;
  }

  const { count, error } = await supabase
    .from("projects")
    .select("id", {
      count: "exact",
      head: true,
    })
    .in("status", [
      "published",
      "collecting_bids",
    ]);

  if (error) {
    console.error(
      "Ошибка подсчёта проектов:",
      error
    );

    return 0;
  }

  return count ?? 0;
}