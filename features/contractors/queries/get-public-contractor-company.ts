import { notFound } from "next/navigation";

import { createClient } from
  "@/lib/supabase/server";

const PORTFOLIO_BUCKET =
  "contractor-portfolio";

export async function getPublicContractorCompany(
  companyId: string
) {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    throw new Error(
      "Необходимо войти"
    );
  }

  const {
    data: company,
    error,
  } = await supabase
    .from(
      "contractor_companies"
    )
    .select(`
      id,
      public_name,
      legal_name,
      company_type,
      inn,
      ogrn,
      description,
      founded_year,
      employee_count,
      minimum_project_budget,
      maximum_project_budget,
      contact_phone,
      contact_email,
      website,
      telegram,
      rating,
      rating_count,
      verification_status,
      created_at,

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
        travel_radius_km,
        is_primary
      ),

      contractor_portfolio_projects (
        id,
        contractor_id,
        title,
        description,
        city,
        completed_year,
        created_at,

        contractor_portfolio_files (
          id,
          portfolio_project_id,
          uploaded_by,
          storage_bucket,
          storage_path,
          file_name,
          file_size,
          mime_type,
          sort_order,
          created_at
        )
      )
    `)
    .eq(
      "id",
      companyId
    )
    .maybeSingle();

  if (
    error ||
    !company
  ) {
    console.error(
      "Ошибка загрузки публичного профиля подрядчика:",
      error
    );

    notFound();
  }

  const portfolio =
    await Promise.all(
      (
        company
          .contractor_portfolio_projects ??
        []
      ).map(
        async (
          project
        ) => {
          const files =
            await Promise.all(
              (
                project
                  .contractor_portfolio_files ??
                []
              )
                .sort(
                  (
                    first,
                    second
                  ) =>
                    Number(
                      first.sort_order ??
                        0
                    ) -
                    Number(
                      second.sort_order ??
                        0
                    )
                )
                .map(
                  async (
                    file
                  ) => {
                    const bucket =
                      file.storage_bucket ||
                      PORTFOLIO_BUCKET;

                    const {
                      data:
                        signedData,
                    } =
                      await supabase.storage
                        .from(
                          bucket
                        )
                        .createSignedUrl(
                          file.storage_path,
                          60 * 60
                        );

                    return {
                      ...file,

                      signed_url:
                        signedData
                          ?.signedUrl ??
                        null,
                    };
                  }
                )
            );

          return {
            ...project,
            contractor_portfolio_files:
              files,
          };
        }
      )
    );

  return {
    ...company,

    contractor_portfolio_projects:
      portfolio,
  };
}