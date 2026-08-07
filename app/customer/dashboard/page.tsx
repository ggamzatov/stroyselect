import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FolderKanban,
  Plus,
} from "lucide-react";

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
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-8 shadow-[var(--shadow-soft)] md:px-10 md:py-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />

          <div className="relative">
            <p className="text-sm font-semibold text-primary">
              Кабинет заказчика
            </p>

            <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-[-0.035em] text-foreground md:text-5xl">
              Добро пожаловать,{" "}
              {profile.first_name}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Управляйте проектами, отслеживайте
              предложения подрядчиков и выбирайте
              лучших исполнителей в одном месте.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/customer/projects/new"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(107,70,50,0.22)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a]"
              >
                <Plus className="h-5 w-5" />
                Создать проект
              </Link>

              <Link
                href="/customer/projects"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 font-semibold text-foreground transition hover:border-primary/30 hover:bg-secondary/60"
              >
                Мои проекты
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Обзор
              </p>

              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                Что происходит сейчас
              </h2>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <StatCard
              title="Всего проектов"
              value={projects.length}
              icon={
                <FolderKanban className="h-5 w-5" />
              }
            />

            <StatCard
              title="Опубликовано"
              value={publishedCount}
              icon={
                <BriefcaseBusiness className="h-5 w-5" />
              }
            />

            <Link
              href="/customer/bids"
              className="group relative overflow-hidden rounded-[1.5rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[var(--shadow-card)]"
            >
              <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[4rem] bg-secondary/60 transition group-hover:bg-accent/40" />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>

                  <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </div>

                <p className="mt-5 text-sm font-medium text-muted-foreground">
                  Предложения подрядчиков
                </p>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-3xl font-bold tracking-tight text-foreground">
                      {newBidsCount}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      новых
                    </p>
                  </div>

                  <div>
                    <p className="text-3xl font-bold tracking-tight text-foreground">
                      {acceptedBidsCount}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      принято
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="stroy-gradient relative overflow-hidden rounded-[2rem] p-7 shadow-[var(--shadow-floating)] md:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

            <div className="relative max-w-xl">
              <p className="text-sm font-medium text-white/70">
                Новый проект
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
                Найдите подходящего подрядчика
                для следующего объекта
              </h2>

              <p className="mt-3 max-w-lg text-sm leading-6 text-white/75">
                Опишите задачу, укажите бюджет и сроки,
                а подрядчики смогут отправить вам свои
                предложения.
              </p>

              <Link
                href="/customer/projects/new"
                className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-5 font-semibold text-primary transition hover:-translate-y-0.5 hover:bg-white/90"
              >
                <Plus className="h-5 w-5" />
                Создать проект
              </Link>
            </div>
          </div>

          <Link
            href="/customer/projects"
            className="group rounded-[2rem] border border-border bg-card p-7 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:border-primary/25 hover:shadow-[var(--shadow-card)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
              <FolderKanban className="h-6 w-6" />
            </div>

            <h3 className="mt-6 text-xl font-bold text-foreground">
              Все проекты
            </h3>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Просматривайте статусы, отклики,
              сроки и текущую работу подрядчиков.
            </p>

            <div className="mt-6 flex items-center gap-2 font-semibold text-primary">
              Открыть проекты

              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="group rounded-[1.5rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
          {icon}
        </div>
      </div>

      <p className="mt-5 text-sm font-medium text-muted-foreground">
        {title}
      </p>

      <p className="mt-2 text-4xl font-bold tracking-[-0.04em] text-foreground">
        {value}
      </p>
    </div>
  );
}