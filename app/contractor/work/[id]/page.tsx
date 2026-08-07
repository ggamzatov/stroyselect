import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  FileText,
  FolderOpen,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";

import { getProjectWorkspace } from
  "@/features/workspace/queries/get-project-workspace";

import { WorkspaceProgress } from
  "@/features/workspace/components/workspace-progress";

import { WorkspaceStageList } from
  "@/features/workspace/components/workspace-stage-list";

import { WorkspaceTimeline } from
  "@/features/workspace/components/workspace-timeline";

import { ContractorStageManager } from
  "@/features/workspace/components/contractor-stage-manager";

import { StageFileUpload } from
  "@/features/workspace/components/stage-file-upload";

import { StageFileGallery } from
  "@/features/workspace/components/stage-file-gallery";

import { getProjectMessages } from
  "@/features/chat/queries/get-project-messages";

import { ProjectChat } from
  "@/features/chat/components/project-chat";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ContractorWorkspacePage({
  params,
}: Props) {
  const { id } = await params;

  const workspace =
    await getProjectWorkspace(id);

  const chatData =
    await getProjectMessages(id);

  if (
    workspace.currentUser.role !==
    "contractor"
  ) {
    redirect("/dashboard");
  }

  const {
    project,
    customer,
    selectedBid,
    stages,
    events,
    files,
  } = workspace;

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <Link
          href="/contractor/work"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться к объектам
        </Link>

        {/* Hero */}

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-4xl">
              <p className="text-sm font-semibold text-primary">
                Рабочее пространство подрядчика
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-foreground md:text-5xl">
                {project.title}
              </h1>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />

                  <span>
                    {project.city}

                    {project.address
                      ? `, ${project.address}`
                      : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <ProjectStatusBadge
                status={project.status}
              />
            </div>
          </div>
        </section>

        {/* Верхний обзор */}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <OverviewCard
            icon={
              <FolderOpen className="h-5 w-5" />
            }
            label="Этапов"
            value={String(
              stages.length
            )}
          />

          <OverviewCard
            icon={
              <FileText className="h-5 w-5" />
            }
            label="Файлов"
            value={String(
              files.length
            )}
          />

          <OverviewCard
            icon={
              <CalendarDays className="h-5 w-5" />
            }
            label="Событий"
            value={String(
              events.length
            )}
          />
        </section>

        {/* Основная сетка */}

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            {/* Прогресс */}

            <WorkspaceSection
              title="Прогресс проекта"
              description="Общий ход выполнения работ по этапам."
            >
              <WorkspaceProgress
                stages={stages}
              />
            </WorkspaceSection>

            {/* Управление этапами */}

            <WorkspaceSection
              title="Управление этапами"
              description="Создавайте, редактируйте и завершайте этапы проекта."
            >
              <ContractorStageManager
                projectId={project.id}
                stages={stages}
              />
            </WorkspaceSection>

            {/* Материалы */}

            <WorkspaceSection
              title="Материалы по этапам"
              description="Загружайте документы, фотографии и другие материалы по каждому этапу."
            >
              {stages.length === 0 ? (
                <EmptyBlock
                  text="Сначала добавьте хотя бы один этап проекта."
                />
              ) : (
                <div className="space-y-5">
                  {stages.map(
                    (stage) => {
                      const stageFiles =
                        files.filter(
                          (file) =>
                            file.stage_id ===
                            stage.id
                        );

                      return (
                        <article
                          key={stage.id}
                          className="rounded-[1.5rem] border border-border bg-background/60 p-5"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-primary">
                                Этап проекта
                              </p>

                              <h3 className="mt-1 text-lg font-bold text-foreground">
                                {stage.title}
                              </h3>
                            </div>

                            <StageStatusBadge
                              status={
                                stage.status
                              }
                            />
                          </div>

                          {stage.status !==
                            "completed" && (
                            <div className="mt-5">
                              <StageFileUpload
                                projectId={
                                  project.id
                                }
                                stageId={
                                  stage.id
                                }
                              />
                            </div>
                          )}

                          <div className="mt-5">
                            <StageFileGallery
                              projectId={
                                project.id
                              }
                              files={
                                stageFiles
                              }
                              currentUserId={
                                workspace
                                  .currentUser
                                  .id
                              }
                              allowDelete={
                                stage.status !==
                                "completed"
                              }
                            />
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </WorkspaceSection>

            {/* Список этапов */}

            <WorkspaceSection
              title="Этапы работ"
              description="Подробный список всех этапов и их текущих статусов."
            >
              <WorkspaceStageList
                stages={stages}
              />
            </WorkspaceSection>

            {/* Чат */}

            <WorkspaceSection
              title="Обсуждение"
              description="Общайтесь с заказчиком и фиксируйте договорённости по проекту."
            >
              <ProjectChat
                projectId={
                  project.id
                }
                currentUserId={
                  workspace
                    .currentUser
                    .id
                }
                initialMessages={
                  chatData.messages
                }
                initialUnreadCount={
                  chatData.unreadCount
                }
                otherUserLastReadAt={
                  chatData
                    .otherUserReadState
                    ?.last_read_at ??
                  null
                }
              />
            </WorkspaceSection>

            {/* Таймлайн */}

            <WorkspaceSection
              title="История проекта"
              description="Все ключевые события проекта в хронологическом порядке."
            >
              <WorkspaceTimeline
                events={events}
              />
            </WorkspaceSection>
          </div>

          {/* Правая колонка */}

          <aside className="space-y-5 xl:sticky xl:top-24">
            <CustomerCard
              customer={customer}
            />

            <SelectedBidCard
              bid={selectedBid}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function WorkspaceSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {title}
        </h2>

        {description && (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function OverviewCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
        {icon}
      </div>

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function CustomerCard({
  customer,
}: {
  customer: {
    first_name: string;
    last_name: string | null;
    phone: string | null;
    city: string | null;
  } | null;
}) {
  const fullName = customer
    ? [
        customer.first_name,
        customer.last_name,
      ]
        .filter(Boolean)
        .join(" ")
    : null;

  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
        <UserRound className="h-5 w-5" />
      </div>

      <p className="mt-5 text-sm font-semibold text-primary">
        Заказчик
      </p>

      {!customer ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Данные заказчика
          недоступны.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-lg font-bold text-foreground">
              {fullName}
            </p>

            {customer.city && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />

                {customer.city}
              </div>
            )}
          </div>

          {customer.phone && (
            <div className="flex items-center gap-2 rounded-2xl bg-secondary/50 px-4 py-3 text-sm font-semibold text-foreground">
              <Phone className="h-4 w-4 text-primary" />

              {customer.phone}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function SelectedBidCard({
  bid,
}: {
  bid: {
    price: number | string;
    duration_days: number;
    proposed_start_date: string | null;
  } | null;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
        <Banknote className="h-5 w-5" />
      </div>

      <p className="mt-5 text-sm font-semibold text-primary">
        Ваше предложение
      </p>

      {!bid ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Предложение не найдено.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          <InfoLine
            label="Стоимость"
            value={formatMoney(
              bid.price
            )}
          />

          <InfoLine
            label="Срок"
            value={`${bid.duration_days} дней`}
          />

          <InfoLine
            label="Начало"
            value={
              formatDate(
                bid.proposed_start_date
              ) ?? "Не указано"
            }
          />
        </div>
      )}
    </section>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

function EmptyBlock({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-center text-sm text-muted-foreground">
      {text}
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
      className={[
        "inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold",
        config.className,
      ].join(" ")}
    >
      <span
        className={[
          "mr-2 h-2.5 w-2.5 rounded-full",
          config.dotClassName,
        ].join(" ")}
      />

      {config.label}
    </span>
  );
}

function StageStatusBadge({
  status,
}: {
  status: string;
}) {
  const labels: Record<
    string,
    {
      label: string;
      className: string;
    }
  > = {
    planned: {
      label: "Запланирован",
      className:
        "bg-secondary text-secondary-foreground",
    },

    in_progress: {
      label: "В работе",
      className:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    },

    awaiting_review: {
      label: "На проверке",
      className:
        "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    },

    completed: {
      label: "Завершён",
      className:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    },

    rejected: {
      label: "Отклонён",
      className:
        "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    },
  };

  const config =
    labels[status] ?? {
      label: status,
      className:
        "bg-muted text-muted-foreground",
    };

  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold",
        config.className,
      ].join(" ")}
    >
      {config.label}
    </span>
  );
}

function getProjectStatusConfig(
  status: string
) {
  switch (status) {
    case "contractor_selected":
      return {
        label:
          "Подрядчик выбран",
        className:
          "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
        dotClassName:
          "bg-indigo-500",
      };

    case "in_progress":
      return {
        label: "В работе",
        className:
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        dotClassName:
          "bg-amber-500",
      };

    case "completed":
      return {
        label: "Завершён",
        className:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        dotClassName:
          "bg-emerald-500",
      };

    case "disputed":
      return {
        label: "Спор",
        className:
          "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
        dotClassName:
          "bg-red-500",
      };

    default:
      return {
        label: status,
        className:
          "bg-muted text-muted-foreground",
        dotClassName:
          "bg-muted-foreground",
      };
  }
}

function formatMoney(
  value: number | string
) {
  return new Intl.NumberFormat(
    "ru-RU",
    {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }
  ).format(
    Number(value)
  );
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "medium",
    }
  ).format(
    new Date(
      `${value}T00:00:00`
    )
  );
}