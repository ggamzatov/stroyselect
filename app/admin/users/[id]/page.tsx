import Link from "next/link";
import { notFound } from "next/navigation";
import { UserAdminActions } from
  "@/features/admin/components/user-admin-actions";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  FolderKanban,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { createClient } from
  "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminUserPage({
  params,
}: Props) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  const {
  data: profile,
  error: profileError,
} = await supabase
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
  .eq(
    "id",
    id
  )
  .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    if (profileError) {
      console.error(
        "Ошибка загрузки пользователя:",
        profileError
      );
    }

    notFound();
  }

  /*
   * Если пользователь — подрядчик,
   * ищем его компанию.
   */
  const {
    data: company,
  } =
    profile.role ===
    "contractor"
      ? await supabase
          .from(
            "contractor_companies"
          )
          .select(`
            id,
            public_name,
            legal_name,
            company_type,
            inn,
            ogrn,
            verification_status,
            rating,
            rating_count,
            accepts_new_projects,
            contact_phone,
            contact_email,
            created_at
          `)
          .eq(
            "owner_id",
            profile.id
          )
          .maybeSingle()
      : {
          data: null,
        };

  /*
   * Проекты пользователя.
   *
   * Для заказчика —
   * проекты, которые он создал.
   */
  const {
    data: customerProjects,
  } =
    profile.role ===
    "customer"
      ? await supabase
          .from("projects")
          .select(`
            id,
            title,
            status,
            city,
            budget_min,
            budget_max,
            created_at
          `)
          .eq(
            "customer_id",
            profile.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(10)
      : {
          data: [],
        };

  /*
   * Для подрядчика —
   * проекты, где выбрана его компания.
   */
  const {
    data: contractorProjects,
  } =
    company
      ? await supabase
          .from("projects")
          .select(`
            id,
            title,
            status,
            city,
            budget_min,
            budget_max,
            created_at
          `)
          .eq(
            "selected_contractor_id",
            company.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(10)
      : {
          data: [],
        };

  const projects =
    profile.role ===
    "customer"
      ? customerProjects ??
        []
      : contractorProjects ??
        [];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />

        Вернуться к пользователям
      </Link>

      {/* Hero */}

      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-secondary/70 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.3rem] bg-primary text-primary-foreground">
              {getRoleIcon(
                profile.role
              )}
            </span>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">
                Пользователь
              </p>

              <h1 className="mt-1 break-words text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">
                {getUserName(
                  profile
                )}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <RoleBadge
                  role={
                    profile.role
                  }
                />

                {profile.city && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />

                    {
                      profile.city
                    }
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KPI */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DataCard
          icon={
            <UserRound className="h-5 w-5" />
          }
          label="Роль"
          value={formatRole(
            profile.role
          )}
        />

        <DataCard
          icon={
            <CalendarDays className="h-5 w-5" />
          }
          label="Регистрация"
          value={formatDateTime(
            profile.created_at
          )}
        />

        <DataCard
          icon={
            <CalendarDays className="h-5 w-5" />
          }
          label="Последнее обновление"
          value={formatDateTime(
            profile.updated_at
          )}
        />

        <DataCard
          icon={
            <FolderKanban className="h-5 w-5" />
          }
          label="Проектов"
          value={String(
            projects.length
          )}
        />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {/* Основные данные */}

          <Section
            title="Основная информация"
            icon={
              <UserRound className="h-5 w-5" />
            }
          >
            <InfoRow
              label="Имя"
              value={
                profile.first_name
              }
            />

            <InfoRow
              label="Фамилия"
              value={
                profile.last_name
              }
            />

            <InfoRow
              label="Роль"
              value={formatRole(
                profile.role
              )}
            />

            <InfoRow
              label="Город"
              value={
                profile.city
              }
            />
          </Section>

          {/* Контакты */}

          <Section
            title="Контактные данные"
            icon={
              <Mail className="h-5 w-5" />
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <ContactCard
                icon={
                  <Mail className="h-4 w-4" />
                }
                label="Email"
                value={
                  profile.email
                }
              />

              <ContactCard
                icon={
                  <Phone className="h-4 w-4" />
                }
                label="Телефон"
                value={
                  profile.phone
                }
              />
            </div>
          </Section>

          {/* Компания подрядчика */}

          {profile.role ===
            "contractor" && (
            <Section
              title="Компания подрядчика"
              icon={
                <Building2 className="h-5 w-5" />
              }
            >
              {!company ? (
                <EmptyText text="Компания подрядчика не создана." />
              ) : (
                <div className="space-y-4">
                  <InfoRow
                    label="Публичное название"
                    value={
                      company.public_name
                    }
                  />

                  <InfoRow
                    label="Юридическое название"
                    value={
                      company.legal_name
                    }
                  />

                  <InfoRow
                    label="Тип"
                    value={formatCompanyType(
                      company.company_type
                    )}
                  />

                  <InfoRow
                    label="ИНН"
                    value={
                      company.inn
                    }
                  />

                  <InfoRow
                    label="ОГРН / ОГРНИП"
                    value={
                      company.ogrn
                    }
                  />

                  <InfoRow
                    label="Статус проверки"
                    value={formatVerificationStatus(
                      company.verification_status
                    )}
                  />

                  <InfoRow
                    label="Рейтинг"
                    value={`${Number(
                      company.rating ??
                        0
                    ).toFixed(1)} · ${
                      company.rating_count ??
                      0
                    } отзывов`}
                  />

                  <InfoRow
                    label="Принимает новые проекты"
                    value={
                      company.accepts_new_projects
                        ? "Да"
                        : "Нет"
                    }
                  />

                  <Link
                    href={`/admin/contractors/${company.id}`}
                    className="mt-2 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5"
                  >
                    Открыть карточку компании
                  </Link>
                </div>
              )}
            </Section>
          )}

          {/* Проекты */}

          <Section
            title={
              profile.role ===
              "contractor"
                ? "Проекты подрядчика"
                : "Проекты заказчика"
            }
            icon={
              <FolderKanban className="h-5 w-5" />
            }
          >
            {projects.length ===
            0 ? (
              <EmptyText text="Проектов пока нет." />
            ) : (
              <div className="space-y-3">
                {projects.map(
                  (project) => (
                    <Link
                      key={
                        project.id
                      }
                      href={`/admin/projects/${project.id}`}
                      className="group block rounded-[1.25rem] border border-border bg-background/60 p-4 transition hover:bg-secondary/50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-foreground">
                            {
                              project.title
                            }
                          </h3>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {project.city && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />

                                {
                                  project.city
                                }
                              </span>
                            )}

                            <span>
                              {formatDate(
                                project.created_at
                              )}
                            </span>
                          </div>
                        </div>

                        <ProjectStatusBadge
                          status={
                            project.status
                          }
                        />
                      </div>

                      <p className="mt-3 text-sm font-semibold text-foreground">
                        {formatBudget(
                          project.budget_min,
                          project.budget_max
                        )}
                      </p>
                    </Link>
                  )
                )}
              </div>
            )}
          </Section>
        </div>

        {/* Sidebar */}

        <aside className="space-y-5 xl:sticky xl:top-24">
            <Section
            title="Управление аккаунтом"
            icon={
                <ShieldCheck className="h-5 w-5" />
            }
            >
            <UserAdminActions
                userId={
                profile.id
                }
                isBlocked={
                profile.is_blocked
                }
                role={
                profile.role
                }
            />
            </Section>
          <Section
            title="Профиль"
            icon={
              <ShieldCheck className="h-5 w-5" />
            }
          >
            <InfoRow
              label="ID"
              value={
                profile.id
              }
            />

            <InfoRow
              label="Роль"
              value={formatRole(
                profile.role
              )}
            />

            <InfoRow
              label="Создан"
              value={formatDateTime(
                profile.created_at
              )}
            />

            <InfoRow
              label="Обновлён"
              value={formatDateTime(
                profile.updated_at
              )}
            />
          </Section>

          {profile.role ===
            "contractor" &&
            company && (
              <Section
                title="Статус компании"
                icon={
                  <Building2 className="h-5 w-5" />
                }
              >
                <div className="rounded-[1.25rem] bg-secondary/60 p-4">
                  <p className="text-xs text-muted-foreground">
                    Проверка
                  </p>

                  <p className="mt-1 font-bold text-foreground">
                    {formatVerificationStatus(
                      company.verification_status
                    )}
                  </p>
                </div>
              </Section>
            )}
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

      <p className="mt-1 break-words font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}

function ContactCard({
  icon,
  label,
  value,
}: {
  icon:
    React.ReactNode;

  label:
    string;

  value:
    | string
    | null;
}) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-background/60 p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}

        <span className="text-xs font-semibold">
          {label}
        </span>
      </div>

      <p className="mt-2 break-all text-sm font-semibold text-foreground">
        {value ||
          "Не указано"}
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
    | string
    | null
    | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 first:pt-0 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="max-w-[62%] break-words text-right text-sm font-semibold text-foreground">
        {value ||
          "Не указано"}
      </span>
    </div>
  );
}

