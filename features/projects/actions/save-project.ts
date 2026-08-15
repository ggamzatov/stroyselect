"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from
  "@/lib/db/pool";

import {
  requireActiveUser,
} from "@/lib/auth/require-active-user";

import {
  projectSchema,
  type ProjectInput,
} from "@/features/projects/schemas/project-schema";

export type SaveProjectResult = {
  success: boolean;
  message: string;
  projectId?: string;
};

type ExistingProjectRow = {
  id: string;
  status: string;
};

export async function saveProject(
  input: ProjectInput,
  projectId?: string
): Promise<SaveProjectResult> {
  const parsed =
    projectSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]
          ?.message ??
        "Проверьте заполнение формы",
    };
  }

  const auth =
    await requireActiveUser();

  if (!auth.success) {
    if (
      auth.reason ===
      "unauthorized"
    ) {
      redirect("/login");
    }

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
        "Создавать проекты может только заказчик",
    };
  }

  const values =
    parsed.data;

  try {
    if (projectId) {
      const existingResult =
        await db.query<ExistingProjectRow>(
          `
            SELECT
              id,
              status
            FROM
              public.projects
            WHERE
              id = $1
              AND customer_id = $2
            LIMIT 1
          `,
          [
            projectId,
            auth.user.id,
          ]
        );

      const existingProject =
        existingResult.rows[0];

      if (!existingProject) {
        return {
          success: false,
          message:
            "Проект не найден",
        };
      }

      if (
        existingProject.status !==
        "draft"
      ) {
        return {
          success: false,
          message:
            "Редактировать можно только черновик",
        };
      }

      const result =
        await db.query<{
          id: string;
        }>(
          `
            UPDATE
              public.projects

            SET
              category_id = $1,
              title = $2,
              description = $3,
              property_type = $4,
              region = $5,
              city = $6,
              address = $7,
              budget_min = $8,
              budget_max = $9,
              desired_start_date = $10,
              desired_end_date = $11,
              updated_at = now()

            WHERE
              id = $12
              AND customer_id = $13
              AND status = 'draft'

            RETURNING
              id
          `,
          [
            values.categoryId,
            values.title,
            values.description,
            values.propertyType,
            values.region,
            values.city,
            values.address ||
              null,
            values.budgetMin ??
              null,
            values.budgetMax ??
              null,
            values.desiredStartDate ||
              null,
            values.desiredEndDate ||
              null,
            projectId,
            auth.user.id,
          ]
        );

      if (!result.rows[0]) {
        return {
          success: false,
          message:
            "Не удалось обновить проект",
        };
      }

      revalidatePath(
        "/customer/projects"
      );

      revalidatePath(
        `/customer/projects/${projectId}/edit`
      );

      revalidatePath(
        `/customer/projects/${projectId}`
      );

      revalidatePath(
        "/customer/dashboard"
      );

      return {
        success: true,
        message:
          "Черновик обновлён",
        projectId,
      };
    }

    const result =
      await db.query<{
        id: string;
      }>(
        `
          INSERT INTO
            public.projects (
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
            )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            'draft'
          )
          RETURNING
            id
        `,
        [
          auth.user.id,
          values.categoryId,
          values.title,
          values.description,
          values.propertyType,
          values.region,
          values.city,
          values.address ||
            null,
          values.budgetMin ??
            null,
          values.budgetMax ??
            null,
          values.desiredStartDate ||
            null,
          values.desiredEndDate ||
            null,
        ]
      );

    const project =
      result.rows[0];

    if (!project) {
      return {
        success: false,
        message:
          "Не удалось создать проект",
      };
    }

    revalidatePath(
      "/customer/projects"
    );

    revalidatePath(
      "/customer/dashboard"
    );

    return {
      success: true,
      message:
        "Черновик проекта создан",
      projectId:
        project.id,
    };
  } catch (error) {
    console.error(
      "Ошибка сохранения проекта:",
      error
    );

    return {
      success: false,
      message:
        projectId
          ? "Не удалось обновить проект"
          : "Не удалось создать проект",
    };
  }
}