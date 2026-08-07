import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  FileText,
  FolderOpen,
  Mail,
  MapPin,
  Phone,
  Star,
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

import { CustomerStageReview } from
  "@/features/workspace/components/customer-stage-review";

import { StageFileGallery } from
  "@/features/workspace/components/stage-file-gallery";

import { CompleteProjectButton } from
  "@/features/workspace/components/complete-project-button";

import { getProjectMessages } from
  "@/features/chat/queries/get-project-messages";

import { ProjectChat } from
  "@/features/chat/components/project-chat";

import { getProjectContractorReview } from
  "@/features/reviews/queries/get-project-contractor-review";

import { ContractorReviewForm } from
  "@/features/reviews/components/contractor-review-form";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CustomerWorkspacePage({
  params,
}: Props) {
  const { id } =
    await params;

  /*
   * Загружаем рабочее пространство,
   * чат и существующий отзыв параллельно.
   */
  const [
    workspace,
    chatData,
    contractorReview,
  ] = await Promise.all([
    getProjectWorkspace(id),
    getProjectMessages(id),
    getProjectContractorReview(id),
  ]);

  if (
    workspace.currentUser.role !==
    "customer"
  ) {
    redirect("/dashboard");
  }

  const {
    project,
    contractor,
    selectedBid,
    stages,
    events,
    files,
  } = workspace;

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        {/* Назад */}

        <Link
          href={`/customer/projects/${project.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />

          Вернуться к проекту
        </Link>

        {/* Шапка проекта */}

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-4xl">
              <p className="text-sm font-semibold text-primary">
                Рабочее пространство заказчика
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

            <ProjectStatusBadge
              status={
                project.status
              }
            />
          </div>
        </section>

        {/* Краткая статистика */}

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
              description="Общий ход выполнения работ по принятым этапам."
            >
              <WorkspaceProgress
                stages={
                  stages
                }
              />
            </WorkspaceSection>

            {/* Приёмка */}

            <WorkspaceSection
              title="Приёмка этапов"
              description="Проверьте выполненные работы и подтвердите этап либо верните его подрядчику на доработку."
            >
              <CustomerStageReview
                projectId={
                  project.id
                }
                stages={
                  stages
                }
              />
            </WorkspaceSection>

            {/* Завершение всего проекта */}

            <WorkspaceSection
              title="Завершение проекта"
              description="После приёмки всех этапов подтвердите окончательное завершение работ."
            >
              <CompleteProjectButton
                projectId={
                  project.id
                }
                projectStatus={
                  project.status
                }
                stages={
                  stages
                }
              />
            </WorkspaceSection>

            {/* Этапы */}

            <WorkspaceSection
              title="Этапы работ"
              description="Полный план работ, сроки, стоимость и статусы выполнения."
            >
              <WorkspaceStageList
                stages={
                  stages
                }
              />
            </WorkspaceSection>

            {/* Файлы */}

            <WorkspaceSection
              title="Фото и документы"
              description="Материалы подрядчика по каждому этапу проекта."
            >
              {stages.length ===
              0 ? (
                <EmptyBlock
                  text="Этапы пока не созданы."
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
                          key={
                            stage.id
                          }
                          className="rounded-[1.5rem] border border-border bg-background/60 p-5"
                        >
                          <div className="mb-5">
                            <p className="text-sm font-semibold text-primary">
                              Этап проекта
                            </p>

                            <h3 className="mt-1 text-lg font-bold text-foreground">
                              {
                                stage.title
                              }
                            </h3>
                          </div>

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
                          />
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </WorkspaceSection>

            {/* Чат */}

            <WorkspaceSection
              title="Обсуждение"
              description="Сообщения и договорённости между вами и подрядчиком."
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

            {/* История */}

            <WorkspaceSection
              title="История проекта"
              description="Ключевые события и изменения по проекту."
            >
              <WorkspaceTimeline
                events={
                  events
                }
              />
            </WorkspaceSection>

            {/* Отзыв появляется только после завершения проекта */}

            {project.status ===
              "completed" && (
              <WorkspaceSection
                title="Оценка подрядчика"
                description="Оцените работу подрядчика. Ваш отзыв и рейтинг будут отображаться в его публичном профиле."
              >
                <ContractorReviewForm
                  projectId={
                    project.id
                  }
                  review={
                    contractorReview
                  }
                />
              </WorkspaceSection>
            )}
          </div>

          {/* Правая колонка */}

          <aside className="space-y-5 xl:sticky xl:top-24">
            <ContractorCard
              contractor={
                contractor
              }
            />

            <SelectedBidCard
              bid={
                selectedBid
              }
            />

            <ProjectDatesCard
              project={
                project
              }
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

function ContractorCard({
  contractor,
}: {
  contractor: {
    public_name: string;
    legal_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    rating: number | string;
    rating_count: number;
  } | null;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
        <UserRound className="h-5 w-5" />
      </div>

      <p className="mt-5 text-sm font-semibold text-primary">
        Подрядчик
      </p>

      {!contractor ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Подрядчик ещё не выбран.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-lg font-bold text-foreground">
              {
                contractor.public_name
              }
            </p>

            {contractor.legal_name && (
              <p className="mt-1 text-sm text-muted-foreground">
                {
                  contractor.legal_name
                }
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-secondary/50 px-4 py-3">
            <Star className="h-4 w-4 fill-current text-primary" />

            <span className="text-sm font-semibold text-foreground">
              {Number(
                contractor.rating
              ).toFixed(1)}
            </span>

            <span className="text-sm text-muted-foreground">
              ·{" "}
              {
                contractor.rating_count
              }{" "}
              отзывов
            </span>
          </div>

          {contractor.contact_phone && (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Phone className="h-4 w-4 text-primary" />

              {
                contractor.contact_phone
              }
            </div>
          )}

          {contractor.contact_email && (
            <div className="flex items-center gap-2 break-all text-sm text-foreground">
              <Mail className="h-4 w-4 shrink-0 text-primary" />

              {
                contractor.contact_email
              }
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
        Принятое предложение
      </p>

      {!bid ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Предложение не выбрано.
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
            value={`${bid.duration_days} ${formatDays(
              bid.duration_days
            )}`}
          />

          <InfoLine
            label="Начало"
            value={
              formatDate(
                bid.proposed_start_date
              ) ??
              "Не указано"
            }
          />
        </div>
      )}
    </section>
  );
}

function ProjectDatesCard({
  project,
}: {
  project: {
    contractor_selected_at: string | null;
    work_started_at: string | null;
    completed_at: string | null;
  };
}) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
        <CalendarDays className="h-5 w-5" />
      </div>

      <p className="mt-5 text-sm font-semibold text-primary">
        Основные даты
      </p>

      <div className="mt-5 space-y-4">
        <InfoLine
          label="Подрядчик выбран"
          value={
            formatDateTime(
              project.contractor_selected_at
            ) ??
            "Не указано"
          }
        />

        <InfoLine
          label="Работы начаты"
          value={
            formatDateTime(
              project.work_started_at
            ) ??
            "Не начаты"
          }
        />

        <InfoLine
          label="Завершено"
          value={
            formatDateTime(
              project.completed_at
            ) ??
            "Не завершено"
          }
        />
      </div>
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
    <div className="rounded-[1.5rem] border border-dashed border-border bg-background/60 p-7 text-center text-sm text-muted-foreground">
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
        label:
          "В работе",

        className:
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",

        dotClassName:
          "bg-amber-500",
      };

    case "completed":
      return {
        label:
          "Завершён",

        className:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",

        dotClassName:
          "bg-emerald-500",
      };

    case "disputed":
      return {
        label:
          "Спор",

        className:
          "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",

        dotClassName:
          "bg-red-500",
      };

    default:
      return {
        label:
          status,

        className:
          "bg-muted text-muted-foreground",

        dotClassName:
          "bg-muted-foreground",
      };
  }
}

function formatMoney(
  value:
    | number
    | string
) {
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

function formatDate(
  value: string | null
) {
  if (!value) {
    return null;
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
  value: string | null
) {
  if (!value) {
    return null;
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

function formatDays(
  value: number
) {
  const lastTwoDigits =
    value % 100;

  const lastDigit =
    value % 10;

  if (
    lastTwoDigits >= 11 &&
    lastTwoDigits <= 14
  ) {
    return "дней";
  }

  if (
    lastDigit === 1
  ) {
    return "день";
  }

  if (
    lastDigit >= 2 &&
    lastDigit <= 4
  ) {
    return "дня";
  }

  return "дней";
}