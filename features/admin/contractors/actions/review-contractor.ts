"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import {
  verificationDecisionSchema,
  type VerificationDecisionInput,
} from "@/features/admin/contractors/schemas/verification-decision-schema";
import { createNotification } from "@/features/notifications/server/create-notification";
import { createAdminAuditLog } from "@/features/admin/audit/server/create-admin-audit-log";

export type ReviewContractorResult = { success: boolean; message: string };

const STAFF_ROLES = ["admin", "moderator", "manager"];
type ContractorStatus = "draft" | "pending" | "verified" | "rejected" | "suspended";
type ContractorDecision = "approve" | "reject" | "suspend" | "resume" | "return_to_draft";

const ALLOWED_TRANSITIONS: Record<ContractorStatus, ContractorStatus[]> = {
  draft: ["pending"],
  pending: ["verified", "rejected"],
  verified: ["suspended"],
  rejected: ["draft"],
  suspended: ["verified", "draft"],
};

type CompanyRow = {
  id: string;
  owner_id: string;
  public_name: string;
  verification_status: ContractorStatus;
  verification_comment: string | null;
};

export async function reviewContractor(
  input: VerificationDecisionInput
): Promise<ReviewContractorResult> {
  const parsed = verificationDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные решения" };
  }

  const activeUser = await requireActiveUser();
  if (!activeUser.success) return { success: false, message: activeUser.message };
  if (!STAFF_ROLES.includes(activeUser.profile.role)) {
    return { success: false, message: "Недостаточно прав для проверки подрядчиков" };
  }

  const { contractorId, decision } = parsed.data;
  const comment = parsed.data.comment?.trim() ?? "";
  const newStatus = getNewStatus(decision);
  const client = await db.connect();
  let company: CompanyRow | undefined;
  const now = new Date().toISOString();

  try {
    await client.query("BEGIN");

    const companyResult = await client.query<CompanyRow>(
      `
        SELECT
          id,
          owner_id,
          public_name,
          verification_status::text AS verification_status,
          verification_comment
        FROM public.contractor_companies
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [contractorId]
    );

    company = companyResult.rows[0];
    if (!company) {
      await client.query("ROLLBACK");
      return { success: false, message: "Подрядчик не найден" };
    }

    const previousStatus = company.verification_status;
    if (previousStatus === newStatus) {
      await client.query("ROLLBACK");
      return { success: false, message: "У подрядчика уже установлен этот статус" };
    }

    if (!ALLOWED_TRANSITIONS[previousStatus]?.includes(newStatus)) {
      await client.query("ROLLBACK");
      return { success: false, message: getInvalidTransitionMessage(previousStatus, newStatus) };
    }

    if (requiresComment(decision) && comment.length < 3) {
      await client.query("ROLLBACK");
      return { success: false, message: "Укажите причину решения" };
    }

    const verificationComment = newStatus === "verified" ? null : comment || null;

    const updateResult = await client.query<{ id: string }>(
      `
        UPDATE public.contractor_companies
        SET
          verification_status = $1,
          verification_comment = $2,
          updated_at = now()
        WHERE id = $3
          AND verification_status = $4
        RETURNING id
      `,
      [newStatus, verificationComment, contractorId, previousStatus]
    );

    if (!updateResult.rows[0]) throw new Error("Статус подрядчика уже изменился");

    await client.query(
      `
        INSERT INTO public.contractor_verification_logs (
          contractor_id,
          admin_id,
          previous_status,
          new_status,
          comment
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [contractorId, activeUser.user.id, previousStatus, newStatus, comment || null]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка изменения статуса подрядчика:", error);
    return { success: false, message: "Не удалось изменить статус подрядчика" };
  } finally {
    client.release();
  }

  if (!company) return { success: false, message: "Подрядчик не найден" };
  const previousStatus = company.verification_status;

  await createAdminAuditLog({
    adminId: activeUser.user.id,
    actionType: `contractor_${newStatus}`,
    entityType: "contractor",
    entityId: contractorId,
    description: `Статус компании «${company.public_name}» изменён: ${previousStatus} → ${newStatus}`,
    metadata: { previous_status: previousStatus, new_status: newStatus, comment: comment || null },
  });

  try {
    const notification = getVerificationNotification({
      companyName: company.public_name,
      newStatus,
      comment,
    });
    const result = await createNotification({
      userId: company.owner_id,
      actorId: activeUser.user.id,
      notificationType: notification.type,
      title: notification.title,
      body: notification.body,
      url: "/contractor/company",
      metadata: {
        contractor_id: contractorId,
        company_name: company.public_name,
        previous_status: previousStatus,
        new_status: newStatus,
        admin_comment: comment || null,
        decided_at: now,
      },
    });
    if (!result.success) console.error("Не удалось отправить уведомление подрядчику:", result.message);
  } catch (error) {
    console.error("Ошибка уведомления подрядчика о решении администрации:", error);
  }

  revalidateContractorPages(contractorId);
  return { success: true, message: getSuccessMessage(newStatus) };
}

function getNewStatus(decision: ContractorDecision): ContractorStatus {
  switch (decision) {
    case "approve": return "verified";
    case "reject": return "rejected";
    case "suspend": return "suspended";
    case "resume": return "verified";
    case "return_to_draft": return "draft";
  }
}

function requiresComment(decision: ContractorDecision) {
  return ["reject", "suspend", "return_to_draft"].includes(decision);
}

function getInvalidTransitionMessage(from: ContractorStatus, to: ContractorStatus) {
  if (from === "pending") return "Профиль на проверке можно только подтвердить или отклонить";
  if (from === "verified") return "Подтверждённого подрядчика можно только приостановить";
  if (from === "rejected") return "Отклонённый профиль можно вернуть только на редактирование";
  if (from === "suspended") return "Приостановленного подрядчика можно восстановить или вернуть на редактирование";
  return `Недопустимый переход статуса: ${from} → ${to}`;
}

function getVerificationNotification({ companyName, newStatus, comment }: { companyName: string; newStatus: ContractorStatus; comment: string }) {
  switch (newStatus) {
    case "verified":
      return { type: "company_verified", title: "Профиль подрядчика подтверждён", body: `Компания «${companyName}» прошла проверку. Теперь вы можете получать проекты и отправлять предложения.` };
    case "rejected":
      return { type: "company_rejected", title: "Профиль подрядчика отклонён", body: comment ? `Компания «${companyName}» не прошла проверку. Комментарий администратора: ${getPreview(comment)}` : `Компания «${companyName}» не прошла проверку.` };
    case "suspended":
      return { type: "company_suspended", title: "Работа подрядчика приостановлена", body: comment ? `Доступ компании «${companyName}» временно приостановлен. Причина: ${getPreview(comment)}` : `Доступ компании «${companyName}» временно приостановлен.` };
    case "draft":
      return { type: "company_returned_to_draft", title: "Профиль возвращён на редактирование", body: comment ? `Профиль компании «${companyName}» необходимо доработать. Комментарий: ${getPreview(comment)}` : `Профиль компании «${companyName}» возвращён на редактирование.` };
    default:
      return { type: "company_status_changed", title: "Статус профиля изменён", body: `Статус компании «${companyName}» изменён.` };
  }
}

function getPreview(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length <= 240 ? normalized : `${normalized.slice(0, 237)}...`;
}

function getSuccessMessage(status: ContractorStatus) {
  switch (status) {
    case "verified": return "Подрядчик подтверждён";
    case "rejected": return "Профиль подрядчика отклонён";
    case "suspended": return "Работа подрядчика приостановлена";
    case "draft": return "Профиль возвращён на редактирование";
    case "pending": return "Профиль отправлен на проверку";
  }
}

function revalidateContractorPages(contractorId: string) {
  revalidatePath("/admin/contractors");
  revalidatePath(`/admin/contractors/${contractorId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/contractor/dashboard");
  revalidatePath("/contractor/company");
  revalidatePath("/customer/contractors");
  revalidatePath(`/customer/contractors/${contractorId}`);
}
