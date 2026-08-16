import "server-only";

import { db } from "@/lib/db/pool";
import { createNotification } from "@/features/notifications/server/create-notification";

type ProjectParticipantsRow = {
  customer_id: string;
  contractor_owner_id: string | null;
};

type Input = {
  projectId: string;
  actorUserId: string;
  notificationType: "project_risk_hold_enabled" | "project_risk_hold_disabled";
  title: string;
  body?: string | null;
  deduplicationKey: string;
};

export async function notifyProjectParticipantsAsAdmin(input: Input) {
  const result = await db.query<ProjectParticipantsRow>(
    `
      SELECT
        p.customer_id,
        cc.owner_id AS contractor_owner_id
      FROM public.projects p
      LEFT JOIN public.contractor_companies cc
        ON cc.id = p.selected_contractor_id
      WHERE p.id = $1::uuid
      LIMIT 1
    `,
    [input.projectId]
  );

  const project = result.rows[0];
  if (!project) return { success: false };

  const recipients = [
    {
      userId: project.customer_id,
      url: `/customer/work/${input.projectId}`,
      role: "customer",
    },
    project.contractor_owner_id
      ? {
          userId: project.contractor_owner_id,
          url: `/contractor/work/${input.projectId}`,
          role: "contractor",
        }
      : null,
  ].filter(Boolean) as Array<{
    userId: string;
    url: string;
    role: "customer" | "contractor";
  }>;

  const notificationResults = await Promise.all(
    recipients.map((recipient) =>
      createNotification({
        userId: recipient.userId,
        actorId: input.actorUserId,
        notificationType: input.notificationType,
        title: input.title,
        body: input.body ?? null,
        projectId: input.projectId,
        url: recipient.url,
        deduplicationKey: `${input.deduplicationKey}:user:${recipient.userId}`,
        metadata: {
          project_id: input.projectId,
          participant_role: recipient.role,
        },
      })
    )
  );

  return {
    success: notificationResults.every((item) => item.success),
  };
}