function RoleBadge({
  role,
}: {
  role:
    string;
}) {
  const config =
    getRoleConfig(
      role
    );

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-bold ${config.className}`}
    >
      {
        config.label
      }
    </span>
  );
}

function getRoleConfig(
  role:
    string
) {
  switch (
    role
  ) {
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
  role:
    string
) {
  switch (
    role
  ) {
    case "customer":
      return (
        <UserRound className="h-6 w-6" />
      );

    case "contractor":
      return (
        <Building2 className="h-6 w-6" />
      );

    case "admin":
      return (
        <ShieldCheck className="h-6 w-6" />
      );

    default:
      return (
        <UserRound className="h-6 w-6" />
      );
  }
}

function ProjectStatusBadge({
  status,
}: {
  status:
    string;
}) {
  const config =
    getProjectStatusConfig(
      status
    );

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      {
        config.label
      }
    </span>
  );
}

function getProjectStatusConfig(
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

function formatRole(
  role:
    string
) {
  switch (
    role
  ) {
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

function formatVerificationStatus(
  status:
    string
) {
  switch (
    status
  ) {
    case "pending":
      return "На проверке";

    case "verified":
      return "Подтверждён";

    case "rejected":
      return "Отклонён";

    case "suspended":
      return "Приостановлен";

    case "draft":
      return "Черновик";

    default:
      return status;
  }
}

function formatCompanyType(
  value:
    string | null
) {
  switch (
    value
  ) {
    case "individual":
      return "Частная бригада";

    case "self_employed":
      return "Самозанятый";

    case "entrepreneur":
      return "ИП";

    case "company":
      return "Юридическое лицо";

    default:
      return "Не указано";
  }
}

function getUserName(
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
  value:
    string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle:
        "medium",
    }
  ).format(
    new Date(value)
  );
}

function formatDateTime(
  value:
    string | null
) {
  if (!value) {
    return "Не указано";
  }

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