import "server-only";

import type { PoolClient } from "pg";

import { db } from "@/lib/db/pool";

type AuditInput = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAdminAudit(
  input: AuditInput,
  client?: PoolClient
) {
  const executor = client ?? db;
  await executor.query(
    `
      INSERT INTO public.admin_audit_log(
        actor_id, action, entity_type, entity_id, reason, metadata
      ) VALUES($1::uuid,$2,$3,$4,$5,$6::jsonb)
    `,
    [
      input.actorId,
      input.action.slice(0, 120),
      input.entityType.slice(0, 80),
      input.entityId ?? null,
      input.reason?.slice(0, 5000) ?? null,
      JSON.stringify(input.metadata ?? {}),
    ]
  );
}
