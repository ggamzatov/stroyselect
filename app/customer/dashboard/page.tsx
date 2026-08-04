import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getMyProjects } from
  "@/features/projects/queries/get-my-projects";
import { getCustomerBidsCounts } from
  "@/features/bids/queries/get-customer-new-bids-count";
export default async function CustomerDashboardPage() {
  const { profile } =
    await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

 const [
  projects,
  {
    newBidsCount,
    acceptedBidsCount,
  },
] = await Promise.all([
  getMyProjects(),
  getCustomerBidsCounts(),
]);

  const publishedCount =
    projects.filter(
      (project) =>
        project.status === "published" ||
        project.status === "matching"
    ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm text-slate-500">
          Кабинет заказчика
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Добро пожаловать,{" "}
          {profile.first_name}
        </h1>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <StatCard
            title="Всего проектов"
            value={projects.length}
          />

          <StatCard
            title="Опубликовано"
            value={publishedCount}
          />

         <Link
  href="/customer/bids"
  className="group rounded-2xl border bg-white p-6 transition hover:border-blue-300 hover:shadow-sm"
>
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-sm text-slate-500">
        Предложения подрядчиков
      </p>

      <div className="mt-4 space-y-2">
        <p className="text-base font-medium">
          Новых предложений —{" "}
          <span className="text-2xl font-bold">
            {newBidsCount}
          </span>
        </p>

        <p className="text-base font-medium">
          Принятых предложений —{" "}
          <span className="text-2xl font-bold">
            {acceptedBidsCount}
          </span>
        </p>
      </div>
    </div>

    <span className="text-xl text-slate-400 group-hover:text-blue-700">
      →
    </span>
  </div>
</Link>
        </section>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/customer/projects/new"
            className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white"
          >
            Создать проект
          </Link>

          <Link
            href="/customer/projects"
            className="rounded-xl border bg-white px-5 py-3 font-semibold"
          >
            Мои проекты
          </Link>
        </div>
      </div>
    </main>
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