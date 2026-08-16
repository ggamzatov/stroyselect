"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export type SetContractorAvailabilityResult = {
  success: boolean;
  message: string;
  acceptsNewProjects?: boolean;
};

export async function setContractorAvailability(
  acceptsNewProjects: boolean
): Promise<SetContractorAvailabilityResult> {
  const auth = await requireActiveUser();

  if (!auth.success) {
    return { success: false, message: auth.message };
  }

  if (auth.profile.role !== "contractor") {
    return {
      success: false,
      message: "Изменять доступность может только подрядчик",
    };
  }

  try {
    const result = await db.query<{ id: string }>(
      `
        UPDATE public.contractor_companies
        SET
          accepts_new_projects = $1::boolean,
          updated_at = now()
        WHERE owner_id = $2::uuid
        RETURNING id
      `,
      [acceptsNewProjects, auth.user.id]
    );

    if (!result.rowCount) {
      return {
        success: false,
        message: "Сначала создайте профиль компании",
      };
    }

    revalidatePath("/contractor/company");
    revalidatePath("/contractor/dashboard");
    revalidatePath("/customer/contractors");
    revalidatePath("/admin/contractors");

    return {
      success: true,
      acceptsNewProjects,
      message: acceptsNewProjects
        ? "Теперь вы принимаете новые проекты"
        : "Приём новых проектов приостановлен",
    };
  } catch (error) {
    console.error("Ошибка изменения доступности подрядчика:", error);
    return {
      success: false,
      message: "Не удалось изменить статус доступности",
    };
  }
}
