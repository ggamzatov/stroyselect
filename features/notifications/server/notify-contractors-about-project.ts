import "server-only";

import { db } from
  "@/lib/db/pool";

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

type ProjectRow = {
  id: string;
  customer_id: string;

  category_id:
    number | string | null;

  title: string;

  description:
    string | null;

  region:
    string | null;

  city:
    string | null;

  budget_min:
    string | number | null;

  budget_max:
    string | number | null;

  status: string;
};

type RecipientRow = {
  company_id: string;
  owner_id: string;

  public_name:
    string | null;
};

export async function notifyContractorsAboutProject(
  projectId: string
): Promise<NotifyContractorsResult> {
  let project:
    ProjectRow |
    undefined;

  try {
    const projectResult =
      await db.query<ProjectRow>(
        `
          SELECT
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
          FROM
            public.projects
          WHERE
            id = $1
          LIMIT 1
        `,
        [
          projectId,
        ]
      );

    project =
      projectResult.rows[0];
  } catch (error) {
    console.error(
      "Ошибка загрузки проекта для уведомлений:",
      error
    );

    return emptyResult(
      "Не удалось загрузить проект"
    );
  }

  if (!project) {
    return emptyResult(
      "Проект не найден"
    );
  }

  if (
    project.status !==
    "published"
  ) {
    return emptyResult(
      `Проект имеет статус «${project.status}», а не «published»`
    );
  }

  if (
    project.category_id ===
      null ||
    project.category_id ===
      undefined
  ) {
    return emptyResult(
      "У проекта не указана категория"
    );
  }

  let recipients:
    RecipientRow[];

  try {
    const result =
      await db.query<RecipientRow>(
        `
          SELECT DISTINCT
            cc.id
              AS company_id,

            cc.owner_id,

            cc.public_name

          FROM
            public.contractor_services
              cs

          JOIN
            public.contractor_companies
              cc
            ON cc.id =
              cs.contractor_id

          WHERE
            cs.category_id =
              $1

            AND cc.verification_status =
              'verified'

            AND cc.accepts_new_projects =
              true

            AND cc.owner_id <>
              $2
        `,
        [
          project.category_id,
          project.customer_id,
        ]
      );

    recipients =
      result.rows;
  } catch (error) {
    console.error(
      "Ошибка поиска подрядчиков для нового проекта:",
      error
    );

    return emptyResult(
      "Не удалось найти подходящих подрядчиков"
    );
  }

  let createdNotifications =
    0;

  let duplicatedNotifications =
    0;

  let failedNotifications =
    0;

  for (
    const recipient of
      recipients
  ) {
    const result =
      await createNotification({
        userId:
          recipient.owner_id,

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
          `new-project:${project.id}:user:${recipient.owner_id}`,

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
            recipient.company_id,

          company_name:
            recipient.public_name,
        },
      });

    if (
      result.success &&
      result.duplicated
    ) {
      duplicatedNotifications +=
        1;

      continue;
    }

    if (result.success) {
      createdNotifications +=
        1;

      continue;
    }

    failedNotifications +=
      1;

    console.error(
      "Не удалось уведомить подрядчика о новом проекте:",
      {
        projectId:
          project.id,

        contractorUserId:
          recipient.owner_id,

        companyId:
          recipient.company_id,

        message:
          result.message,
      }
    );
  }

  return {
    success:
      failedNotifications ===
      0,

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

function emptyResult(
  message: string
): NotifyContractorsResult {
  return {
    success: false,
    message,
    matchedContractors: 0,
    createdNotifications: 0,
    duplicatedNotifications: 0,
    failedNotifications: 0,
  };
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
    parts.push(
      project.city
    );
  }

  const budget =
    formatBudget(
      project.budget_min,
      project.budget_max
    );

  if (budget) {
    parts.push(
      budget
    );
  }

  return parts.join(
    " · "
  );
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
    toFiniteNumber(
      minimum
    );

  const max =
    toFiniteNumber(
      maximum
    );

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
      style:
        "currency",

      currency:
        "RUB",

      maximumFractionDigits:
        0,
    }
  ).format(value);
}