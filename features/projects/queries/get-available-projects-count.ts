import "server-only";

import { db } from "@/lib/db/pool";

import {
  getCurrentSessionUserId,
} from "@/lib/auth/session";

type CountRow = {
  count: string | number;
};

export async function getAvailableProjectsCount() {
  const userId =
    await getCurrentSessionUserId();

  if (!userId) {
    return 0;
  }

  try {
    const result =
      await db.query<CountRow>(
        `
          SELECT
            COUNT(p.id)
              AS count

          FROM
            public.contractor_companies cc

          JOIN
            public.projects p
            ON p.status IN (
              'published',
              'collecting_bids'
            )

          WHERE
            cc.owner_id = $1
            AND cc.verification_status =
              'verified'
            AND cc.accepts_new_projects =
              true
        `,
        [userId]
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
      "Ошибка подсчёта проектов:",
      error
    );

    return 0;
  }
}