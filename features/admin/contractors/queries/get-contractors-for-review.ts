import { createClient } from "@/lib/supabase/server";

export type ContractorReviewFilter =
  | "pending"
  | "verified"
  | "rejected"
  | "suspended"
  | "all";

export async function getContractorsForReview(
  filter: ContractorReviewFilter = "pending"
) {
  const supabase = await createClient();

  let query = supabase
    .from("contractor_companies")
    .select(`
      id,
      owner_id,
      public_name,
      legal_name,
      company_type,
      inn,
      ogrn,
      contact_phone,
      verification_status,
      verification_comment,
      created_at,
      updated_at,
      profiles!contractor_companies_owner_id_fkey (
        first_name,
        last_name,
        phone
      ),
      contractor_services (
        category_id,
        service_categories (
          id,
          name
        )
      ),
      contractor_service_areas (
        city,
        region,
        is_primary
      )
    `)
    .order("updated_at", {
      ascending: false,
    });

  if (filter !== "all") {
    query = query.eq(
      "verification_status",
      filter
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "Ошибка загрузки подрядчиков:",
      error
    );

    throw new Error(
      "Не удалось загрузить подрядчиков"
    );
  }

  return data;
}