import Link from "next/link";

import { createClient } from
  "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    pendingResult,
    verifiedResult,
    rejectedResult,
    usersResult,
  ] = await Promise.all([
    supabase
      .from("contractor_companies")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "verification_status",
        "pending"
      ),

    supabase
      .from("contractor_companies")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "verification_status",
        "verified"
      ),

    supabase
      .from("contractor_companies")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "verification_status",
        "rejected"
      ),

    supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      }),
  ]);

  return (
    <div>
      <div>
        <p className="text-sm text-slate-500">
          Административная панель
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Обзор
        </h1>
      </div>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Ожидают проверки"
          value={pendingResult.count ?? 0}
        />

        <StatCard
          title="Подтверждено"
          value={verifiedResult.count ?? 0}
        />

        <StatCard
          title="Отклонено"
          value={rejectedResult.count ?? 0}
        />

        <StatCard
          title="Пользователи"
          value={usersResult.count ?? 0}
        />
      </section>

      <section className="mt-8 rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-semibold">
          Требуют внимания
        </h2>

        <p className="mt-2 text-slate-600">
          Проверяйте новые профили подрядчиков
          перед публикацией.
        </p>

        <Link
          href="/admin/contractors?status=pending"
          className="mt-5 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white"
        >
          Открыть заявки
        </Link>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}