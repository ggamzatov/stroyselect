import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from
  "@/lib/supabase/server";

export const getCurrentProfile =
  cache(async () => {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      redirect("/login");
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile
    ) {
      throw new Error(
        "Профиль пользователя не найден"
      );
    }

    /*
     * Заблокированный пользователь
     * не должен попадать
     * в обычные кабинеты.
     */
    if (
      profile.is_blocked
    ) {
      redirect(
        "/account-blocked"
      );
    }

    return {
      user,
      profile,
    };
  });