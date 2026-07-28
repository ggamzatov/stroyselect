"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SubmitVerificationResult = {
  success: boolean;
  message: string;
};

export async function submitContractorVerification():
  Promise<SubmitVerificationResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Необходимо войти в систему",
    };
  }

  const { data: company, error } = await supabase
    .from("contractor_companies")
    .select(`
      id,
      public_name,
      company_type,
      description,
      contact_phone,
      verification_status,
      contractor_services (
        category_id
      ),
      contractor_service_areas (
        city
      )
    `)
    .eq("owner_id", user.id)
    .single();

  if (error || !company) {
    return {
      success: false,
      message:
        "Сначала создайте профиль компании",
    };
  }

  if (company.verification_status !== "draft") {
    return {
      success: false,
      message:
        "Профиль уже отправлен или проверен",
    };
  }

  if (!company.public_name) {
    return {
      success: false,
      message: "Не заполнено название компании",
    };
  }

  if (!company.company_type) {
    return {
      success: false,
      message: "Не выбран тип подрядчика",
    };
  }

  if (
    !company.description ||
    company.description.length < 50
  ) {
    return {
      success: false,
      message:
        "Описание должно содержать минимум 50 символов",
    };
  }

  if (!company.contact_phone) {
    return {
      success: false,
      message: "Не указан контактный телефон",
    };
  }

  if (
    !company.contractor_services ||
    company.contractor_services.length === 0
  ) {
    return {
      success: false,
      message:
        "Выберите хотя бы одну специализацию",
    };
  }

  if (
    !company.contractor_service_areas ||
    company.contractor_service_areas.length === 0
  ) {
    return {
      success: false,
      message:
        "Выберите хотя бы один город работы",
    };
  }

  const { error: updateError } = await supabase
    .from("contractor_companies")
    .update({
      verification_status: "pending",
      verification_comment: null,
    })
    .eq("id", company.id)
    .eq("owner_id", user.id);

  if (updateError) {
    console.error(
      "Ошибка отправки на проверку:",
      updateError
    );

    return {
      success: false,
      message:
        "Не удалось отправить профиль на проверку",
    };
  }

  revalidatePath("/contractor/company");
  revalidatePath("/contractor/dashboard");

  return {
    success: true,
    message: "Профиль отправлен на проверку",
  };
}