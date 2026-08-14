import "server-only";

import { db } from
  "@/lib/db/pool";

import {
  getCurrentSessionUserId,
} from
  "@/lib/auth/session";

export async function getMyBidsCount(): Promise<number> {
  const userId =
    await getCurrentSessionUserId();

  if (!userId) {
    return 0;
  }

  try {
    const result =
      await db.query<{
        count: string;
      }>(
        `
          SELECT
            COUNT(pb.id)::text
              AS count
          FROM
            public.contractor_companies
              cc
          LEFT JOIN
            public.project_bids
              pb
            ON pb.contractor_id =
              cc.id
          WHERE
            cc.owner_id =
              $1
        `,
        [
          userId,
        ]
      );

    const count =
      Number(
        result.rows[0]
          ?.count ??
        0
      );

    return Number.isFinite(
      count
    )
      ? count
      : 0;
  } catch (error) {
    console.error(
      "Ошибка подсчёта предложений подрядчика:",
      error
    );

    return 0;
  }
}