import Link from "next/link";

import {
  ArrowRight,
  Building2,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import { createClient } from
  "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{
    role?: string;
    q?: string;
  }>;
};

const USER_ROLES = [
  "all",
  "customer",
  "contractor",
  "admin",
] as const;

type UserRole =
  (typeof USER_ROLES)[number];

export default async function AdminUsersPage({
  searchParams,
}: Props) {
  const params =
    await searchParams;

  const requestedRole =
    params.role ??
    "all";

  const role: UserRole =
    USER_ROLES.includes(
      requestedRole as UserRole
    )
      ? (requestedRole as UserRole)
      : "all";

  const search =
    params.q?.trim() ??
    "";

  const supabase =
    await createClient();

  /*
   * Основной запрос пользователей.
   */
  let usersQuery =
    supabase
      .from("profiles")
     .select(`
      id,
      role,
      first_name,
      last_name,
      email,
      phone,
      city,
      is_blocked,
      created_at,
      updated_at
    `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  if (
    role !==
    "all"
  ) {
    usersQuery =
      usersQuery.eq(
        "role",
        role
      );
  }

  if (search) {
  const escapedSearch =
    escapePostgrestSearch(
      search
    );

  usersQuery =
    usersQuery.or(
      `first_name.ilike.%${escapedSearch}%,last_name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%,phone.ilike.%${escapedSearch}%,city.ilike.%${escapedSearch}%`
    );
}

  const {
    data: users,
    error: usersError,
  } =
    await usersQuery;

  if (usersError) {
    console.error(
      "Ошибка загрузки пользователей:",
      {
        message:
          usersError.message,

        details:
          usersError.details,

        hint:
          usersError.hint,

        code:
          usersError.code,
      }
    );

    throw new Error(
      "Не удалось загрузить пользователей"
    );
  }

  /*
   * Счётчики.
   */
  const [
    allCount,
    customerCount,
    contractorCount,
    adminCount,
  ] =
    await Promise.all([
      getUserCount(),

      getUserCount(
        "customer"
      ),

      getUserCount(
        "contractor"
      ),

      getUserCount(
        "admin"
      ),
    ]);

  async function getUserCount(
    targetRole?: string
  ) {
    let query =
      supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        });

    if (
      targetRole
    ) {
      query =
        query.eq(
          "role",
          targetRole
        );
    }

    const {
      count,
    } =
      await query;

    return (
      count ??
      0
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}

      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-secondary/70 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
            <UsersRound className="h-3.5 w-3.5" />

            Управление аккаунтами
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">
            Пользователи
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Просматривайте зарегистрированных
            пользователей, их роли, контактные
            данные и дату регистрации.
          </p>
        </div>
      </section>

      {/* KPI */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Всего"
          value={
            allCount
          }
          icon={
            <UsersRound className="h-5 w-5" />
          }
        />

        <StatCard
          title="Заказчики"
          value={
            customerCount
          }
          icon={
            <UserRound className="h-5 w-5" />
          }
        />

        <StatCard
          title="Подрядчики"
          value={
            contractorCount
          }
          icon={
            <Building2 className="h-5 w-5" />
          }
        />

        <StatCard
          title="Администраторы"
          value={
            adminCount
          }
          icon={
            <ShieldCheck className="h-5 w-5" />
          }
        />
      </section>

      {/* Поиск */}

      <section className="rounded-[1.5rem] border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <form
          method="GET"
          className="flex flex-col gap-3 md:flex-row"
        >
          {role !==
            "all" && (
            <input
              type="hidden"
              name="role"
              value={
                role
              }
            />
          )}

          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="search"
              name="q"
              defaultValue={
                search
              }
              placeholder="Поиск по имени, email, телефону или городу..."
              className="h-11 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
            />
          </div>

          <button
            type="submit"
            className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Найти
          </button>

          {search && (
            <Link
              href={
                role ===
                "all"
                  ? "/admin/users"
                  : `/admin/users?role=${role}`
              }
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              Сбросить
            </Link>
          )}
        </form>
      </section>

      {/* Фильтры */}

      <section className="rounded-[1.5rem] border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap gap-2">
          <RoleFilter
            role="all"
            current={
              role
            }
            search={
              search
            }
            label="Все"
          />

          <RoleFilter
            role="customer"
            current={
              role
            }
            search={
              search
            }
            label="Заказчики"
          />

          <RoleFilter
            role="contractor"
            current={
              role
            }
            search={
              search
            }
            label="Подрядчики"
          />

          <RoleFilter
            role="admin"
            current={
              role
            }
            search={
              search
            }
            label="Администраторы"
          />
        </div>
      </section>

      {/* Список */}

      <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 md:px-6">
          <div>
            <h2 className="font-bold text-foreground">
              Список пользователей
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Найдено:{" "}
              {
                users?.length ??
                0
              }
            </p>
          </div>
        </div>

        {!users ||
        users.length ===
          0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
              <UsersRound className="h-6 w-6" />
            </div>

            <h3 className="mt-4 font-bold text-foreground">
              Пользователи не найдены
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Измените поисковый запрос
              или фильтр.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users.map(
              (user) => (
                <Link
                  key={
                    user.id
                  }
                  href={`/admin/users/${user.id}`}
                  className="group block p-5 transition hover:bg-secondary/30 md:p-6"
                >
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_180px_190px_150px_28px] xl:items-center">
                    {/* Пользователь */}

                    <div className="min-w-0">
                      <div className="flex items-start gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                          {getRoleIcon(
                            user.role
                          )}
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-bold text-foreground">
                              {getUserName(
                                user
                              )}
                            </h3>

                            <RoleBadge
                              role={
                                user.role
                              }
                            />
                            {user.is_blocked && (
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">
                              Заблокирован
                            </span>
                          )}
                          </div>

                          <p className="mt-1 truncate text-sm text-muted-foreground">
                              {user.email ||
                                "Email не указан"}
                            </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {user.phone && (
                              <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                                {
                                  user.phone
                                }
                              </span>
                            )}

                            {user.city && (
                              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">
                                {
                                  user.city
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Роль */}

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Роль
                      </p>

                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatRole(
                          user.role
                        )}
                      </p>
                    </div>

                    {/* Регистрация */}

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Регистрация
                      </p>

                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatDate(
                          user.created_at
                        )}
                      </p>
                    </div>

                    {/* Обновление */}

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Обновлён
                      </p>

                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatDate(
                          user.updated_at
                        )}
                      </p>
                    </div>

                    <ArrowRight className="hidden h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary xl:block" />
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function RoleFilter({
  role,
  current,
  search,
  label,
}: {
  role:
    UserRole;

  current:
    UserRole;

  search:
    string;

  label:
    string;
}) {
  const params =
    new URLSearchParams();

  if (
    role !==
    "all"
  ) {
    params.set(
      "role",
      role
    );
  }

  if (search) {
    params.set(
      "q",
      search
    );
  }

  const query =
    params.toString();

  return (
    <Link
      href={
        query
          ? `/admin/users?${query}`
          : "/admin/users"
      }
      className={[
        "inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold transition",
        current ===
        role
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </Link>
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
    <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
        {icon}
      </span>

      <p className="mt-5 text-3xl font-black tracking-[-0.04em] text-foreground">
        {value}
      </p>

      <p className="mt-1 text-sm font-semibold text-muted-foreground">
        {title}
      </p>
    </div>
  );
}

function RoleBadge({
  role,
}: {
  role: string;
}) {
  const config =
    getRoleConfig(
      role
    );

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function getRoleConfig(
  role: string
) {
  switch (role) {
    case "customer":
      return {
        label:
          "Заказчик",

        className:
          "bg-blue-50 text-blue-700",
      };

    case "contractor":
      return {
        label:
          "Подрядчик",

        className:
          "bg-amber-50 text-amber-700",
      };

    case "admin":
      return {
        label:
          "Администратор",

        className:
          "bg-violet-50 text-violet-700",
      };

    default:
      return {
        label:
          role,

        className:
          "bg-secondary text-primary",
      };
  }
}

function getRoleIcon(
  role: string
) {
  switch (role) {
    case "customer":
      return (
        <UserRound className="h-5 w-5" />
      );

    case "contractor":
      return (
        <Building2 className="h-5 w-5" />
      );

    case "admin":
      return (
        <ShieldCheck className="h-5 w-5" />
      );

    default:
      return (
        <UsersRound className="h-5 w-5" />
      );
  }
}

function formatRole(
  role: string
) {
  switch (role) {
    case "customer":
      return "Заказчик";

    case "contractor":
      return "Подрядчик";

    case "admin":
      return "Администратор";

    default:
      return role;
  }
}

function getUserName(
  user: {
    first_name:
      string | null;

    last_name:
      string | null;
  }
) {
  return (
    [
      user.first_name,
      user.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Пользователь"
  );
}

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "Не указано";
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    }
  ).format(
    new Date(value)
  );
}

function escapePostgrestSearch(
  value: string
) {
  return value
    .replace(
      /[%_,()]/g,
      ""
    )
    .slice(
      0,
      100
    );
}