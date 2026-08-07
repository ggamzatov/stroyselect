import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CircleAlert,
  Clock3,
  ShieldAlert,
  UsersRound,
} from "lucide-react";

import { createClient } from
  "@/lib/supabase/server";

import { AdminStatCard } from
  "@/features/admin/components/admin-stat-card";

export default async function AdminDashboardPage() {
  const supabase =
    await createClient();

  const [
    pendingResult,
    verifiedResult,
    rejectedResult,
    usersResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "contractor_companies"
        )
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "verification_status",
          "pending"
        ),

      supabase
        .from(
          "contractor_companies"
        )
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "verification_status",
          "verified"
        ),

      supabase
        .from(
          "contractor_companies"
        )
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

  const pendingCount =
    pendingResult.count ??
    0;

  const verifiedCount =
    verifiedResult.count ??
    0;

  const rejectedCount =
    rejectedResult.count ??
    0;

  const usersCount =
    usersResult.count ??
    0;

  return (
    <div className="space-y-6">
      {/* Заголовок */}

      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-secondary/70 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
              <ShieldAlert className="h-3.5 w-3.5" />

              Административная панель
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">
              Обзор платформы
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Контролируйте подрядчиков,
              пользователей и ключевые
              процессы СтройВыбора из одного
              рабочего пространства.
            </p>
          </div>

          {pendingCount >
            0 && (
            <Link
              href="/admin/contractors?status=pending"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5"
            >
              Проверить заявки

              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      {/* Статистика */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          title="Ожидают проверки"
          value={
            pendingCount
          }
          description="Новые профили подрядчиков"
          attention={
            pendingCount >
            0
          }
          icon={
            <Clock3 className="h-5 w-5" />
          }
        />

        <AdminStatCard
          title="Подтверждено"
          value={
            verifiedCount
          }
          description="Проверенные подрядчики"
          icon={
            <BadgeCheck className="h-5 w-5" />
          }
        />

        <AdminStatCard
          title="Отклонено"
          value={
            rejectedCount
          }
          description="Профили с замечаниями"
          icon={
            <CircleAlert className="h-5 w-5" />
          }
        />

        <AdminStatCard
          title="Пользователи"
          value={
            usersCount
          }
          description="Все аккаунты платформы"
          icon={
            <UsersRound className="h-5 w-5" />
          }
        />
      </section>

      {/* Основная нижняя часть */}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Требуют внимания */}

        <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">
                Модерация
              </p>

              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                Требуют внимания
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Проверяйте профили подрядчиков
                перед предоставлением доступа
                к опубликованным проектам.
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
              <Building2 className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6">
            {pendingCount >
            0 ? (
              <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-foreground">
                      Новые заявки подрядчиков
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      На проверке находится{" "}
                      <strong className="text-foreground">
                        {pendingCount}
                      </strong>{" "}
                      {formatApplicationCount(
                        pendingCount
                      )}
                    </p>
                  </div>

                  <Link
                    href="/admin/contractors?status=pending"
                    className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary"
                  >
                    Открыть

                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-border bg-background/60 p-8 text-center">
                <BadgeCheck className="mx-auto h-7 w-7 text-primary" />

                <p className="mt-3 font-semibold text-foreground">
                  Всё проверено
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Новых заявок подрядчиков
                  сейчас нет.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Быстрые действия */}

        <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <p className="text-sm font-semibold text-primary">
            Навигация
          </p>

          <h2 className="mt-1 text-xl font-bold text-foreground">
            Быстрые действия
          </h2>

          <div className="mt-5 space-y-2">
            <QuickLink
              href="/admin/contractors"
              title="Подрядчики"
              description="Проверка и модерация"
              icon={
                <Building2 className="h-4 w-4" />
              }
            />

            <QuickLink
              href="/admin/projects"
              title="Проекты"
              description="Просмотр проектов"
              icon={
                <ShieldAlert className="h-4 w-4" />
              }
            />

            <QuickLink
              href="/admin/users"
              title="Пользователи"
              description="Управление аккаунтами"
              icon={
                <UsersRound className="h-4 w-4" />
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-transparent p-3 transition hover:border-border hover:bg-secondary/50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">
          {title}
        </span>

        <span className="mt-0.5 block text-xs text-muted-foreground">
          {description}
        </span>
      </span>

      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function formatApplicationCount(
  value: number
) {
  const lastTwo =
    value % 100;

  const last =
    value % 10;

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return "заявок";
  }

  if (last === 1) {
    return "заявка";
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return "заявки";
  }

  return "заявок";
}