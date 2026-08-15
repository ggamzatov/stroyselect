import "server-only";

import { redirect } from
  "next/navigation";

import { db } from
  "@/lib/db/pool";

import {
  getCurrentSessionUserId,
} from
  "@/lib/auth/session";

const STAFF_ROLES = [
  "admin",
  "moderator",
  "manager",
] as const;

type StaffRole =
  (typeof STAFF_ROLES)[number];

type StaffUserRow = {
  id: string;

  email:
    string | null;

  is_active:
    boolean;

  first_name:
    string | null;

  last_name:
    string | null;

  role:
    string;

  is_blocked:
    boolean;
};

export async function requireStaffUser() {
  /*
   * ========================================
   * 1. Проверяем локальную сессию
   * ========================================
   */

  const userId =
    await getCurrentSessionUserId();

  if (!userId) {
    redirect(
      "/login"
    );
  }

  /*
   * ========================================
   * 2. Загружаем пользователя
   * ========================================
   */

  const result =
    await db.query<StaffUserRow>(
      `
        SELECT
          u.id,
          u.email,
          u.is_active,

          p.first_name,
          p.last_name,
          p.role,
          p.is_blocked

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
    redirect(
      "/login"
    );
  }

  /*
   * ========================================
   * 3. Проверяем состояние аккаунта
   * ========================================
   */

  if (
    !row.is_active ||
    row.is_blocked
  ) {
    redirect(
      "/account-blocked"
    );
  }

  /*
   * ========================================
   * 4. Проверяем staff role
   * ========================================
   */

  if (
    !STAFF_ROLES.includes(
      row.role as StaffRole
    )
  ) {
    redirect(
      "/dashboard"
    );
  }

  /*
   * ========================================
   * 5. Сохраняем старый контракт
   * ========================================
   */

  const user = {
    id:
      row.id,

    email:
      row.email,
  };

  const profile = {
    id:
      row.id,

    first_name:
      row.first_name,

    last_name:
      row.last_name,

    role:
      row.role,

    is_blocked:
      row.is_blocked,
  };

  return {
    user,
    profile,
  };
}