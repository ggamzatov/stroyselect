import "server-only";

import { db } from "@/lib/db/pool";

type Input = {
  adminId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createAdminAuditLog({
  adminId,
  actionType,
  entityType,
  entityId,
  description = null,
  metadata = {},
}: Input) {
  try {
    await db.query(
      `
        INSERT INTO public.admin_audit_logs (
          admin_id,
          action_type,
          entity_type,
          entity_id,
          description,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [
        adminId,
        actionType,
        entityType,
        entityId,
        description,
        JSON.stringify(metadata),
      ]
    );

    return { success: true };
  } catch (error) {
    console.error("Ошибка записи административного журнала:", error);
    return {
      success: false,
      message: "Не удалось записать действие в журнал",
    };
  }
}
