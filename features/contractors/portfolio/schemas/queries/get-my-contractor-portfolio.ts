import { createClient } from
  "@/lib/supabase/server";

const PORTFOLIO_BUCKET =
  "contractor-portfolio";

export async function getMyContractorPortfolio() {
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
    return [];
  }

  const {
    data: company,
    error:
      companyError,
  } = await supabase
    .from(
      "contractor_companies"
    )
    .select(
      "id"
    )
    .eq(
      "owner_id",
      user.id
    )
    .maybeSingle();

  if (
    companyError ||
    !company
  ) {
    return [];
  }

  const {
    data: projects,
    error,
  } = await supabase
    .from(
      "contractor_portfolio_projects"
    )
    .select(`
      id,
      contractor_id,
      title,
      description,
      city,
      completed_year,
      created_at,
      updated_at,

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
    `)
    .eq(
      "contractor_id",
      company.id
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      }
    );

  if (error) {
    console.error(
      "Ошибка загрузки портфолио:",
      error
    );

    throw new Error(
      "Не удалось загрузить портфолио"
    );
  }

  if (!projects) {
    return [];
  }

  return Promise.all(
    projects.map(
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
}