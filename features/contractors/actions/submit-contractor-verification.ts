"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/pool";

import {
  requireActiveUser,
} from "@/lib/auth/require-active-user";

export type SubmitVerificationResult = {
  success: boolean;
  message: string;
};

type CompanyForVerificationRow = {
  id: string;
  public_name: string;
  company_type: string | null;
  description: string | null;
  contact_phone: string | null;
  verification_status: string;
  services_count: string;
  areas_count: string;
};

export async function submitContractorVerification():
  Promise<SubmitVerificationResult> {
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
        "Отправлять профиль на проверку может только подрядчик",
    };
  }

  const userId =
    auth.user.id;

  const client =
    await db.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const companyResult =
      await client.query<CompanyForVerificationRow>(
        `
          SELECT
            cc.id,
            cc.public_name,
            cc.company_type,
            cc.description,
            cc.contact_phone,
            cc.verification_status,

            (
              SELECT COUNT(*)
              FROM
                public.contractor_services
              WHERE
                contractor_id =
                  cc.id
            )::text
              AS services_count,

            (
              SELECT COUNT(*)
              FROM
                public.contractor_service_areas
              WHERE
                contractor_id =
                  cc.id
            )::text
              AS areas_count

          FROM
            public.contractor_companies
              cc

          WHERE
            cc.owner_id =
              $1

          LIMIT 1

          FOR UPDATE
        `,
        [
          userId,
        ]
      );

    const company =
      companyResult.rows[0];

    if (!company) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Сначала создайте профиль компании",
      };
    }

    if (
      company.verification_status !==
      "draft"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Профиль уже отправлен или проверен",
      };
    }

    if (
      !company.public_name
    ) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Не заполнено название компании",
      };
    }

    if (
      !company.company_type
    ) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Не выбран тип подрядчика",
      };
    }

    if (
      !company.description ||
      company.description.length <
        50
    ) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Описание должно содержать минимум 50 символов",
      };
    }

    if (
      !company.contact_phone
    ) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Не указан контактный телефон",
      };
    }

    const servicesCount =
      Number(
        company.services_count
      );

    if (
      !Number.isFinite(
        servicesCount
      ) ||
      servicesCount === 0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Выберите хотя бы одну специализацию",
      };
    }

    const areasCount =
      Number(
        company.areas_count
      );

    if (
      !Number.isFinite(
        areasCount
      ) ||
      areasCount === 0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return {
        success: false,
        message:
          "Выберите хотя бы один город работы",
      };
    }

    const updateResult =
      await client.query<{
        id: string;
      }>(
        `
          UPDATE
            public.contractor_companies

          SET
            verification_status =
              'pending',

            verification_comment =
              NULL,

            updated_at =
              now()

          WHERE
            id = $1

            AND owner_id =
              $2

            AND verification_status =
              'draft'

          RETURNING
            id
        `,
        [
          company.id,
          userId,
        ]
      );

    if (
      !updateResult.rows[0]
    ) {
      throw new Error(
        "Статус компании не был изменён"
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
      "Ошибка отправки профиля подрядчика на проверку:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось отправить профиль на проверку",
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
      "Профиль отправлен на проверку",
  };
}