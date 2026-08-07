import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Hammer,
  MapPin,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";

import { createClient } from
  "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{
    status?: string;
    q?: string;
  }>;
};

const PROJECT_STATUSES = [
  "all",
  "draft",
  "published",
  "contractor_selected",
  "in_progress",
  "completed",
  "disputed",
] as const;

type ProjectStatus =
  (typeof PROJECT_STATUSES)[number];

export default async function AdminProjectsPage({
  searchParams,
}: Props) {
  const params =
    await searchParams;

  const requestedStatus =
    params.status ??
    "all";

  const status: ProjectStatus =
    PROJECT_STATUSES.includes(
      requestedStatus as ProjectStatus
    )
      ? (requestedStatus as ProjectStatus)
      : "all";

  const search =
    params.q?.trim() ??
    "";

  const supabase =
    await createClient();

  /*
   * Основной запрос проектов.
   */
  let projectsQuery =
    supabase
      .from("projects")
      .select(`
        id,
        customer_id,
        selected_contractor_id,
        title,
        description,
        status,
        city,
        region,
        address,
        budget_min,
        budget_max,
        created_at,
        updated_at,
        contractor_selected_at,
        work_started_at,
        completed_at
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  if (
    status !==
    "all"
  ) {
    projectsQuery =
      projectsQuery.eq(
        "status",
        status
      );
  }

  if (search) {
    const escapedSearch =
      escapePostgrestSearch(
        search
      );

    projectsQuery =
      projectsQuery.or(
        `title.ilike.%${escapedSearch}%,city.ilike.%${escapedSearch}%,region.ilike.%${escapedSearch}%`
      );
  }

  const {
    data: rawProjects,
    error: projectsError,
  } =
    await projectsQuery;

  if (projectsError) {
    console.error(
      "Ошибка загрузки проектов администратора:",
      {
        message:
          projectsError.message,

        details:
          projectsError.details,

        hint:
          projectsError.hint,

        code:
          projectsError.code,
      }
    );

    throw new Error(
      "Не удалось загрузить проекты"
    );
  }

  const projects =
    rawProjects ??
    [];

  /*
   * Получаем заказчиков отдельным
   * запросом, чтобы не зависеть
   * от PostgREST relation.
   */
  const customerIds =
    Array.from(
      new Set(
        projects
          .map(
            (project) =>
              project.customer_id
          )
          .filter(Boolean)
      )
    );

  const {
    data: customers,
    error: customersError,
  } =
    customerIds.length >
    0
      ? await supabase
          .from("profiles")
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone
          `)
          .in(
            "id",
            customerIds
          )
      : {
          data: [],
          error: null,
        };

  if (customersError) {
    console.error(
      "Ошибка загрузки заказчиков проектов:",
      customersError
    );
  }

  /*
   * Компании подрядчиков.
   */
  const contractorIds =
    Array.from(
      new Set(
        projects
          .map(
            (project) =>
              project.selected_contractor_id
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          )
      )
    );

  const {
    data: contractors,
    error: contractorsError,
  } =
    contractorIds.length >
    0
      ? await supabase
          .from(
            "contractor_companies"
          )
          .select(`
            id,
            public_name,
            verification_status
          `)
          .in(
            "id",
            contractorIds
          )
      : {
          data: [],
          error: null,
        };

  if (
    contractorsError
  ) {
    console.error(
      "Ошибка загрузки подрядчиков проектов:",
      contractorsError
    );
  }

  /*
   * Статистика по всем проектам.
   */
  const [
    totalResult,
    publishedResult,
    progressResult,
    completedResult,
    disputedResult,
  ] =
    await Promise.all([
      getProjectCount(),

      getProjectCount(
        "published"
      ),

      getProjectCount(
        "in_progress"
      ),

      getProjectCount(
        "completed"
      ),

      getProjectCount(
        "disputed"
      ),
    ]);

  async function getProjectCount(
    projectStatus?: string
  ) {
    let query =
      supabase
        .from("projects")
        .select("*", {
          count: "exact",
          head: true,
        });

    if (
      projectStatus
    ) {
      query =
        query.eq(
          "status",
          projectStatus
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

  function getCustomer(
    customerId: string
  ) {
    return (
      customers?.find(
        (customer) =>
          customer.id ===
          customerId
      ) ??
      null
    );
  }

  function getContractor(
    contractorId:
      | string
      | null
  ) {
    if (
      !contractorId
    ) {
      return null;
    }

    return (
      contractors?.find(
        (contractor) =>
          contractor.id ===
          contractorId
      ) ??
      null
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}

      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-secondary/70 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
            <FolderKanban className="h-3.5 w-3.5" />

            Управление платформой
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">
            Проекты
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Просматривайте все проекты,
            контролируйте их статусы,
            заказчиков, подрядчиков и
            спорные ситуации.
          </p>
        </div>
      </section>

      {/* KPI */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={
            <FolderKanban className="h-5 w-5" />
          }
          title="Всего"
          value={
            totalResult
          }
        />

        <StatCard
          icon={
            <Clock3 className="h-5 w-5" />
          }
          title="Опубликовано"
          value={
            publishedResult
          }
        />

        <StatCard
          icon={
            <Hammer className="h-5 w-5" />
          }
          title="В работе"
          value={
            progressResult
          }
        />

        <StatCard
          icon={
            <CheckCircle2 className="h-5 w-5" />
          }
          title="Завершено"
          value={
            completedResult
          }
        />

        <StatCard
          icon={
            <AlertTriangle className="h-5 w-5" />
          }
          title="Споры"
          value={
            disputedResult
          }
          attention={
            disputedResult >
            0
          }
        />
      </section>

      {/* Поиск */}

      <section className="rounded-[1.5rem] border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <form
          method="GET"
          className="flex flex-col gap-3 md:flex-row"
        >
          {status !==
            "all" && (
            <input
              type="hidden"
              name="status"
              value={
                status
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
              placeholder="Поиск по названию, городу или региону..."
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
                status ===
                "all"
                  ? "/admin/projects"
                  : `/admin/projects?status=${status}`
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
          <StatusFilter
            status="all"
            current={
              status
            }
            search={
              search
            }
            label="Все"
          />

          <StatusFilter
            status="draft"
            current={
              status
            }
            search={
              search
            }
            label="Черновики"
          />

          <StatusFilter
            status="published"
            current={
              status
            }
            search={
              search
            }
            label="Опубликованные"
          />

          <StatusFilter
            status="contractor_selected"
            current={
              status
            }
            search={
              search
            }
            label="Подрядчик выбран"
          />

          <StatusFilter
            status="in_progress"
            current={
              status
            }
            search={
              search
            }
            label="В работе"
          />

          <StatusFilter
            status="completed"
            current={
              status
            }
            search={
              search
            }
            label="Завершённые"
          />

          <StatusFilter
            status="disputed"
            current={
              status
            }
            search={
              search
            }
            label="Споры"
          />
        </div>
      </section>

      {/* Список */}

      <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 md:px-6">
          <div>
            <h2 className="font-bold text-foreground">
              Список проектов
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Найдено:{" "}
              {
                projects.length
              }
            </p>
          </div>
        </div>

        {projects.length ===
        0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
              <FolderKanban className="h-6 w-6" />
            </div>

            <h3 className="mt-4 font-bold text-foreground">
              Проекты не найдены
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Попробуйте изменить фильтр
              или поисковый запрос.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {projects.map(
              (project) => {
                const customer =
                  getCustomer(
                    project.customer_id
                  );

                const contractor =
                  getContractor(
                    project.selected_contractor_id
                  );

                return (
                  <Link
                    key={
                      project.id
                    }
                    href={`/admin/projects/${project.id}`}
                    className="group block p-5 transition hover:bg-secondary/30 md:p-6"
                  >
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_190px_190px_160px_28px] xl:items-center">
                      {/* Проект */}

                      <div className="min-w-0">
                        <div className="flex items-start gap-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                            <FolderKanban className="h-5 w-5" />
                          </span>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-foreground">
                                {
                                  project.title
                                }
                              </h3>

                              <ProjectStatusBadge
                                status={
                                  project.status
                                }
                              />
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                              {project.city && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />

                                  {
                                    project.city
                                  }
                                </span>
                              )}

                              <span>
                                Создан{" "}
                                {formatDate(
                                  project.created_at
                                )}
                              </span>
                            </div>

                            <p className="mt-3 text-sm font-semibold text-foreground">
                              {formatBudget(
                                project.budget_min,
                                project.budget_max
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Заказчик */}

                      <PersonBlock
                        icon={
                          <UserRound className="h-4 w-4" />
                        }
                        label="Заказчик"
                        value={
                          getPersonName(
                            customer
                          )
                        }
                      />

                      {/* Подрядчик */}

                      <PersonBlock
                        icon={
                          <UsersRound className="h-4 w-4" />
                        }
                        label="Подрядчик"
                        value={
                          contractor
                            ?.public_name ??
                          "Не выбран"
                        }
                      />

                      {/* Обновление */}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Обновлён
                        </p>

                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {formatDate(
                            project.updated_at
                          )}
                        </p>
                      </div>

                      <ArrowRight className="hidden h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary xl:block" />
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusFilter({
  status,
  current,
  search,
  label,
}: {
  status:
    ProjectStatus;

  current:
    ProjectStatus;

  search:
    string;

  label:
    string;
}) {
  const params =
    new URLSearchParams();

  if (
    status !==
    "all"
  ) {
    params.set(
      "status",
      status
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
          ? `/admin/projects?${query}`
          : "/admin/projects"
      }
      className={[
        "inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold transition",
        current ===
        status
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function StatCard({
  icon,
  title,
  value,
  attention = false,
}: {
  icon:
    React.ReactNode;

  title: string;

  value: number;

  attention?:
    boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div
        className={[
          "flex h-10 w-10 items-center justify-center rounded-2xl",
          attention
            ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
            : "bg-secondary text-primary",
        ].join(" ")}
      >
        {icon}
      </div>

      <p className="mt-5 text-3xl font-black tracking-[-0.04em] text-foreground">
        {value}
      </p>

      <p className="mt-1 text-sm font-semibold text-muted-foreground">
        {title}
      </p>
    </div>
  );
}

function PersonBlock({
  icon,
  label,
  value,
}: {
  icon:
    React.ReactNode;

  label:
    string;

  value:
    string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}

        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function ProjectStatusBadge({
  status,
}: {
  status: string;
}) {
  const config =
    getProjectStatusConfig(
      status
    );

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function getProjectStatusConfig(
  status: string
) {
  switch (status) {
    case "draft":
      return {
        label:
          "Черновик",

        className:
          "bg-slate-100 text-slate-700",
      };

    case "published":
      return {
        label:
          "Опубликован",

        className:
          "bg-blue-50 text-blue-700",
      };

    case "contractor_selected":
      return {
        label:
          "Подрядчик выбран",

        className:
          "bg-violet-50 text-violet-700",
      };

    case "in_progress":
      return {
        label:
          "В работе",

        className:
          "bg-amber-50 text-amber-700",
      };

    case "completed":
      return {
        label:
          "Завершён",

        className:
          "bg-emerald-50 text-emerald-700",
      };

    case "disputed":
      return {
        label:
          "Спор",

        className:
          "bg-red-50 text-red-700",
      };

    default:
      return {
        label:
          status,

        className:
          "bg-secondary text-primary",
      };
  }
}

function getPersonName(
  value:
    | {
        first_name:
          string | null;

        last_name:
          string | null;
      }
    | null
) {
  if (!value) {
    return "Не найден";
  }

  return (
    [
      value.first_name,
      value.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Пользователь"
  );
}

function formatBudget(
  min:
    | number
    | string
    | null,

  max:
    | number
    | string
    | null
) {
  const formatter =
    new Intl.NumberFormat(
      "ru-RU",
      {
        style:
          "currency",

        currency:
          "RUB",

        maximumFractionDigits:
          0,
      }
    );

  if (
    min !== null &&
    max !== null
  ) {
    return `${formatter.format(
      Number(min)
    )} — ${formatter.format(
      Number(max)
    )}`;
  }

  if (
    min !== null
  ) {
    return `От ${formatter.format(
      Number(min)
    )}`;
  }

  if (
    max !== null
  ) {
    return `До ${formatter.format(
      Number(max)
    )}`;
  }

  return "Бюджет не указан";
}

function formatDate(
  value: string
) {
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