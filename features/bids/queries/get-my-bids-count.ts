import { createClient } from "@/lib/supabase/server";

export async function getCustomerNewBidsCount() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("project_bids")
    .select(
      `
        id,
        projects!project_bids_project_id_fkey!inner (
          customer_id
        )
      `,
      {
        count: "exact",
        head: true,
      }
    )
    .eq("projects.customer_id", user.id)
    .eq("status", "submitted");

  if (error) {
    console.error(
      "Ошибка подсчёта новых предложений:",
      {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      }
    );

    return 0;
  }

  return count ?? 0;
}