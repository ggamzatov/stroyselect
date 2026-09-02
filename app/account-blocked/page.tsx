import Link from "next/link";
import { redirect } from "next/navigation";
import { Ban, LogOut, ShieldAlert } from "lucide-react";

import { StroyVyborLogo } from "@/components/brand/stroyvybor-logo";
import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";
import { LogoutButton } from "@/features/auth/components/logout-button";

type BlockedProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_blocked: boolean;
  is_active: boolean;
};

export default async function AccountBlockedPage() {
  const userId = await getCurrentSessionUserId();
  if (!userId) redirect("/login");

  const result = await db.query<BlockedProfileRow>(
    `
      SELECT p.id,p.first_name,p.last_name,p.role,p.is_blocked,u.is_active
      FROM public.profiles p
      JOIN public.users u ON u.id = p.id
      WHERE p.id = $1
      LIMIT 1
    `,
    [userId]
  );

  const profile = result.rows[0];
  if (!profile) redirect("/login");
  if (!profile.is_blocked && profile.is_active) redirect("/dashboard");

  const userName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-secondary/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[28rem] w-[28rem] rounded-full bg-secondary/50 blur-3xl" />

      <div className="relative w-full max-w-xl">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="inline-flex min-h-11 items-center" aria-label="СтройВыбор — главная">
            <StroyVyborLogo className="w-[184px]" />
          </Link>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="p-6 md:p-8">
            <div className="flex justify-center"><span className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-red-50 text-red-700"><Ban className="h-7 w-7" /></span></div>

            <div className="mt-6 text-center">
              <p className="text-sm font-semibold text-primary">СтройВыбор</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground">Доступ ограничен</h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                {userName ? `${userName}, доступ к вашей учётной записи временно ограничен администрацией платформы.` : "Доступ к вашей учётной записи временно ограничен администрацией платформы."}
              </p>
            </div>

            <div className="mt-7 rounded-[1.4rem] border border-amber-200 bg-amber-50/70 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><ShieldAlert className="h-4 w-4" /></span>
                <div><p className="font-semibold text-foreground">Что это означает</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Пока ограничение действует, вы не можете пользоваться кабинетом, проектами, предложениями и рабочим пространством платформы.</p></div>
              </div>
            </div>

            <div className="mt-5 rounded-[1.4rem] bg-secondary/50 p-5">
              <p className="text-sm font-semibold text-foreground">Если вы считаете блокировку ошибочной</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Свяжитесь с администрацией СтройВыбора. После восстановления доступа вы сможете снова войти в кабинет без создания нового аккаунта.</p>
            </div>

            <div className="mt-7 border-t border-border pt-6">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><LogOut className="h-4 w-4" />Для входа под другой учётной записью выйдите из текущей.</div>
              <div className="mt-4 flex justify-center"><LogoutButton /></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
