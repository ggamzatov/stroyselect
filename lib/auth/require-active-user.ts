import "server-only";

import { db } from
  "@/lib/db/pool";

import {
  getCurrentSessionUserId,
} from
  "@/lib/auth/session";

export type ActiveUserProfile = {
  id: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_blocked: boolean;
};

export type RequireActiveUserResult =
  | {
      success: true;

      user: {
        id: string;
        email?: string;
      };

      profile:
        ActiveUserProfile;
    }
  | {
      success: false;

      message: string;

      reason:
        | "unauthorized"
        | "profile_not_found"
        | "blocked";
    };

type ActiveUserRow = {
  id: string;

  email:
    string | null;

  is_active:
    boolean;

  role:
    string;

  first_name:
    string | null;

  last_name:
    string | null;

  is_blocked:
    boolean;
};

export async function requireActiveUser(): Promise<RequireActiveUserResult> {
  /*
   * ========================================
   * 1. Проверяем нашу локальную сессию
   * ========================================
   */

  const userId =
    await getCurrentSessionUserId();

  if (!userId) {
    return {
      success: false,

      message:
        "Необходимо войти в систему",

      reason:
        "unauthorized",
    };
  }

  /*
   * ========================================
   * 2. Загружаем user + profile
   * ========================================
   *
   * Email находится в public.users.
   */

  let row:
    ActiveUserRow |
    undefined;

  try {
    const result =
      await db.query<ActiveUserRow>(
        `
          SELECT
            u.id,
            u.email,
            u.is_active,

            p.role,
            p.first_name,
            p.last_name,
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

    row =
      result.rows[0];
  } catch (error) {
    console.error(
      "Ошибка загрузки активного профиля:",
      {
        userId,
        error,
      }
    );

    return {
      success: false,

      message:
        "Профиль пользователя не найден",

      reason:
        "profile_not_found",
    };
  }

  if (!row) {
    return {
      success: false,

      message:
        "Профиль пользователя не найден",

      reason:
        "profile_not_found",
    };
  }

  /*
   * ========================================
   * 3. Активность аккаунта
   * ========================================
   */

  if (
    !row.is_active ||
    row.is_blocked
  ) {
    return {
      success: false,

      message:
        "Доступ к учётной записи ограничен администрацией",

      reason:
        "blocked",
    };
  }

  /*
   * ========================================
   * 4. Сохраняем прежний контракт
   * ========================================
   */

  return {
    success: true,

    user: {
      id:
        row.id,

      ...(row.email
        ? {
            email:
              row.email,
          }
        : {}),
    },

    profile: {
      id:
        row.id,

      role:
        row.role,

      first_name:
        row.first_name,

      last_name:
        row.last_name,

      email:
        row.email,

      is_blocked:
        row.is_blocked,
    },
  };
}