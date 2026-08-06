import "server-only";

import { createAdminClient } from
  "@/lib/supabase/admin";

import { createNotification } from
  "@/features/notifications/server/create-notification";

type NotifyContractorsResult = {
  success: boolean;
  message: string;
  matchedContractors: number;
  createdNotifications: number;
  duplicatedNotifications: number;
  failedNotifications: number;
};

type RelatedCompany = {
  id: string;
  owner_id: string;
  public_name: string | null;
  verification_status: string;
  accepts_new_projects: boolean;
};

export async function notifyContractorsAboutProject(
  projectId: string
): Promise<NotifyContractorsResult> {
  const supabase =
    createAdminClient();

  /*
   * Загружаем проект.
   */
  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .select(`
      id,
      customer_id,
      category_id,
      title,
      description,
      region,
      city,
      budget_min,
      budget_max,
      status
    `)
    .eq("id", projectId)
    .maybeSingle();

  if (
    projectError ||
    !project
  ) {
    console.error(
      "Ошибка загрузки проекта для уведомлений:",
      projectError
    );

    return {
      success: false,
      message:
        projectError?.message ??
        "Проект не найден",
      matchedContractors: 0,
      createdNotifications: 0,
      duplicatedNotifications: 0,
      failedNotifications: 0,
    };
  }

  if (
    project.status !==
    "published"
  ) {
    return {
      success: false,
      message:
        `Проект имеет статус «${project.status}», а не «published»`,
      matchedContractors: 0,
      createdNotifications: 0,
      duplicatedNotifications: 0,
      failedNotifications: 0,
    };
  }

  if (
    project.category_id ===
      null ||
    project.category_id ===
      undefined
  ) {
    return {
      success: false,
      message:
        "У проекта не указана категория",
      matchedContractors: 0,
      createdNotifications: 0,
      duplicatedNotifications: 0,
      failedNotifications: 0,
    };
  }

  /*
   * В твоей таблице contractor_services
   * используются поля:
   *
   * contractor_id
   * category_id
   */
  const {
    data: serviceMatches,
    error: servicesError,
  } = await supabase
    .from("contractor_services")
    .select(`
      contractor_id,
      category_id,
      years_experience,
      is_primary,

      company:contractor_companies!contractor_services_contractor_id_fkey (
        id,
        owner_id,
        public_name,
        verification_status,
        accepts_new_projects
      )
    `)
    .eq(
      "category_id",
      project.category_id
    );

  if (servicesError) {
    console.error(
      "Ошибка поиска подрядчиков для нового проекта:",
      servicesError
    );

    return {
      success: false,
      message:
        servicesError.message,
      matchedContractors: 0,
      createdNotifications: 0,
      duplicatedNotifications: 0,
      failedNotifications: 0,
    };
  }

  /*
   * Убираем повторы.
   *
   * Один владелец может иметь несколько
   * совпадающих записей услуг.
   */
  const recipientsMap =
    new Map<
      string,
      {
        userId: string;
        companyId: string;
        companyName: string | null;
      }
    >();

  for (
    const serviceMatch of
    serviceMatches ?? []
  ) {
    const company =
      normalizeCompany(
        serviceMatch.company
      );

    if (!company) {
      continue;
    }

    if (
      company.verification_status !==
      "verified"
    ) {
      continue;
    }

    if (
      company.accepts_new_projects !==
      true
    ) {
      continue;
    }

    /*
     * Не отправляем уведомление
     * автору собственного проекта.
     */
    if (
      company.owner_id ===
      project.customer_id
    ) {
      continue;
    }

    recipientsMap.set(
      company.owner_id,
      {
        userId:
          company.owner_id,

        companyId:
          company.id,

        companyName:
          company.public_name,
      }
    );
  }

  const recipients = [
    ...recipientsMap.values(),
  ];

  let createdNotifications = 0;
  let duplicatedNotifications = 0;
  let failedNotifications = 0;

  for (
    const recipient of
    recipients
  ) {
    const result =
      await createNotification({
        userId:
          recipient.userId,

        actorId:
          project.customer_id,

        notificationType:
          "new_matching_project",

        title:
          "Новый подходящий проект",

        body:
          getProjectNotificationBody(
            project
          ),

        projectId:
          project.id,

        url:
          `/contractor/projects/${project.id}`,

        deduplicationKey:
          `new-project:${project.id}:user:${recipient.userId}`,

        metadata: {
          project_title:
            project.title,

          category_id:
            project.category_id,

          region:
            project.region,

          city:
            project.city,

          budget_min:
            project.budget_min,

          budget_max:
            project.budget_max,

          company_id:
            recipient.companyId,

          company_name:
            recipient.companyName,
        },
      });

    if (
      result.success &&
      result.duplicated
    ) {
      duplicatedNotifications += 1;
      continue;
    }

    if (result.success) {
      createdNotifications += 1;
      continue;
    }

    failedNotifications += 1;

    console.error(
      "Не удалось уведомить подрядчика о новом проекте:",
      {
        projectId:
          project.id,

        contractorUserId:
          recipient.userId,

        companyId:
          recipient.companyId,

        message:
          result.message,
      }
    );
  }

  return {
    success:
      failedNotifications === 0,

    message:
      recipients.length === 0
        ? "Подходящие подрядчики не найдены"
        : `Найдено подрядчиков: ${recipients.length}; создано уведомлений: ${createdNotifications}; дубликатов: ${duplicatedNotifications}; ошибок: ${failedNotifications}`,

    matchedContractors:
      recipients.length,

    createdNotifications,

    duplicatedNotifications,

    failedNotifications,
  };
}

function normalizeCompany(
  value:
    | RelatedCompany
    | RelatedCompany[]
    | null
): RelatedCompany | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getProjectNotificationBody(
  project: {
    title: string;
    city: string | null;
    budget_min:
      | number
      | string
      | null;
    budget_max:
      | number
      | string
      | null;
  }
) {
  const parts: string[] = [
    `«${project.title}»`,
  ];

  if (project.city) {
    parts.push(project.city);
  }

  const budget =
    formatBudget(
      project.budget_min,
      project.budget_max
    );

  if (budget) {
    parts.push(budget);
  }

  return parts.join(" · ");
}

function formatBudget(
  minimum:
    | number
    | string
    | null,
  maximum:
    | number
    | string
    | null
) {
  const min =
    toFiniteNumber(minimum);

  const max =
    toFiniteNumber(maximum);

  if (
    min !== null &&
    max !== null
  ) {
    return `${formatMoney(min)} — ${formatMoney(max)}`;
  }

  if (min !== null) {
    return `от ${formatMoney(min)}`;
  }

  if (max !== null) {
    return `до ${formatMoney(max)}`;
  }

  return null;
}

function toFiniteNumber(
  value:
    | number
    | string
    | null
) {
  if (value === null) {
    return null;
  }

  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : null;
}

function formatMoney(
  value: number
) {
  return new Intl.NumberFormat(
    "ru-RU",
    {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }
  ).format(value);
}