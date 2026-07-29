import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function getContractorReview(
  contractorId: string
) {
  const supabase = await createClient();

  const { data: company, error } = await supabase
    .from("contractor_companies")
    .select(`
      *,
      contractor_services (
        category_id,
        years_experience,
        is_primary,
        service_categories (
          id,
          name,
          slug
        )
      ),
      contractor_service_areas (
        id,
        city,
        region,
        travel_radius_km,
        is_primary
      )
    `)
    .eq("id", contractorId)
    .maybeSingle();

  if (error) {
    console.error(
      "Ошибка загрузки подрядчика:",
      error
    );

    throw new Error(
      "Не удалось загрузить профиль подрядчика"
    );
  }

  if (!company) {
    notFound();
  }

  const { data: owner } = await supabase
    .from("profiles")
    .select(`
      id,
      first_name,
      last_name,
      phone,
      city,
      created_at
    `)
    .eq("id", company.owner_id)
    .maybeSingle();

  const { data: logs, error: logsError } =
    await supabase
      .from("contractor_verification_logs")
      .select(`
        id,
        previous_status,
        new_status,
        comment,
        created_at,
        admin_id
      `)
      .eq("contractor_id", contractorId)
      .order("created_at", {
        ascending: false,
      });

  if (logsError) {
    console.error(
      "Ошибка загрузки журнала:",
      logsError
    );
  }

  return {
    company,
    owner,
    logs: logs ?? [],
  };
}