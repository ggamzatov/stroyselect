"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  contractorCompanySchema,
  type ContractorCompanyInput,
} from "@/features/contractors/schemas/contractor-company-schema";

export type SaveContractorCompanyResult = {
  success: boolean;
  message: string;
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

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: "Необходимо войти в систему",
    };
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("role, is_blocked")
      .eq("id", user.id)
      .single();

  if (profileError || !profile) {
    return {
      success: false,
      message: "Профиль пользователя не найден",
    };
  }

  if (profile.role !== "contractor") {
    return {
      success: false,
      message:
        "Создавать профиль подрядчика может только подрядчик",
    };
  }

  if (profile.is_blocked) {
    return {
      success: false,
      message: "Учетная запись заблокирована",
    };
  }

  const values = parsed.data;

  const { data: existingCompany } = await supabase
    .from("contractor_companies")
    .select("id, verification_status")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (
    existingCompany?.verification_status ===
    "pending"
  ) {
    return {
      success: false,
      message:
        "Профиль уже отправлен на проверку. Сначала дождитесь решения.",
    };
  }

  if (
    existingCompany?.verification_status ===
    "verified"
  ) {
    return {
      success: false,
      message:
        "Проверенный профиль нельзя изменить через эту форму.",
    };
  }

  const companyPayload = {
    owner_id: user.id,
    public_name: values.publicName,
    legal_name: values.legalName || null,
    company_type: values.companyType,
    inn: values.inn || null,
    ogrn: values.ogrn || null,
    description: values.description,
    founded_year: values.foundedYear ?? null,
    employee_count: values.employeeCount ?? null,
    minimum_project_budget:
      values.minimumProjectBudget ?? null,
    maximum_project_budget:
      values.maximumProjectBudget ?? null,
    contact_phone: values.contactPhone,
    contact_email: values.contactEmail || null,
    website: values.website || null,
    telegram: values.telegram || null,
    accepts_new_projects:
      values.acceptsNewProjects,
    verification_status: "draft" as const,
  };

  let companyId: string;

  if (existingCompany) {
    const { data, error } = await supabase
      .from("contractor_companies")
      .update(companyPayload)
      .eq("id", existingCompany.id)
      .eq("owner_id", user.id)
      .select("id")
      .single();

    if (error || !data) {
      console.error(
        "Ошибка обновления компании:",
        error
      );

      return {
        success: false,
        message:
          "Не удалось обновить профиль компании",
      };
    }

    companyId = data.id;
  } else {
    const { data, error } = await supabase
      .from("contractor_companies")
      .insert(companyPayload)
      .select("id")
      .single();

    if (error || !data) {
      console.error(
        "Ошибка создания компании:",
        error
      );

      return {
        success: false,
        message:
          "Не удалось создать профиль компании",
      };
    }

    companyId = data.id;
  }

  const { error: deleteServicesError } =
    await supabase
      .from("contractor_services")
      .delete()
      .eq("contractor_id", companyId);

  if (deleteServicesError) {
    console.error(
      "Ошибка удаления старых услуг:",
      deleteServicesError
    );

    return {
      success: false,
      message:
        "Компания сохранена, но не удалось обновить услуги",
    };
  }

  const serviceRows = values.categoryIds.map(
    (categoryId, index) => ({
      contractor_id: companyId,
      category_id: categoryId,
      is_primary: index === 0,
    })
  );

  const { error: servicesError } =
    await supabase
      .from("contractor_services")
      .insert(serviceRows);

  if (servicesError) {
    console.error(
      "Ошибка сохранения услуг:",
      servicesError
    );

    return {
      success: false,
      message:
        "Компания сохранена, но не удалось сохранить услуги",
    };
  }

  const { error: deleteAreasError } =
    await supabase
      .from("contractor_service_areas")
      .delete()
      .eq("contractor_id", companyId);

  if (deleteAreasError) {
    console.error(
      "Ошибка удаления городов:",
      deleteAreasError
    );

    return {
      success: false,
      message:
        "Компания сохранена, но не удалось обновить города",
    };
  }

  const areaRows = values.cities.map(
    (city, index) => ({
      contractor_id: companyId,
      region: "Республика Дагестан",
      city,
      is_primary: index === 0,
    })
  );

  const { error: areasError } =
    await supabase
      .from("contractor_service_areas")
      .insert(areaRows);

  if (areasError) {
    console.error(
      "Ошибка сохранения городов:",
      areasError
    );

    return {
      success: false,
      message:
        "Компания сохранена, но не удалось сохранить города",
    };
  }

  revalidatePath("/contractor/company");
  revalidatePath("/contractor/dashboard");

  return {
    success: true,
    message: "Профиль подрядчика сохранен",
  };
}