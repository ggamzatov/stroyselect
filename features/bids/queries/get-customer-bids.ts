import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function getCustomerBids() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: bids, error } = await supabase
  .from("project_bids")
  .select(`
    id,
    project_id,
    contractor_id,
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
      customer_id,
      status
    ),

    contractor_companies!project_bids_contractor_id_fkey (
      id,
      public_name,
      legal_name,
      company_type,
      rating,
      rating_count,
      verification_status,
      contact_phone,
      contact_email
    )
  `)
  .eq("projects.customer_id", user.id)
  .order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error(
      "Ошибка загрузки предложений заказчика:",
      error
    );

    throw new Error(
      "Не удалось загрузить предложения"
    );
  }

  return bids ?? [];
}