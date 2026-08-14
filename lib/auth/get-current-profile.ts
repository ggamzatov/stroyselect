import "server-only";

import { cache } from "react";

import { redirect } from
  "next/navigation";

import { db } from
  "@/lib/db/pool";

import {
  getCurrentSessionUserId,
} from
  "@/lib/auth/session";

type CurrentAccountRow = {
  id: string;

  email:
    string | null;

  user_phone:
    string | null;

  user_created_at:
    Date | string;

  is_active:
    boolean;

  role:
    string;

  first_name:
    string;

  last_name:
    string | null;

  profile_phone:
    string | null;

  is_blocked:
    boolean;

  blocked_reason:
    string | null;

  blocked_at:
    Date | string | null;

  blocked_by:
    string | null;

  profile_created_at:
    Date | string;

  profile_updated_at:
    Date | string;
};

export const getCurrentProfile =
  cache(async () => {
    const userId =
      await getCurrentSessionUserId();

    if (!userId) {
      redirect(
        "/login"
      );
    }

    const result =
      await db.query<CurrentAccountRow>(
        `
          SELECT
            u.id,

            u.email,

            u.phone
              AS user_phone,

            u.created_at
              AS user_created_at,

            u.is_active,

            p.role,
            p.first_name,
            p.last_name,

            p.phone
              AS profile_phone,

            p.is_blocked,
            p.blocked_reason,
            p.blocked_at,
            p.blocked_by,

            p.created_at
              AS profile_created_at,

            p.updated_at
              AS profile_updated_at

          FROM
            public.users
              u

          JOIN
            public.profiles
              p
            ON p.id =
              u.id

          WHERE
            u.id = $1

          LIMIT 1
        `,
        [
          userId,
        ]
      );

    const row =
      result.rows[0];

    if (!row) {
      throw new Error(
        "Профиль пользователя не найден"
      );
    }

    if (
      !row.is_active ||
      row.is_blocked
    ) {
      redirect(
        "/account-blocked"
      );
    }

    const user = {
      id:
        row.id,

      email:
        row.email,

      phone:
        row.user_phone,

      created_at:
        toIsoString(
          row.user_created_at
        ),

      is_active:
        row.is_active,
    };

    const profile = {
      id:
        row.id,

      role:
        row.role,

      first_name:
        row.first_name,

      last_name:
        row.last_name,

      phone:
        row.profile_phone,

      is_blocked:
        row.is_blocked,

      blocked_reason:
        row.blocked_reason,

      blocked_at:
        row.blocked_at
          ? toIsoString(
              row.blocked_at
            )
          : null,

      blocked_by:
        row.blocked_by,

      created_at:
        toIsoString(
          row.profile_created_at
        ),

      updated_at:
        toIsoString(
          row.profile_updated_at
        ),
    };

    return {
      user,
      profile,
    };
  });

function toIsoString(
  value:
    Date | string
) {
  if (
    value instanceof Date
  ) {
    return value
      .toISOString();
  }

  return String(value);
}