import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Ban,
  LogOut,
  ShieldAlert,
} from "lucide-react";

import { createClient } from
  "@/lib/supabase/server";

import { LogoutButton } from
  "@/features/auth/components/logout-button";

export default async function AccountBlockedPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
    error,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      first_name,
      last_name,
      role,
      is_blocked
    `)
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (
    error ||
    !profile
  ) {
    redirect("/login");
  }

  /*
   * Если аккаунт уже восстановлен,
   * возвращаем пользователя
   * в обычную маршрутизацию.
   */
  if (
    !profile.is_blocked
  ) {
    redirect("/dashboard");
  }

  const userName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Background */}

      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-secondary/70 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[28rem] w-[28rem] rounded-full bg-secondary/50 blur-3xl" />

      <div className="relative w-full max-w-xl">
        {/* Logo */}

        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-xl font-black tracking-[-0.045em] text-foreground"
          >
            СтройВыбор
          </Link>
        </div>

        {/* Card */}

        <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="p-6 md:p-8">
            <div className="flex justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-red-50 text-red-700">
                <Ban className="h-7 w-7" />
              </span>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm font-semibold text-primary">
                СтройВыбор
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground">
                Доступ ограничен
              </h1>

              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                {userName
                  ? `${userName}, доступ к вашей учётной записи временно ограничен администрацией платформы.`
                  : "Доступ к вашей учётной записи временно ограничен администрацией платформы."}
              </p>
            </div>

            <div className="mt-7 rounded-[1.4rem] border border-amber-200 bg-amber-50/70 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <ShieldAlert className="h-4 w-4" />
                </span>

                <div>
                  <p className="font-semibold text-foreground">
                    Что это означает
                  </p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Пока ограничение действует,
                    вы не можете пользоваться
                    кабинетом, проектами,
                    предложениями и рабочим
                    пространством платформы.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[1.4rem] bg-secondary/50 p-5">
              <p className="text-sm font-semibold text-foreground">
                Если вы считаете блокировку ошибочной
              </p>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Свяжитесь с администрацией
                СтройВыбора. После восстановления
                доступа вы сможете снова войти
                в кабинет без создания нового
                аккаунта.
              </p>
            </div>

            <div className="mt-7 border-t border-border pt-6">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <LogOut className="h-4 w-4" />

                Для входа под другой
                учётной записью выйдите
                из текущей.
              </div>

              <div className="mt-4 flex justify-center">
                <LogoutButton />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}