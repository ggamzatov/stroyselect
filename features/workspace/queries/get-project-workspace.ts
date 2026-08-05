import { redirect } from "next/navigation";

import { createClient } from
  "@/lib/supabase/server";

export async function getProjectWorkspace(
  projectId: string
) {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  /*
   * Получаем профиль текущего пользователя.
   */
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      first_name,
      last_name
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    console.error(
      "Ошибка загрузки профиля:",
      profileError
    );

    throw new Error(
      "Не удалось загрузить профиль пользователя"
    );
  }

  /*
   * Получаем основной проект.
   */
    const {
      data: project,
      error: projectError,
    } = await supabase
      .from("projects")
      .select(`
        id,
        customer_id,
        selected_contractor_id,
        category_id,
        title,
        description,
        property_type,
        region,
        city,
        address,
        budget_min,
        budget_max,
        desired_start_date,
        desired_end_date,
        status,
        published_at,
        contractor_selected_at,
        work_started_at,
        completed_at,
        created_at,
        updated_at
      `)
      .eq("id", projectId)
      .maybeSingle();

  if (
    projectError ||
    !project
  ) {
    console.error(
      "Ошибка загрузки проекта:",
      projectError
    );

    throw new Error(
      "Проект не найден"
    );
  }

  /*
   * Проверяем доступ заказчика.
   */
  if (
    profile.role === "customer" &&
    project.customer_id !== user.id
  ) {
    redirect("/customer/dashboard");
  }

  /*
   * Для подрядчика получаем его компанию
   * и проверяем, что именно она выбрана
   * для этого проекта.
   */
  let currentContractorCompany:
    | {
        id: string;
      }
    | null = null;

  if (
    profile.role === "contractor"
  ) {
    const {
      data: company,
      error: companyError,
    } = await supabase
      .from("contractor_companies")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (
      companyError ||
      !company
    ) {
      console.error(
        "Ошибка загрузки компании подрядчика:",
        companyError
      );

      redirect(
        "/contractor/dashboard"
      );
    }

    currentContractorCompany =
      company;

    if (
      project.selected_contractor_id !==
      company.id
    ) {
      redirect(
        "/contractor/dashboard"
      );
    }
  }

  /*
   * Администратор может просматривать
   * рабочее пространство.
   */
  if (
    ![
      "customer",
      "contractor",
      "admin",
    ].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  /*
   * Все запросы расположены строго
   * в том же порядке, что и переменные
   * результата слева.
   */
  const [
    customerResult,
    contractorResult,
    selectedBidResult,
    stagesResult,
    eventsResult,
    filesResult,
  ] = await Promise.all([
    /*
     * 1. Заказчик.
     */
    supabase
      .from("profiles")
      .select(`
        id,
        first_name,
        last_name,
        phone,
        city
      `)
      .eq(
        "id",
        project.customer_id
      )
      .maybeSingle(),

    /*
     * 2. Выбранный подрядчик.
     */
    project.selected_contractor_id
      ? supabase
          .from(
            "contractor_companies"
          )
          .select(`
            id,
            owner_id,
            public_name,
            legal_name,
            company_type,
            rating,
            rating_count,
            verification_status,
            contact_phone,
            contact_email
          `)
          .eq(
            "id",
            project.selected_contractor_id
          )
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),

    /*
     * 3. Принятое предложение.
     */
    project.selected_contractor_id
      ? supabase
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
            updated_at
          `)
          .eq(
            "project_id",
            projectId
          )
          .eq(
            "contractor_id",
            project
              .selected_contractor_id
          )
          .eq(
            "status",
            "accepted"
          )
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),

    /*
     * 4. Этапы проекта.
     */
    supabase
      .from("project_stages")
      .select(`
        id,
        project_id,
        created_by,
        title,
        description,
        price,
        progress_weight,
        sort_order,
        status,
        planned_start_date,
        planned_end_date,
        actual_started_at,
        actual_completed_at,
        submitted_for_review_at,
        reviewed_at,
        reviewed_by,
        customer_review_comment,
        created_at,
        updated_at
      `)
      .eq(
        "project_id",
        projectId
      )
      .order("sort_order", {
        ascending: true,
      }),

    /*
     * 5. История проекта.
     */
    supabase
      .from("project_events")
      .select(`
        id,
        project_id,
        author_id,
        event_type,
        title,
        description,
        metadata,
        created_at
      `)
      .eq(
        "project_id",
        projectId
      )
      .order("created_at", {
        ascending: false,
      }),

    /*
     * 6. Фото и документы этапов.
     */
    supabase
      .from(
        "project_stage_files"
      )
      .select(`
        id,
        project_id,
        stage_id,
        uploaded_by,
        file_name,
        storage_path,
        file_size,
        mime_type,
        file_category,
        description,
        created_at
      `)
      .eq(
        "project_id",
        projectId
      )
      .order("created_at", {
        ascending: false,
      }),
  ]);

  /*
   * Проверяем результаты запросов.
   */
  if (customerResult.error) {
    console.error(
      "Ошибка загрузки заказчика:",
      customerResult.error
    );

    throw new Error(
      "Не удалось загрузить данные заказчика"
    );
  }

  if (contractorResult.error) {
    console.error(
      "Ошибка загрузки подрядчика:",
      contractorResult.error
    );

    throw new Error(
      "Не удалось загрузить данные подрядчика"
    );
  }

  if (selectedBidResult.error) {
    console.error(
      "Ошибка загрузки принятого предложения:",
      selectedBidResult.error
    );

    throw new Error(
      "Не удалось загрузить принятое предложение"
    );
  }

  if (stagesResult.error) {
    console.error(
      "Ошибка загрузки этапов:",
      stagesResult.error
    );

    throw new Error(
      "Не удалось загрузить этапы проекта"
    );
  }

  if (eventsResult.error) {
    console.error(
      "Ошибка загрузки истории:",
      eventsResult.error
    );

    throw new Error(
      "Не удалось загрузить историю проекта"
    );
  }

  if (filesResult.error) {
    console.error(
      "Ошибка загрузки файлов:",
      filesResult.error
    );

    throw new Error(
      "Не удалось загрузить файлы проекта"
    );
  }

  /*
   * Создаём временные ссылки
   * для приватных файлов Storage.
   */
  const rawFiles =
    filesResult.data ?? [];

  const storagePaths =
    rawFiles.map(
      (file) =>
        file.storage_path
    );

  let signedUrlMap =
    new Map<
      string,
      string
    >();

  if (
    storagePaths.length > 0
  ) {
    const {
      data: signedFiles,
      error: signedError,
    } = await supabase.storage
      .from("project-files")
      .createSignedUrls(
        storagePaths,
        60 * 60
      );

    if (signedError) {
      console.error(
        "Ошибка создания временных ссылок:",
        signedError
      );
    } else {
      signedUrlMap =
        new Map(
          (
            signedFiles ?? []
          )
            .filter(
              (
                item
              ): item is typeof item & {
                path: string;
                signedUrl: string;
              } =>
                Boolean(
                  item.path &&
                    item.signedUrl
                )
            )
            .map((item) => [
              item.path,
              item.signedUrl,
            ])
        );
    }
  }

  const files =
    rawFiles.map(
      (file) => ({
        ...file,

        signed_url:
          signedUrlMap.get(
            file.storage_path
          ) ?? null,
      })
    );

  return {
    currentUser: {
      id: user.id,
      role: profile.role,

      firstName:
        profile.first_name,

      lastName:
        profile.last_name,

      contractorCompanyId:
        currentContractorCompany
          ?.id ?? null,
    },

    project,

    customer:
      customerResult.data ??
      null,

    contractor:
      contractorResult.data ??
      null,

    selectedBid:
      selectedBidResult.data ??
      null,

    stages:
      stagesResult.data ??
      [],

    events:
      eventsResult.data ??
      [],

    files,
  };
}

export type ProjectWorkspace =
  Awaited<
    ReturnType<
      typeof getProjectWorkspace
    >
  >;