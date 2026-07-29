"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import {
  verificationDecisionSchema,
  type VerificationDecisionInput,
} from
  "@/features/admin/contractors/schemas/verification-decision-schema";

export type ReviewContractorResult = {
  success: boolean;
  message: string;
};

const STAFF_ROLES = [
  "admin",
  "moderator",
  "manager",
];

export async function reviewContractor(
  input: VerificationDecisionInput
): Promise<ReviewContractorResult> {
  const parsed =
    verificationDecisionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Проверьте данные решения",
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

  const { data: adminProfile, error: adminError } =
    await supabase
      .from("profiles")
      .select("role, is_blocked")
      .eq("id", user.id)
      .single();

  if (
    adminError ||
    !adminProfile ||
    adminProfile.is_blocked ||
    !STAFF_ROLES.includes(adminProfile.role)
  ) {
    return {
      success: false,
      message:
        "Недостаточно прав для проверки подрядчиков",
    };
  }

  const { contractorId, decision, comment } =
    parsed.data;

  const { data: company, error: companyError } =
    await supabase
      .from("contractor_companies")
      .select(`
        id,
        public_name,
        verification_status
      `)
      .eq("id", contractorId)
      .single();

  if (companyError || !company) {
    return {
      success: false,
      message: "Подрядчик не найден",
    };
  }

  const previousStatus =
    company.verification_status;

  let newStatus:
    | "draft"
    | "verified"
    | "rejected"
    | "suspended";

  switch (decision) {
    case "approve":
      newStatus = "verified";
      break;

    case "reject":
      newStatus = "rejected";
      break;

    case "suspend":
      newStatus = "suspended";
      break;

    case "return_to_draft":
      newStatus = "draft";
      break;
  }

  if (previousStatus === newStatus) {
    return {
      success: false,
      message:
        "У подрядчика уже установлен этот статус",
    };
  }

  if (
    decision === "approve" &&
    previousStatus !== "pending"
  ) {
    return {
      success: false,
      message:
        "Подтвердить можно только профиль, ожидающий проверки",
    };
  }

  if (
    decision === "reject" &&
    previousStatus !== "pending"
  ) {
    return {
      success: false,
      message:
        "Отклонить можно только профиль, ожидающий проверки",
    };
  }

  const verificationComment =
    newStatus === "verified"
      ? null
      : comment.trim();

  const { error: updateError } = await supabase
    .from("contractor_companies")
    .update({
      verification_status: newStatus,
      verification_comment:
        verificationComment,
    })
    .eq("id", contractorId);

  if (updateError) {
    console.error(
      "Ошибка изменения статуса:",
      updateError
    );

    return {
      success: false,
      message:
        "Не удалось изменить статус подрядчика",
    };
  }

  const { error: logError } = await supabase
    .from("contractor_verification_logs")
    .insert({
      contractor_id: contractorId,
      admin_id: user.id,
      previous_status: previousStatus,
      new_status: newStatus,
      comment: comment.trim() || null,
    });

  if (logError) {
    console.error(
      "Ошибка записи журнала:",
      logError
    );

    /*
     * Статус уже изменился, поэтому не возвращаем
     * полную ошибку операции.
     */
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/contractors");
  revalidatePath(
    `/admin/contractors/${contractorId}`
  );
  revalidatePath("/contractor/dashboard");
  revalidatePath("/contractor/company");

  return {
    success: true,
    message: getSuccessMessage(newStatus),
  };
}

function getSuccessMessage(
  status:
    | "draft"
    | "verified"
    | "rejected"
    | "suspended"
) {
  switch (status) {
    case "verified":
      return "Подрядчик подтверждён";

    case "rejected":
      return "Профиль подрядчика отклонён";

    case "suspended":
      return "Профиль подрядчика приостановлен";

    case "draft":
      return "Профиль возвращён в черновик";
  }
}