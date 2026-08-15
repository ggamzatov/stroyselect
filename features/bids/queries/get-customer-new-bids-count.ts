import "server-only";

import { db } from
  "@/lib/db/pool";

import {
  getCurrentSessionUserId,
} from
  "@/lib/auth/session";

export type CustomerBidsCounts = {
  newBidsCount: number;
  acceptedBidsCount: number;
};

type CountsRow = {
  new_bids_count:
    string | number;

  accepted_bids_count:
    string | number;
};

export async function getCustomerBidsCounts(): Promise<CustomerBidsCounts> {
  const userId =
    await getCurrentSessionUserId();

  if (!userId) {
    return {
      newBidsCount: 0,
      acceptedBidsCount: 0,
    };
  }

  try {
    const result =
      await db.query<CountsRow>(
        `
          SELECT
            COUNT(*) FILTER (
              WHERE pb.status =
                'submitted'
            )
              AS new_bids_count,

            COUNT(*) FILTER (
              WHERE pb.status =
                'accepted'
            )
              AS accepted_bids_count

          FROM
            public.project_bids pb

          JOIN
            public.projects p
            ON p.id =
              pb.project_id

          WHERE
            p.customer_id =
              $1
        `,
        [
          userId,
        ]
      );

    const row =
      result.rows[0];

    return {
      newBidsCount:
        safeInteger(
          row
            ?.new_bids_count
        ),

      acceptedBidsCount:
        safeInteger(
          row
            ?.accepted_bids_count
        ),
    };
  } catch (error) {
    console.error(
      "Ошибка подсчёта предложений заказчика:",
      error
    );

    return {
      newBidsCount: 0,
      acceptedBidsCount: 0,
    };
  }
}

function safeInteger(
  value: unknown
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.trunc(
      number
    )
  );
}