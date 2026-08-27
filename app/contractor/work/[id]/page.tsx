import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Bolt,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  FileText,
  FolderOpen,
  MapPin,
  MessageCircle,
  Phone,
  UserRound,
} from "lucide-react";

import { ProjectChat } from "@/features/chat/components/project-chat";
import { getProjectMessages } from "@/features/chat/queries/get-project-messages";
import { ContractorStageManager } from "@/features/workspace/components/contractor-stage-manager";
import { StageFileGallery } from "@/features/workspace/components/stage-file-gallery";
import { StageFileUpload } from "@/features/workspace/components/stage-file-upload";
import { WorkspaceStageList } from "@/features/workspace/components/workspace-stage-list";
import { WorkspaceTimeline } from "@/features/workspace/components/workspace-timeline";
import { getProjectWorkspace } from "@/features/workspace/queries/get-project-workspace";

type Props = {
  params: Promise<{ id: string }>;
};

type ProgressStage = {
  id: string;
  title: string;
  status: string;
  progress_weight: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
};

export default async function ContractorWorkspacePage({ params }: Props) {
  const { id } = await params;

  const [workspace, chatData] = await Promise.all([
    getProjectWorkspace(id),
    getProjectMessages(id),
  ]);

  if (workspace.currentUser.role !== "contractor") {
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

  const completedWeight = stages
    .filter((stage) => stage.status === "completed")
    .reduce((sum, stage) => sum + Number(stage.progress_weight ?? 0), 0);
  const progress = Math.min(Math.max(Math.round(completedWeight), 0), 100);
  const completedStages = stages.filter((stage) => stage.status === "completed").length;
  const reviewStages = stages.filter((stage) => stage.status === "awaiting_review");
  const currentStage =
    stages.find((stage) => stage.status === "in_progress") ??
    reviewStages[0] ??
    stages.find((stage) => stage.status !== "completed") ??
    null;
  const currentStageIndex = currentStage
    ? Math.max(stages.findIndex((stage) => stage.id === currentStage.id) + 1, 1)
    : stages.length;

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container max-w-[1320px] py-5 md:py-7 lg:py-8">
        <Link
          href="/contractor/work"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          К списку объектов
        </Link>

        <section className="mt-3 overflow-hidden rounded-[1.6rem] border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center lg:px-7">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-[-0.035em] text-foreground sm:text-3xl">
                  {project.title}
                </h1>
                <ProjectStatusBadge status={project.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {(project.city || project.address) && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                    {[project.city, project.address].filter(Boolean).join(", ")}
                  </span>
                )}

                {stages.length > 0 && (
                  <span>
                    Этап {Math.min(currentStageIndex, stages.length)} из {stages.length}
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Общий прогресс</p>
                  <p className="mt-1 text-3xl font-bold tracking-[-0.04em] text-foreground">
                    {progress}%
                  </p>
                </div>

                {project.desired_end_date && (
                  <p className="max-w-36 text-right text-xs leading-5 text-muted-foreground">
                    Завершение: {formatDate(project.desired_end_date)}
                  </p>
                )}
              </div>

              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-label="Общий прогресс проекта"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground sm:text-xl">Прогресс проекта</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {completedStages} из {stages.length} этапов принято заказчиком
                  </p>
                </div>

                <Link
                  href={`/contractor/work/${project.id}/changes`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-secondary/60"
                >
                  Финансы
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="mt-6">
                <StageProgressRail stages={stages} />
              </div>

              {currentStage && (
                <div className="mt-6 rounded-[1.35rem] border border-primary/15 bg-[linear-gradient(100deg,rgba(235,247,226,0.78),rgba(255,255,255,0.92))] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bolt className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                          {currentStage.status === "awaiting_review"
                            ? "Ожидает решения заказчика"
                            : "Текущий этап"}
                        </p>
                        <p className="mt-1 truncate text-base font-bold text-foreground sm:text-lg">
                          {currentStage.title}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                          {currentStage.status === "awaiting_review"
                            ? "Этап отправлен на приёмку. Пока заказчик принимает решение, его материалы остаются доступны для просмотра."
                            : "Управляйте сроками и статусом этапа, прикладывайте результат работ и фиксируйте прогресс."}
                        </p>
                      </div>
                    </div>

                    <Link
                      href="#stage-management"
                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:border-primary/30"
                    >
                      Управлять этапом
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )}
            </section>

            <section
              id="stage-management"
              className="scroll-mt-24 rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6"
            >
              <div className="mb-5">
                <p className="text-sm font-semibold text-primary">Управление работами</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">Этапы проекта</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Создавайте этапы, уточняйте сроки и отправляйте выполненную работу заказчику на приёмку.
                </p>
              </div>
              <ContractorStageManager projectId={project.id} stages={stages} />
            </section>

            <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground sm:text-xl">Результаты и файлы</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Загружайте фото, акты и другие материалы отдельно по каждому этапу
                  </p>
                </div>
                <span className="rounded-full bg-secondary/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  {files.length} файлов
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {stages.length === 0 ? (
                  <EmptyBlock text="Сначала добавьте хотя бы один этап проекта." />
                ) : (
                  stages.map((stage) => {
                    const stageFiles = files.filter((file) => file.stage_id === stage.id);

                    return (
                      <article key={stage.id} className="rounded-[1.25rem] border border-border bg-background/60 p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">Этап</p>
                            <h3 className="mt-1 break-words text-base font-bold text-foreground">{stage.title}</h3>
                          </div>
                          <StageStatusBadge status={stage.status} />
                        </div>

                        {stage.status !== "completed" && (
                          <div className="mt-4">
                            <StageFileUpload projectId={project.id} stageId={stage.id} />
                          </div>
                        )}

                        <div className="mt-4">
                          <StageFileGallery
                            projectId={project.id}
                            files={stageFiles}
                            currentUserId={workspace.currentUser.id}
                            allowDelete={stage.status !== "completed"}
                          />
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground sm:text-xl">План работ</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Сроки, стоимость и текущие статусы этапов</p>
                </div>
                <span className="text-sm font-semibold text-primary">{stages.length} этапов</span>
              </div>
              <div className="mt-5">
                <WorkspaceStageList stages={stages} />
              </div>
            </section>

            <section
              id="project-chat"
              className="scroll-mt-24 rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6"
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-foreground sm:text-xl">Чат проекта</h2>
                  <p className="text-sm text-muted-foreground">Фиксируйте договорённости с заказчиком в одном месте</p>
                </div>
              </div>

              <ProjectChat
                projectId={project.id}
                currentUserId={workspace.currentUser.id}
                initialMessages={chatData.messages}
                initialUnreadCount={chatData.unreadCount}
                otherUserLastReadAt={chatData.otherUserReadState?.last_read_at ?? null}
              />
            </section>

            <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground sm:text-xl">История объекта</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Ключевые события проекта в хронологическом порядке</p>
                </div>
                <span className="rounded-full bg-secondary/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  {events.length} событий
                </span>
              </div>
              <div className="mt-5">
                <WorkspaceTimeline events={events} />
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24">
            <CustomerCard customer={customer} />
            <SelectedBidCard bid={selectedBid} />
            <QuickActionsCard projectId={project.id} fileCount={files.length} />
            <ProjectDatesCard project={project} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function StageProgressRail({ stages }: { stages: ProgressStage[] }) {
  if (stages.length === 0) {
    return <EmptyBlock text="План этапов пока не сформирован." />;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max px-1">
        {stages.map((stage, index) => {
          const completed = stage.status === "completed";
          const active = stage.status === "in_progress" || stage.status === "awaiting_review";

          return (
            <div key={stage.id} className="relative w-36 shrink-0 pr-3 last:pr-0 sm:w-40">
              {index < stages.length - 1 && (
                <div
                  className={[
                    "absolute left-5 top-5 h-0.5 w-full",
                    completed ? "bg-primary" : "bg-border",
                  ].join(" ")}
                />
              )}

              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-card">
                <span
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full border",
                    completed
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                        ? "border-primary/35 bg-primary/10 text-primary ring-4 ring-primary/10"
                        : "border-border bg-card text-muted-foreground",
                  ].join(" ")}
                >
                  {completed ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : active ? (
                    <Bolt className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 pr-2 text-sm font-bold leading-5 text-foreground">{stage.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatStageDate(stage)}</p>
            </div>
          );
        })}
      </div>
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
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Заказчик"
    : null;

  return (
    <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-foreground">Заказчик</p>
        <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>

      {!customer ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">Данные заказчика недоступны.</p>
      ) : (
        <>
          <div className="mt-5 flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold text-foreground">{fullName}</p>
              {customer.city && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {customer.city}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
            <Link
              href="#project-chat"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Написать в чат
            </Link>

            {customer.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:border-primary/30"
                aria-label={`Позвонить заказчику ${fullName}`}
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : (
              <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground opacity-50">
                <Phone className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
          </div>
        </>
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
    <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2">
        <Banknote className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-bold text-foreground">Ваше предложение</h2>
      </div>

      {!bid ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">Принятое предложение не найдено.</p>
      ) : (
        <div className="mt-5 space-y-3">
          <InfoLine label="Стоимость" value={formatMoney(bid.price)} emphasized />
          <InfoLine label="Срок" value={`${bid.duration_days} ${formatDays(bid.duration_days)}`} />
          <InfoLine label="Предложенный старт" value={formatDate(bid.proposed_start_date) ?? "Не указан"} />
        </div>
      )}
    </section>
  );
}

function QuickActionsCard({ projectId, fileCount }: { projectId: string; fileCount: number }) {
  const items = [
    {
      href: `/contractor/work/${projectId}/changes`,
      label: "Финансы",
      description: "Бюджет, изменения и расчёты",
      icon: Banknote,
    },
    {
      href: `/contractor/work/${projectId}/documents`,
      label: "Файлы",
      description: `${fileCount} файлов по этапам`,
      icon: FileText,
    },
    {
      href: `/contractor/work/${projectId}/materials`,
      label: "Снабжение",
      description: "Материалы, заказы и доставка",
      icon: FolderOpen,
    },
    {
      href: `/contractor/work/${projectId}/issues`,
      label: "Контроль качества",
      description: "Недочёты и исправления",
      icon: Check,
    },
  ];

  return (
    <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <h2 className="text-sm font-bold text-foreground">Быстрые действия</h2>
      <div className="mt-3 divide-y divide-border">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-16 items-center gap-3 py-3 transition hover:text-primary"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.description}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ProjectDatesCard({
  project,
}: {
  project: {
    desired_start_date: string | null;
    desired_end_date: string | null;
    work_started_at: string | null;
    completed_at: string | null;
  };
}) {
  return (
    <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-bold text-foreground">Сроки</h2>
      </div>
      <div className="mt-4 space-y-3">
        <InfoLine label="Плановый старт" value={formatDate(project.desired_start_date) ?? "Не указан"} />
        <InfoLine label="Плановое завершение" value={formatDate(project.desired_end_date) ?? "Не указано"} />
        {project.work_started_at && <InfoLine label="Работы начаты" value={formatDateTime(project.work_started_at)} />}
        {project.completed_at && <InfoLine label="Завершено" value={formatDateTime(project.completed_at)} />}
      </div>
    </section>
  );
}

function InfoLine({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={["text-right text-sm text-foreground", emphasized ? "font-bold text-primary" : "font-semibold"].join(" ")}>
        {value}
      </span>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  const config = getProjectStatusConfig(status);

  return (
    <span className={["inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold", config.className].join(" ")}>
      <span className={["mr-2 h-2 w-2 rounded-full", config.dotClassName].join(" ")} />
      {config.label}
    </span>
  );
}

function StageStatusBadge({ status }: { status: string }) {
  const labels: Record<string, { label: string; className: string }> = {
    planned: {
      label: "Запланирован",
      className: "bg-secondary text-secondary-foreground",
    },
    in_progress: {
      label: "В работе",
      className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    },
    awaiting_review: {
      label: "На проверке",
      className: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    },
    completed: {
      label: "Завершён",
      className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    rejected: {
      label: "Отклонён",
      className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    },
  };

  const config = labels[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <span className={["inline-flex rounded-full px-3 py-1.5 text-xs font-semibold", config.className].join(" ")}>
      {config.label}
    </span>
  );
}

function getProjectStatusConfig(status: string) {
  switch (status) {
    case "contractor_selected":
      return {
        label: "Подрядчик выбран",
        className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
        dotClassName: "bg-indigo-500",
      };
    case "in_progress":
      return {
        label: "В работе",
        className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        dotClassName: "bg-amber-500",
      };
    case "completed":
      return {
        label: "Завершён",
        className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        dotClassName: "bg-emerald-500",
      };
    case "disputed":
      return {
        label: "Спор",
        className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
        dotClassName: "bg-red-500",
      };
    default:
      return {
        label: status,
        className: "bg-muted text-muted-foreground",
        dotClassName: "bg-muted-foreground",
      };
  }
}

function formatStageDate(stage: ProgressStage) {
  if (stage.planned_start_date && stage.planned_end_date) {
    return `${formatShortDate(stage.planned_start_date)} — ${formatShortDate(stage.planned_end_date)}`;
  }
  if (stage.planned_end_date) {
    return `до ${formatShortDate(stage.planned_end_date)}`;
  }
  if (stage.planned_start_date) {
    return `с ${formatShortDate(stage.planned_start_date)}`;
  }
  return "Срок не указан";
}

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDays(value: number) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`)
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value));
}
