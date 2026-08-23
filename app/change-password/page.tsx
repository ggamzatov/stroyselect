import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export default async function ChangePasswordPage() {
  const auth = await requireActiveUser();
  if (!auth.success) redirect("/login");
  const result = await db.query<{ must_change_password: boolean }>(`SELECT must_change_password FROM public.users WHERE id=$1::uuid LIMIT 1`, [auth.user.id]);
  const mustChange = result.rows[0]?.must_change_password === true;

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <section className="mx-auto w-full max-w-lg rounded-[2rem] border border-border bg-card p-7 shadow-[var(--shadow-card)] md:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><KeyRound className="h-5 w-5" /></div>
        <p className="mt-6 text-sm font-semibold text-primary">Безопасность аккаунта</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{mustChange ? "Создайте новый пароль" : "Сменить пароль"}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{mustChange ? "Вы вошли с временным паролем. Для продолжения работы установите собственный пароль." : "После смены пароля все текущие сеансы будут завершены, и потребуется войти заново."}</p>
        <div className="mt-7"><ChangePasswordForm /></div>
      </section>
    </main>
  );
}
