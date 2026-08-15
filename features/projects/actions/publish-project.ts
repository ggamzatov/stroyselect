"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { db } from
  "@/lib/db/pool";

import {
  requireActiveUser,
} from "@/lib/auth/require-active-user";

import { notifyContractorsAboutProject } from
  "@/features/notifications/server/notify-contractors-about-project";

const publishProjectSchema =
  z.object({
    projectId:
      z.string().uuid(
        "Некорректный идентификатор проекта"
      ),
  });

export type PublishProjectResult = {
  success: boolean;
  message: string;
  projectId?: string;

  notificationResult?: {
    matchedContractors: number;
    createdNotifications: number;
    duplicatedNotifications: number;
    failedNotifications: number;
  };
};

type ProjectRow = {
  id: string;
  customer_id: string;

  category_id:
    number | null;

  title:
    string | null;

  description:
    string | null;

  property_type:
    string | null;

  region:
    string | null;

  city:
    string | null;

  address:
    string | null;

  budget_min:
    number | string | null;

  budget_max:
    number | string | null;

  desired_start_date:
    Date | string | null;

  desired_end_date:
    Date | string | null;

  status: string;
};

export async function publishProject(
  projectId: string
): Promise<PublishProjectResult> {
  const parsed =
    publishProjectSchema.safeParse({
      projectId,
    });

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]
          ?.message ??
        "Некорректный проект",
    };
  }

  const auth =
    await requireActiveUser();

  if (!auth.success) {
    return {
      success: false,
      message:
        auth.message,
    };
  }

  if (
    auth.profile.role !==
    "customer"
  ) {
    return {
      success: false,
      message:
        "Публиковать проекты может только заказчик",
    };
  }

  const client =
    await db.connect();

  let project:
    ProjectRow;

  try {
    await client.query(
      "BEGIN"
    );

    const projectResult =
      await client.query<ProjectRow>(
        `
          SELECT
            id,
            customer_id,
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
            status

          FROM
            public.projects

          WHERE
            id = $1
            AND customer_id = $2

          LIMIT 1

          FOR UPDATE
        `,
        [
          parsed.data.projectId,
          auth.user.id,
        ]
      );

    const foundProject =
      projectResult.rows[0];

    if (!foundProject) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Проект не найден или недоступен",
      };
    }

    project =
      foundProject;

    if (
      project.status ===
      "published"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: true,
        message:
          "Проект уже опубликован",
        projectId:
          project.id,
      };
    }

    if (
      project.status !==
      "draft"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Опубликовать можно только черновик",
      };
    }

    const validationMessage =
      validateProjectForPublication(
        project
      );

    if (validationMessage) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          validationMessage,
      };
    }

    const updateResult =
      await client.query<{
        id: string;
      }>(
        `
          UPDATE
            public.projects

          SET
            status =
              'published',

            published_at =
              now(),

            updated_at =
              now()

          WHERE
            id = $1

            AND customer_id =
              $2

            AND status =
              'draft'

          RETURNING
            id
        `,
        [
          project.id,
          auth.user.id,
        ]
      );

    if (
      !updateResult.rows[0]
    ) {
      throw new Error(
        "Проект не был опубликован"
      );
    }

    /*
     * История проекта входит
     * в ту же транзакцию.
     */
    await client.query(
      `
        INSERT INTO
          public.project_events (
            project_id,
            author_id,
            event_type,
            title,
            description,
            metadata
          )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::jsonb
        )
      `,
      [
        project.id,
        auth.user.id,
        "project_published",
        "Проект опубликован",
        project.title,
        JSON.stringify({
          category_id:
            project.category_id,

          city:
            project.city,

          published_at:
            new Date()
              .toISOString(),
        }),
      ]
    );

    await client.query(
      "COMMIT"
    );
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    console.error(
      "Ошибка публикации проекта:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось опубликовать проект",
    };
  } finally {
    client.release();
  }

  /*
   * Уведомления выполняем после COMMIT.
   * Их ошибка не откатывает публикацию.
   */
  let notificationResult:
    PublishProjectResult[
      "notificationResult"
    ];

  try {
    const result =
      await notifyContractorsAboutProject(
        project.id
      );

    notificationResult = {
      matchedContractors:
        result.matchedContractors,

      createdNotifications:
        result.createdNotifications,

      duplicatedNotifications:
        result.duplicatedNotifications,

      failedNotifications:
        result.failedNotifications,
    };
  } catch (error) {
    console.error(
      "Непредвиденная ошибка рассылки нового проекта:",
      error
    );
  }

  revalidateProjectPages(
    project.id
  );

  return {
    success: true,

    message:
      createPublishResultMessage(
        notificationResult
      ),

    projectId:
      project.id,

    notificationResult,
  };
}

function validateProjectForPublication(
  project: {
    category_id:
      number | null;

    title:
      string | null;

    description:
      string | null;

    property_type:
      string | null;

    region:
      string | null;

    city:
      string | null;

    budget_min:
      number | string | null;

    budget_max:
      number | string | null;
  }
): string | null {
  if (!project.category_id) {
    return (
      "Перед публикацией укажите категорию проекта"
    );
  }

  if (
    !project.title?.trim()
  ) {
    return (
      "Перед публикацией укажите название проекта"
    );
  }

  if (
    !project.description?.trim()
  ) {
    return (
      "Перед публикацией добавьте описание проекта"
    );
  }

  if (
    !project.property_type
  ) {
    return (
      "Перед публикацией укажите тип объекта"
    );
  }

  if (!project.region) {
    return (
      "Перед публикацией укажите регион"
    );
  }

  if (!project.city) {
    return (
      "Перед публикацией укажите город"
    );
  }

  const minimumBudget =
    toFiniteNumber(
      project.budget_min
    );

  const maximumBudget =
    toFiniteNumber(
      project.budget_max
    );

  if (
    minimumBudget !== null &&
    maximumBudget !== null &&
    minimumBudget >
      maximumBudget
  ) {
    return (
      "Минимальный бюджет не может быть больше максимального"
    );
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

function createPublishResultMessage(
  result:
    | PublishProjectResult[
        "notificationResult"
      ]
    | undefined
) {
  if (!result) {
    return (
      "Проект опубликован, но результат рассылки уведомлений недоступен"
    );
  }

  if (
    result.matchedContractors ===
    0
  ) {
    return (
      "Проект опубликован. Подходящие подрядчики пока не найдены"
    );
  }

  if (
    result.failedNotifications >
    0
  ) {
    return (
      `Проект опубликован. Уведомлено подрядчиков: ` +
      `${result.createdNotifications}. ` +
      `Не удалось уведомить: ` +
      `${result.failedNotifications}`
    );
  }

  return (
    `Проект опубликован. ` +
    `Уведомлено подрядчиков: ` +
    `${result.createdNotifications}`
  );
}

function revalidateProjectPages(
  projectId: string
) {
  revalidatePath(
    "/customer/projects"
  );

  revalidatePath(
    `/customer/projects/${projectId}`
  );

  revalidatePath(
    `/customer/projects/${projectId}/edit`
  );

  revalidatePath(
    "/customer/dashboard"
  );

  revalidatePath(
    "/contractor/projects"
  );

  revalidatePath(
    `/contractor/projects/${projectId}`
  );

  revalidatePath(
    "/contractor/dashboard"
  );
}