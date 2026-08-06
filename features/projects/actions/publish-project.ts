"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from
  "@/lib/supabase/server";

import { notifyContractorsAboutProject } from
  "@/features/notifications/server/notify-contractors-about-project";

const publishProjectSchema =
  z.object({
    projectId: z
      .string()
      .uuid(
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

  const supabase =
    await createClient();

  /*
   * Проверяем авторизацию.
   */
  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      success: false,
      message:
        "Необходимо войти",
    };
  }

  /*
   * Проверяем профиль заказчика.
   */
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      is_blocked
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    console.error(
      "Ошибка проверки профиля при публикации проекта:",
      profileError
    );

    return {
      success: false,
      message:
        "Профиль пользователя не найден",
    };
  }

  if (
    profile.role !== "customer"
  ) {
    return {
      success: false,
      message:
        "Публиковать проекты может только заказчик",
    };
  }

  if (profile.is_blocked) {
    return {
      success: false,
      message:
        "Ваш аккаунт заблокирован",
    };
  }

  /*
   * Загружаем проект и проверяем владельца.
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
      property_type,
      region,
      city,
      address,
      budget_min,
      budget_max,
      desired_start_date,
      desired_end_date,
      status
    `)
    .eq(
      "id",
      parsed.data.projectId
    )
    .eq(
      "customer_id",
      user.id
    )
    .maybeSingle();

  if (
    projectError ||
    !project
  ) {
    console.error(
      "Ошибка загрузки проекта перед публикацией:",
      projectError
    );

    return {
      success: false,
      message:
        "Проект не найден или недоступен",
    };
  }

  /*
   * Повторно опубликованный проект
   * не публикуем ещё раз.
   */
  if (
    project.status ===
    "published"
  ) {
    return {
      success: true,
      message:
        "Проект уже опубликован",
      projectId:
        project.id,
    };
  }

  if (
    project.status !== "draft"
  ) {
    return {
      success: false,
      message:
        "Опубликовать можно только черновик",
    };
  }

  /*
   * Дополнительная проверка обязательных
   * данных перед публикацией.
   */
  const validationMessage =
    validateProjectForPublication(
      project
    );

  if (validationMessage) {
    return {
      success: false,
      message:
        validationMessage,
    };
  }

  const publishedAt =
    new Date().toISOString();

  /*
   * Переводим проект в published.
   */
  const {
    data: publishedProject,
    error: updateError,
  } = await supabase
    .from("projects")
    .update({
      status:
        "published",

      published_at:
        publishedAt,

      updated_at:
        publishedAt,
    })
    .eq(
      "id",
      project.id
    )
    .eq(
      "customer_id",
      user.id
    )
    .eq(
      "status",
      "draft"
    )
    .select(`
      id,
      status
    `)
    .maybeSingle();

  if (
    updateError ||
    !publishedProject
  ) {
    console.error(
      "Ошибка публикации проекта:",
      updateError
    );

    return {
      success: false,
      message:
        updateError?.message ??
        "Не удалось опубликовать проект",
    };
  }

  /*
   * Записываем событие в историю проекта.
   *
   * Ошибка события не должна отменять
   * уже выполненную публикацию.
   */
  const {
    error: eventError,
  } = await supabase
    .from("project_events")
    .insert({
      project_id:
        project.id,

      author_id:
        user.id,

      event_type:
        "project_published",

      title:
        "Проект опубликован",

      description:
        project.title,

      metadata: {
        category_id:
          project.category_id,

        city:
          project.city,

        published_at:
          publishedAt,
      },
    });

  if (eventError) {
    console.error(
      "Ошибка создания события публикации проекта:",
      eventError
    );
  }

  /*
   * После успешной публикации ищем
   * подходящих подрядчиков и создаём
   * уведомления.
   *
   * Ошибка рассылки не отменяет публикацию.
   */
  let notificationResult:
    PublishProjectResult["notificationResult"];

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

    console.log(
      "Результат уведомления подрядчиков о новом проекте:",
      result
    );
  } catch (
    notificationError
  ) {
    console.error(
      "Непредвиденная ошибка рассылки нового проекта:",
      notificationError
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
      | number
      | null;

    title:
      | string
      | null;

    description:
      | string
      | null;

    property_type:
      | string
      | null;

    region:
      | string
      | null;

    city:
      | string
      | null;

    budget_min:
      | number
      | string
      | null;

    budget_max:
      | number
      | string
      | null;
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
    | PublishProjectResult["notificationResult"]
    | undefined
) {
  if (!result) {
    return (
      "Проект опубликован, но результат рассылки уведомлений недоступен"
    );
  }

  if (
    result.matchedContractors === 0
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