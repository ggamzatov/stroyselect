import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getMyContractorCompany } from
  "@/features/contractors/queries/get-my-contractor-company";

export default async function ContractorDashboardPage() {
  const { profile } =
    await getCurrentProfile();

  if (profile.role !== "contractor") {
    redirect("/dashboard");
  }

  const company =
    await getMyContractorCompany();

  const status =
    company?.verification_status ?? "not_created";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-xl font-bold"
          >
            СтройВыбор
          </Link>

          <span className="text-sm text-slate-600">
            {profile.first_name}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm text-slate-500">
          Кабинет подрядчика
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Добро пожаловать, {profile.first_name}
        </h1>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-6">
            <p className="text-sm text-slate-500">
              Статус профиля
            </p>

            <p className="mt-2 text-xl font-semibold">
              {getStatusText(status)}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <p className="text-sm text-slate-500">
              Новые проекты
            </p>

            <p className="mt-2 text-3xl font-bold">
              0
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <p className="text-sm text-slate-500">
              Предложения
            </p>

            <p className="mt-2 text-3xl font-bold">
              0
            </p>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-semibold">
            Профиль компании
          </h2>

          <p className="mt-2 text-slate-600">
            Заполните информацию о компании,
            специализации и городах работы.
          </p>

          <Link
            href="/contractor/company"
            className="mt-5 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white"
          >
            {company
              ? "Открыть профиль"
              : "Создать профиль"}
          </Link>
        </div>
      </div>
    </main>
  );
}

function getStatusText(status: string) {
  switch (status) {
    case "draft":
      return "Черновик";

    case "pending":
      return "Ожидает проверки";

    case "verified":
      return "Подтвержден";

    case "rejected":
      return "Требует исправлений";

    case "suspended":
      return "Приостановлен";

    default:
      return "Не заполнен";
  }
}