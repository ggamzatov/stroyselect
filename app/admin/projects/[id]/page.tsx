import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectAdminActions } from
  "@/features/admin/components/project-admin-actions";

import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderKanban,
  MapPin,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import { createClient } from
  "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminProjectPage({
  params,
}: Props) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  const {
    data: project,
    error,
  } = await supabase
    .from("projects")
        .select(`
    id,
    customer_id,
    selected_contractor_id,
    selected_bid_id,
    title,
    description,
    status,
    property_type,
    region,
    city,
    address,
    budget_min,
    budget_max,
    desired_start_date,
    desired_end_date,

    is_admin_blocked,
    admin_block_reason,
    admin_blocked_at,
    admin_blocked_by,

    contractor_selected_at,
    work_started_at,
    completed_at,
    created_at,
    updated_at
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (
    error ||
    !project
  ) {
    if (error) {
      console.error(
        "Ошибка загрузки проекта администратором:",
        error
      );
    }

    notFound();
  }

  /*
   * Заказчик.
   */
  const {
    data: customer,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      first_name,
      last_name,
      phone,
      email,
      city
    `)
    .eq(
      "id",
      project.customer_id
    )
    .maybeSingle();

  /*
   * Подрядчик.
   */
  const {
    data: contractor,
  } =
    project.selected_contractor_id
      ? await supabase
          .from(
            "contractor_companies"
          )
          .select(`
            id,
            public_name,
            legal_name,
            contact_phone,
            contact_email,
            verification_status,
            rating,
            rating_count
          `)
          .eq(
            "id",
            project.selected_contractor_id
          )
          .maybeSingle()
      : {
          data: null,
        };

  /*
   * Этапы.
   */
  const {
    data: stages,
  } = await supabase
    .from(
      "project_stages"
    )
    .select(`
      id,
      title,
      status,
      price,
      progress_weight,
      planned_start_date,
      planned_end_date,
      actual_started_at,
      actual_completed_at
    `)
    .eq(
      "project_id",
      project.id
    )
    .order(
      "sort_order",
      {
        ascending: true,
      }
    );

  /*
   * События.
   */
  const {
    data: events,
  } = await supabase
    .from(
      "project_events"
    )
    .select(`
      id,
      event_type,
      title,
      description,
      created_at
    `)
    .eq(
      "project_id",
      project.id
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(20);

  const completedStages =
    (
      stages ??
      []
    ).filter(
      (stage) =>
        stage.status ===
        "completed"
    );

  const progress =
    calculateProgress(
      stages ??
      []
    );

  return (
    <div className="space-y-6">
      <Link
        href="/admin/projects"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />

        Вернуться к проектам
      </Link>

      {/* Hero */}

      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-secondary/70 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.3rem] bg-primary text-primary-foreground">
              <FolderKanban className="h-6 w-6" />
            </span>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">
                Проект
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">
                {
                  project.title
                }
              </h1>

              {(project.city ||
                project.region) && (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />

                  {[
                    project.region,
                    project.city,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
          </div>

         <div className="flex flex-col items-end gap-3">
            <ProjectStatusBadge
                status={project.status}
            />

            {project.is_admin_blocked && (
                <span className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white">
                Заблокирован администрацией
                </span>
            )}
            </div>
        </div>
      </section>

      {/* KPI */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DataCard
          icon={
            <Banknote className="h-5 w-5" />
          }
          label="Бюджет"
          value={formatBudget(
            project.budget_min,
            project.budget_max
          )}
        />

        <DataCard
          icon={
            <CheckCircle2 className="h-5 w-5" />
          }
          label="Прогресс"
          value={`${progress}%`}
        />

        <DataCard
          icon={
            <Clock3 className="h-5 w-5" />
          }
          label="Этапы"
          value={`${completedStages.length} / ${
            stages?.length ??
            0
          }`}
        />

        <DataCard
          icon={
            <CalendarDays className="h-5 w-5" />
          }
          label="Создан"
          value={formatDateTime(
            project.created_at
          )}
        />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {/* Описание */}

          <Section
            title="Описание проекта"
            icon={
              <FolderKanban className="h-5 w-5" />
            }
          >
            <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {project.description ||
                "Описание не указано."}
            </p>
          </Section>

          {/* Данные */}

          <Section
            title="Параметры проекта"
            icon={
              <Building2 className="h-5 w-5" />
            }
          >
            <InfoRow
              label="Тип объекта"
              value={
                project.property_type
              }
            />

            <InfoRow
              label="Регион"
              value={
                project.region
              }
            />

            <InfoRow
              label="Город"
              value={
                project.city
              }
            />

            <InfoRow
              label="Адрес"
              value={
                project.address
              }
            />

            <InfoRow
              label="Плановое начало"
              value={formatDate(
                project.desired_start_date
              )}
            />

            <InfoRow
              label="Плановое окончание"
              value={formatDate(
                project.desired_end_date
              )}
            />
          </Section>

          {/* Этапы */}

          <Section
            title="Этапы работ"
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
          >
            {!stages ||
            stages.length ===
              0 ? (
              <EmptyText text="Этапы проекта не созданы." />
            ) : (
              <div className="space-y-3">
                {stages.map(
                  (
                    stage,
                    index
                  ) => (
                    <article
                      key={
                        stage.id
                      }
                      className="rounded-[1.25rem] border border-border bg-background/60 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Этап{" "}
                            {index +
                              1}
                          </p>

                          <h3 className="mt-1 font-bold text-foreground">
                            {
                              stage.title
                            }
                          </h3>
                        </div>

                        <StageStatusBadge
                          status={
                            stage.status
                          }
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>
                          Доля:{" "}
                          <strong className="text-foreground">
                            {
                              stage.progress_weight
                            }
                            %
                          </strong>
                        </span>

                        <span>
                          Стоимость:{" "}
                          <strong className="text-foreground">
                            {formatMoney(
                              stage.price
                            )}
                          </strong>
                        </span>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </Section>

          {/* История */}

          <Section
            title="История проекта"
            icon={
              <Clock3 className="h-5 w-5" />
            }
          >
            {!events ||
            events.length ===
              0 ? (
              <EmptyText text="Событий пока нет." />
            ) : (
              <div className="space-y-4">
                {events.map(
                  (event) => (
                    <article
                      key={
                        event.id
                      }
                      className="border-l-2 border-border pl-4"
                    >
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(
                          event.created_at
                        )}
                      </p>

                      <h3 className="mt-1 font-semibold text-foreground">
                        {
                          event.title
                        }
                      </h3>

                      {event.description && (
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {
                            event.description
                          }
                        </p>
                      )}
                    </article>
                  )
                )}
              </div>
            )}
          </Section>
        </div>

       {/* Правая колонка */}

            <aside className="space-y-5 xl:sticky xl:top-24">
            <Section
                title="Управление проектом"
                icon={
                <ShieldCheck className="h-5 w-5" />
                }
            >
                <ProjectAdminActions
                projectId={project.id}
                isBlocked={project.is_admin_blocked}
                blockReason={project.admin_block_reason}
                />
            </Section>

            <Section
                title="Заказчик"
                icon={
                <UserRound className="h-5 w-5" />
                }
            >
    ...
            {customer ? (
              <div className="space-y-3">
                <InfoRow
                  label="Имя"
                  value={getPersonName(
                    customer
                  )}
                />

                <InfoRow
                  label="Телефон"
                  value={
                    customer.phone
                  }
                />

                <InfoRow
                  label="Email"
                  value={
                    customer.email
                  }
                />

                <InfoRow
                  label="Город"
                  value={
                    customer.city
                  }
                />
              </div>
            ) : (
              <EmptyText text="Данные заказчика не найдены." />
            )}
          </Section>

          <Section
            title="Подрядчик"
            icon={
              <UsersRound className="h-5 w-5" />
            }
          >
            {!contractor ? (
              <EmptyText text="Подрядчик ещё не выбран." />
            ) : (
              <div className="space-y-3">
                <InfoRow
                  label="Компания"
                  value={
                    contractor.public_name
                  }
                />

                <InfoRow
                  label="Юридическое имя"
                  value={
                    contractor.legal_name
                  }
                />

                <InfoRow
                  label="Телефон"
                  value={
                    contractor.contact_phone
                  }
                />

                <InfoRow
                  label="Рейтинг"
                  value={`${Number(
                    contractor.rating ??
                      0
                  ).toFixed(1)} · ${
                    contractor.rating_count ??
                    0
                  } отзывов`}
                />

                <Link
                  href={`/admin/contractors/${contractor.id}`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-primary transition hover:bg-secondary/80"
                >
                  Открыть подрядчика
                </Link>
              </div>
            )}
          </Section>

          <Section
            title="Основные даты"
            icon={
              <CalendarDays className="h-5 w-5" />
            }
          >
            <InfoRow
              label="Подрядчик выбран"
              value={formatDateTimeNullable(
                project.contractor_selected_at
              )}
            />

            <InfoRow
              label="Работы начаты"
              value={formatDateTimeNullable(
                project.work_started_at
              )}
            />

            <InfoRow
              label="Завершён"
              value={formatDateTimeNullable(
                project.completed_at
              )}
            />
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon:
    React.ReactNode;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
          {icon}
        </span>

        <h2 className="font-bold text-foreground">
          {title}
        </h2>
      </div>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

function DataCard({
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
    <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
        {icon}
      </span>

      <p className="mt-4 text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label:
    string;

  value:
    string | null | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 first:pt-0 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="max-w-[60%] break-words text-right text-sm font-semibold text-foreground">
        {value ||
          "Не указано"}
      </span>
    </div>
  );
}

function ProjectStatusBadge({
  status,
}: {
  status:
    string;
}) {
  const config =
    getStatusConfig(
      status
    );

  return (
    <span
      className={`rounded-full px-4 py-2 text-xs font-bold ${config.className}`}
    >
      {
        config.label
      }
    </span>
  );
}

function StageStatusBadge({
  status,
}: {
  status:
    string;
}) {
  const labels:
    Record<
      string,
      string
    > = {
    planned:
      "Запланирован",

    in_progress:
      "Выполняется",

    awaiting_review:
      "На проверке",

    revision_required:
      "Доработка",

    completed:
      "Завершён",

    cancelled:
      "Отменён",
  };

  return (
    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">
      {labels[
        status
      ] ??
        status}
    </span>
  );
}

function getStatusConfig(
  status:
    string
) {
  switch (
    status
  ) {
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

function calculateProgress(
  stages: Array<{
    status:
      string;

    progress_weight:
      number;
  }>
) {
  if (
    stages.length ===
    0
  ) {
    return 0;
  }

  return Math.min(
    100,
    stages
      .filter(
        (stage) =>
          stage.status ===
          "completed"
      )
      .reduce(
        (
          total,
          stage
        ) =>
          total +
          Number(
            stage.progress_weight ??
              0
          ),
        0
      )
  );
}

function getPersonName(
  value: {
    first_name:
      string | null;

    last_name:
      string | null;
  }
) {
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

function formatMoney(
  value:
    | number
    | string
    | null
) {
  if (
    value === null
  ) {
    return "Не указана";
  }

  return new Intl.NumberFormat(
    "ru-RU",
    {
      style:
        "currency",

      currency:
        "RUB",

      maximumFractionDigits:
        0,
    }
  ).format(
    Number(value)
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
  if (
    min !== null &&
    max !== null
  ) {
    return `${formatMoney(
      min
    )} — ${formatMoney(
      max
    )}`;
  }

  if (
    min !== null
  ) {
    return `От ${formatMoney(
      min
    )}`;
  }

  if (
    max !== null
  ) {
    return `До ${formatMoney(
      max
    )}`;
  }

  return "Не указан";
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
      dateStyle:
        "medium",
    }
  ).format(
    new Date(
      `${value}T00:00:00`
    )
  );
}

function formatDateTime(
  value:
    string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    new Date(value)
  );
}

function formatDateTimeNullable(
  value:
    | string
    | null
) {
  if (!value) {
    return "Не указано";
  }

  return formatDateTime(
    value
  );
}

function EmptyText({
  text,
}: {
  text:
    string;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      {text}
    </p>
  );
}