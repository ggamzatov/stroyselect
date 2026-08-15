"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/pool";

import {
  requireActiveUser,
} from "@/lib/auth/require-active-user";

import {
  contractorCompanySchema,
  type ContractorCompanyInput,
} from "@/features/contractors/schemas/contractor-company-schema";

export type SaveContractorCompanyResult = {
  success: boolean;
  message: string;
};

type ExistingCompanyRow = {
  id: string;
  verification_status: string;
};

export async function saveContractorCompany(
  input: ContractorCompanyInput
): Promise<SaveContractorCompanyResult> {
  const parsed =
    contractorCompanySchema.safeParse(input);

  if (!parsed.success) {
    console.error(
      "Ошибки формы:",
      parsed.error.flatten()
    );

    return {
      success: false,
      message:
        "Проверьте правильность заполнения формы",
    };
  }

  const auth =
    await requireActiveUser();

  if (!auth.success) {
    return {
      success: false,
      message: auth.message,
    };
  }

  if (
    auth.profile.role !==
    "contractor"
  ) {
    return {
      success: false,
      message:
        "Создавать профиль подрядчика может только подрядчик",
    };
  }

  const userId =
    auth.user.id;

  const values =
    parsed.data;

  const client =
    await db.connect();

  try {
    await client.query(
      "BEGIN"
    );

    /*
     * Блокируем существующую компанию
     * на время изменения.
     */
    const existingResult =
      await client.query<ExistingCompanyRow>(
        `
          SELECT
            id,
            verification_status
          FROM
            public.contractor_companies
          WHERE
            owner_id = $1
          LIMIT 1
          FOR UPDATE
        `,
        [
          userId,
        ]
      );

    const existingCompany =
      existingResult.rows[0];

    if (
      existingCompany
        ?.verification_status ===
      "pending"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Профиль уже отправлен на проверку. Сначала дождитесь решения.",
      };
    }

    if (
      existingCompany
        ?.verification_status ===
      "verified"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Проверенный профиль нельзя изменить через эту форму.",
      };
    }

    let companyId:
      string;

    if (existingCompany) {
      const updateResult =
        await client.query<{
          id: string;
        }>(
          `
            UPDATE
              public.contractor_companies
            SET
              public_name = $1,
              legal_name = $2,
              company_type = $3,
              inn = $4,
              ogrn = $5,
              description = $6,
              founded_year = $7,
              employee_count = $8,
              minimum_project_budget = $9,
              maximum_project_budget = $10,
              contact_phone = $11,
              contact_email = $12,
              website = $13,
              telegram = $14,
              accepts_new_projects = $15,
              verification_status = 'draft',
              verification_comment = NULL,
              updated_at = now()
            WHERE
              id = $16
              AND owner_id = $17
            RETURNING
              id
          `,
          [
            values.publicName,
            values.legalName || null,
            values.companyType,
            values.inn || null,
            values.ogrn || null,
            values.description,
            values.foundedYear ?? null,
            values.employeeCount ?? null,
            values.minimumProjectBudget ?? null,
            values.maximumProjectBudget ?? null,
            values.contactPhone,
            values.contactEmail || null,
            values.website || null,
            values.telegram || null,
            values.acceptsNewProjects,
            existingCompany.id,
            userId,
          ]
        );

      const updated =
        updateResult.rows[0];

      if (!updated) {
        throw new Error(
          "Компания не была обновлена"
        );
      }

      companyId =
        updated.id;
    } else {
      const insertResult =
        await client.query<{
          id: string;
        }>(
          `
            INSERT INTO
              public.contractor_companies (
                owner_id,
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
                accepts_new_projects,
                verification_status,
                verification_comment
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
              $13,
              $14,
              $15,
              $16,
              'draft',
              NULL
            )
            RETURNING
              id
          `,
          [
            userId,
            values.publicName,
            values.legalName || null,
            values.companyType,
            values.inn || null,
            values.ogrn || null,
            values.description,
            values.foundedYear ?? null,
            values.employeeCount ?? null,
            values.minimumProjectBudget ?? null,
            values.maximumProjectBudget ?? null,
            values.contactPhone,
            values.contactEmail || null,
            values.website || null,
            values.telegram || null,
            values.acceptsNewProjects,
          ]
        );

      const inserted =
        insertResult.rows[0];

      if (!inserted) {
        throw new Error(
          "Компания не была создана"
        );
      }

      companyId =
        inserted.id;
    }

    /*
     * Полностью пересобираем
     * специализации компании.
     */
    await client.query(
      `
        DELETE FROM
          public.contractor_services
        WHERE
          contractor_id = $1
      `,
      [
        companyId,
      ]
    );

    for (
      let index = 0;
      index <
      values.categoryIds.length;
      index += 1
    ) {
      const categoryId =
        values.categoryIds[index];

      await client.query(
        `
          INSERT INTO
            public.contractor_services (
              contractor_id,
              category_id,
              is_primary
            )
          VALUES (
            $1,
            $2,
            $3
          )
        `,
        [
          companyId,
          categoryId,
          index === 0,
        ]
      );
    }

    /*
     * Полностью пересобираем
     * географию работы.
     */
    await client.query(
      `
        DELETE FROM
          public.contractor_service_areas
        WHERE
          contractor_id = $1
      `,
      [
        companyId,
      ]
    );

    for (
      let index = 0;
      index <
      values.cities.length;
      index += 1
    ) {
      const city =
        values.cities[index];

      await client.query(
        `
          INSERT INTO
            public.contractor_service_areas (
              contractor_id,
              region,
              city,
              is_primary
            )
          VALUES (
            $1,
            $2,
            $3,
            $4
          )
        `,
        [
          companyId,
          "Республика Дагестан",
          city,
          index === 0,
        ]
      );
    }

    await client.query(
      "COMMIT"
    );
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    console.error(
      "Ошибка сохранения профиля подрядчика:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось сохранить профиль компании",
    };
  } finally {
    client.release();
  }

  revalidatePath(
    "/contractor/company"
  );

  revalidatePath(
    "/contractor/dashboard"
  );

  return {
    success: true,
    message:
      "Профиль подрядчика сохранен",
  };
}