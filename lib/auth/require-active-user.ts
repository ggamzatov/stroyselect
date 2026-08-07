import { createClient } from
  "@/lib/supabase/server";

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

export async function requireActiveUser(): Promise<RequireActiveUserResult> {
  const supabase =
    await createClient();

  /*
   * Проверяем действующую сессию.
   */
  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      success: false,
      message:
        "Необходимо войти в систему",
      reason:
        "unauthorized",
    };
  }

  /*
   * Получаем профиль непосредственно
   * из базы при каждом Server Action.
   *
   * Здесь не используем getCurrentProfile(),
   * потому что он делает redirect().
   */
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      first_name,
      last_name,
      email,
      is_blocked
    `)
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    console.error(
      "Ошибка загрузки активного профиля:",
      {
        userId:
          user.id,

        message:
          profileError?.message,

        details:
          profileError?.details,

        hint:
          profileError?.hint,

        code:
          profileError?.code,
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

  /*
   * Главная серверная проверка
   * блокировки.
   */
  if (
    profile.is_blocked
  ) {
    return {
      success: false,
      message:
        "Доступ к учётной записи ограничен администрацией",
      reason:
        "blocked",
    };
  }

  return {
    success: true,

    user: {
      id:
        user.id,

      email:
        user.email,
    },

    profile: {
      id:
        profile.id,

      role:
        profile.role,

      first_name:
        profile.first_name,

      last_name:
        profile.last_name,

      email:
        profile.email,

      is_blocked:
        profile.is_blocked,
    },
  };
}