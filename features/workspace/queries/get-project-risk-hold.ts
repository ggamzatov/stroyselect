import "server-only";

import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";

type RiskHoldRow = {
  risk_hold: boolean;
  risk_hold_reason: string | null;
  risk_hold_at: Date | string | null;
};

export type ProjectRiskHoldState = {
  isOnHold: boolean;
  reason: string | null;
  heldAt: string | null;
};

export async function getProjectRiskHoldForParticipant(
  projectId: string
): Promise<ProjectRiskHoldState | null> {
  const userId = await getCurrentSessionUserId();

  if (!userId) {
    return null;
  }

  const result = await db.query<RiskHoldRow>(
    `
      SELECT
        p.risk_hold,
        p.risk_hold_reason,
        p.risk_hold_at
      FROM public.projects p
      LEFT JOIN public.contractor_companies cc
        ON cc.id = p.selected_contractor_id
      WHERE p.id = $1::uuid
        AND (
          p.customer_id = $2::uuid
          OR cc.owner_id = $2::uuid
        )
      LIMIT 1
    `,
    [projectId, userId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    isOnHold: row.risk_hold === true,
    reason: row.risk_hold_reason,
    heldAt: row.risk_hold_at
      ? row.risk_hold_at instanceof Date
        ? row.risk_hold_at.toISOString()
        : String(row.risk_hold_at)
      : null,
  };
}
