import { createClient } from
  "@/lib/supabase/server";

type Input = {
  adminId: string;

  actionType: string;

  entityType: string;

  entityId: string;

  description?: string | null;

  metadata?: Record<
    string,
    unknown
  >;
};

export async function createAdminAuditLog({
  adminId,
  actionType,
  entityType,
  entityId,
  description = null,
  metadata = {},
}: Input) {
  const supabase =
    await createClient();

  const {
    error,
  } = await supabase
    .from(
      "admin_audit_logs"
    )
    .insert({
      admin_id:
        adminId,

      action_type:
        actionType,

      entity_type:
        entityType,

      entity_id:
        entityId,

      description,

      metadata,
    });

  if (error) {
    console.error(
      "Ошибка записи административного журнала:",
      {
        message:
          error.message,

        details:
          error.details,

        hint:
          error.hint,

        code:
          error.code,
      }
    );

    return {
      success: false,
      message:
        "Не удалось записать действие в журнал",
    };
  }

  return {
    success: true,
  };
}