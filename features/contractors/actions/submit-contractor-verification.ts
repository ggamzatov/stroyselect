"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export type SubmitVerificationResult = {
  success: boolean;
  message: string;
};

type CompanyForVerificationRow = {
  id: string;
  public_name: string;
  legal_name: string | null;
  company_type: string | null;
  inn: string | null;
  ogrn: string | null;
  description: string | null;
  founded_year: number | null;
  employee_count: number | null;
  contact_phone: string | null;
  contact_email: string | null;
  verification_status: string;
  services_count: string;
  areas_count: string;
};

export async function submitContractorVerification(): Promise<SubmitVerificationResult> {
  const auth = await requireActiveUser();

  if (!auth.success) {
    return { success: false, message: auth.message };
  }

  if (auth.profile.role !== "contractor") {
    return {
      success: false,
      message: "Отправлять профиль на проверку может только подрядчик",
    };
  }

  const userId = auth.user.id;
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const companyResult = await client.query<CompanyForVerificationRow>(
      `
        SELECT
          cc.id,
          cc.public_name,
          cc.legal_name,
          cc.company_type::text AS company_type,
          cc.inn,
          cc.ogrn,
          cc.description,
          cc.founded_year,
          cc.employee_count,
          cc.contact_phone,
          cc.contact_email,
          cc.verification_status::text AS verification_status,
          (
            SELECT COUNT(*)
            FROM public.contractor_services
            WHERE contractor_id = cc.id
          )::text AS services_count,
          (
            SELECT COUNT(*)
            FROM public.contractor_service_areas
            WHERE contractor_id = cc.id
          )::text AS areas_count
        FROM public.contractor_companies cc
        WHERE cc.owner_id = $1::uuid
        LIMIT 1
        FOR UPDATE
      `,
      [userId]
    );

    const company = companyResult.rows[0];

    if (!company) {
      await client.query("ROLLBACK");
      return { success: false, message: "Сначала создайте профиль компании" };
    }

    if (company.verification_status !== "draft") {
      await client.query("ROLLBACK");
      return { success: false, message: "Профиль уже отправлен или проверен" };
    }

    const requiredError = getRequiredProfileError(company);
    if (requiredError) {
      await client.query("ROLLBACK");
      return { success: false, message: requiredError };
    }

    const servicesCount = Number(company.services_count);
    if (!Number.isFinite(servicesCount) || servicesCount === 0) {
      await client.query("ROLLBACK");
      return { success: false, message: "Выберите хотя бы одну специализацию" };
    }

    const areasCount = Number(company.areas_count);
    if (!Number.isFinite(areasCount) || areasCount === 0) {
      await client.query("ROLLBACK");
      return { success: false, message: "Выберите хотя бы один город работы" };
    }

    const updateResult = await client.query<{ id: string }>(
      `
        UPDATE public.contractor_companies
        SET
          verification_status = 'pending',
          verification_comment = NULL,
          updated_at = now()
        WHERE id = $1::uuid
          AND owner_id = $2::uuid
          AND verification_status = 'draft'
        RETURNING id
      `,
      [company.id, userId]
    );

    if (!updateResult.rows[0]) {
      throw new Error("Статус компании не был изменён");
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка отправки профиля подрядчика на проверку:", error);
    return { success: false, message: "Не удалось отправить профиль на проверку" };
  } finally {
    client.release();
  }

  revalidatePath("/contractor/company");
  revalidatePath("/contractor/dashboard");
  revalidatePath("/admin/contractors");

  return { success: true, message: "Профиль отправлен на проверку" };
}

function getRequiredProfileError(company: CompanyForVerificationRow) {
  if (!company.public_name?.trim()) return "Не заполнено публичное название";
  if (!company.company_type) return "Не выбран тип подрядчика";
  if (!company.legal_name?.trim()) return "Не заполнено юридическое название";
  if (!company.inn || !/^(\d{10}|\d{12})$/.test(company.inn)) return "Укажите корректный ИНН";
  if (!company.ogrn || !/^(\d{13}|\d{15})$/.test(company.ogrn)) return "Укажите корректный ОГРН или ОГРНИП";
  if (!company.description || company.description.trim().length < 50) return "Описание должно содержать минимум 50 символов";
  if (!company.founded_year) return "Укажите год начала работы";
  if (!company.employee_count || company.employee_count < 1) return "Укажите количество сотрудников";
  if (!company.contact_phone?.trim()) return "Укажите контактный телефон";
  if (!company.contact_email?.trim()) return "Укажите контактный email";
  return null;
}
