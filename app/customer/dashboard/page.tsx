import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export default async function CustomerDashboardPage() {
  const { profile } = await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            СтройВыбор
          </Link>

          <span className="text-sm text-slate-600">
            {profile.first_name}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Кабинет заказчика
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Добро пожаловать, {profile.first_name}
            </h1>
          </div>

          <Link
            href="/customer/projects/new"
            className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white"
          >
            Создать проект
          </Link>
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-6">
            <p className="text-sm text-slate-500">
              Мои проекты
            </p>
            <p className="mt-2 text-3xl font-bold">0</p>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <p className="text-sm text-slate-500">
              Получено предложений
            </p>
            <p className="mt-2 text-3xl font-bold">0</p>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <p className="text-sm text-slate-500">
              Выбранные подрядчики
            </p>
            <p className="mt-2 text-3xl font-bold">0</p>
          </div>
        </section>
      </div>
    </main>
  );
}