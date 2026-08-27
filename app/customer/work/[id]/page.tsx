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
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";

import { ProjectChat } from "@/features/chat/components/project-chat";
import { getProjectMessages } from "@/features/chat/queries/get-project-messages";
import { ContractorReviewForm } from "@/features/reviews/components/contractor-review-form";
import { getProjectContractorReview } from "@/features/reviews/queries/get-project-contractor-review";
import { CompleteProjectButton } from "@/features/workspace/components/complete-project-button";
import { CustomerStageReview } from "@/features/workspace/components/customer-stage-review";
import { StageFileGallery } from "@/features/workspace/components/stage-file-gallery";
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

export default async function CustomerWorkspacePage({ params }: Props) {
  const { id } = await params;

  const [workspace, chatData, contractorReview] = await Promise.all([
    getProjectWorkspace(id),
    getProjectMessages(id),
    getProjectContractorReview(id),
  ]);

  if (workspace.currentUser.role !== "customer") {
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

  const completedWeight = stages
    .filter((stage) => stage.status === "completed")
    .reduce((sum, stage) => sum + Number(stage.progress_weight ?? 0), 0);
  const progress = Math.min(Math.max(Math.round(completedWeight), 0), 100);
  const completedStages = stages.filter((stage) => stage.status === "completed").length;
  const awaitingReviewStages = stages.filter((stage) => stage.status === "awaiting_review");
  const currentStage =
    awaitingReviewStages[0] ?? stages.find((stage) => stage.status !== "completed") ?? null;
  const currentStageIndex = currentStage
    ? Math.max(stages.findIndex((stage) => stage.id === currentStage.id) + 1, 1)
    : stages.length;

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container max-w-[1320px] py-5 md:py-7 lg:py-8">
        <Link
          href={`/customer/projects/${project.id}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          К списку проектов
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
                    <MapPin className="h-4 w-4 text-primary" />
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
                  href={`/customer/work/${project.id}/changes`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-secondary/60"
                >
                  Финансы
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-6">
                <StageProgressRail stages={stages} />
              </div>

              {currentStage && (
                <div className="mt-6 rounded-[1.35rem] border border-primary/15 bg-[linear-gradient(100deg,rgba(235,247,226,0.78),rgba(255,255,255,0.92))] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bolt className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                          {currentStage.status === "awaiting_review"
                            ? "Требует вашего решения"
                            : "Текущий этап"}
                        </p>
                        <p className="mt-1 truncate text-base font-bold text-foreground sm:text-lg">
                          {currentStage.title}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                          {currentStage.status === "awaiting_review"
                            ? "Подрядчик отправил этап на проверку. Проверьте результат и примите решение."
                            : "Следите за ходом работ и материалами по текущему этапу."}
                        </p>
                      </div>
                    </div>

                    {currentStage.status !== "awaiting_review" && (
                      <Link
                        href={`/customer/work/${project.id}/documents`}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:border-primary/30"
                      >
                        Файлы этапа
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </section>

            {awaitingReviewStages.length > 0 && (
              <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
                <div className="mb-5">
                  <p className="text-sm font-semibold text-primary">Следующее действие</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
                    Принять выполненный этап
                  </h2>
                </div>
                <CustomerStageReview projectId={project.id} stages={stages} />
              </section>
            )}

            <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground sm:text-xl">История объекта</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Ключевые события по проекту</p>
                </div>
                <span className="rounded-full bg-secondary/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  {events.length} событий
                </span>
              </div>

              <div className="mt-5">
                <WorkspaceTimeline events={events.slice(0, 6)} />
              </div>
            </section>

            <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground sm:text-xl">Этапы работ</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Сроки, стоимость и текущие статусы</p>
                </div>
                <span className="text-sm font-semibold text-primary">{stages.length} этапов</span>
              </div>
              <div className="mt-5">
                <WorkspaceStageList stages={stages} />
              </div>
            </section>

            <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground sm:text-xl">Фото и документы</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Материалы подрядчика по этапам</p>
                </div>
                <Link
                  href={`/customer/work/${project.id}/documents`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-secondary/60"
                >
                  Все файлы
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-5 space-y-4">
                {stages.length === 0 ? (
                  <EmptyBlock text="Этапы пока не созданы." />
                ) : (
                  stages.map((stage) => {
                    const stageFiles = files.filter((file) => file.stage_id === stage.id);
                    if (stageFiles.length === 0) return null;

                    return (
                      <article key={stage.id} className="rounded-[1.25rem] border border-border bg-background/60 p-4">
                        <p className="mb-3 text-sm font-bold text-foreground">{stage.title}</p>
                        <StageFileGallery
                          projectId={project.id}
                          files={stageFiles}
                          currentUserId={workspace.currentUser.id}
                        />
                      </article>
                    );
                  })
                )}

                {stages.length > 0 && files.length === 0 && (
                  <EmptyBlock text="Подрядчик пока не добавил фото или документы." />
                )}
              </div>
            </section>

            <section
              id="project-chat"
              className="scroll-mt-24 rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground sm:text-xl">Чат проекта</h2>
                  <p className="text-sm text-muted-foreground">Все договорённости в одном месте</p>
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
              <h2 className="text-lg font-bold text-foreground sm:text-xl">Завершение проекта</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                После приёмки всех этапов подтвердите окончательное завершение работ.
              </p>
              <div className="mt-5">
                <CompleteProjectButton
                  projectId={project.id}
                  projectStatus={project.status}
                  stages={stages}
                />
              </div>
            </section>

            {project.status === "completed" && (
              <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
                <h2 className="text-lg font-bold text-foreground sm:text-xl">Оценка подрядчика</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Расскажите другим заказчикам о качестве выполненных работ.
                </p>
                <div className="mt-5">
                  <ContractorReviewForm projectId={project.id} review={contractorReview} />
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24">
            <ContractorCard contractor={contractor} />
            <BudgetCard project={project} bid={selectedBid} />
            <DocumentsActionsCard projectId={project.id} fileCount={files.length} />
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
                    <Check className="h-4 w-4" />
                  ) : active ? (
                    <Bolt className="h-4 w-4" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 pr-2 text-sm font-bold leading-5 text-foreground">
                {stage.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatStageDate(stage)}
              </p>
            </div>
          );
        })}
      </div>
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
    verification_status: string;
  } | null;
}) {
  return (
    <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-foreground">Ваш подрядчик</p>
        <UserRound className="h-4 w-4 text-muted-foreground" />
      </div>

      {!contractor ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">Подрядчик ещё не выбран.</p>
      ) : (
        <>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate font-bold text-foreground">{contractor.public_name}</p>
                {contractor.verification_status === "verified" && (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Проверенный подрядчик" />
                )}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-foreground">{Number(contractor.rating).toFixed(1)}</span>
                <span className="text-muted-foreground">({contractor.rating_count})</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
            <Link
              href="#project-chat"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              <MessageCircle className="h-4 w-4" />
              Написать в чат
            </Link>

            {contractor.contact_phone ? (
              <a
                href={`tel:${contractor.contact_phone}`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:border-primary/30"
                aria-label={`Позвонить подрядчику ${contractor.public_name}`}
              >
                <Phone className="h-4 w-4" />
              </a>
            ) : (
              <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground opacity-50">
                <Phone className="h-4 w-4" />
              </span>
            )}
          </div>

          {contractor.contact_email && (
            <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{contractor.contact_email}</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function BudgetCard({
  project,
  bid,
}: {
  project: {
    id: string;
    budget_min: string | number | null;
    budget_max: string | number | null;
  };
  bid: {
    price: number | string;
    duration_days: number;
    proposed_start_date: string | null;
  } | null;
}) {
  return (
    <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2">
        <Banknote className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Бюджет проекта</h2>
      </div>

      <div className="mt-5 space-y-3">
        <InfoLine label="Бюджет заказчика" value={formatBudgetRange(project.budget_min, project.budget_max)} />
        <InfoLine
          label="Стоимость предложения"
          value={bid ? formatMoney(bid.price) : "Не определена"}
          emphasized={Boolean(bid)}
        />
        {bid && <InfoLine label="Срок подрядчика" value={`${bid.duration_days} ${formatDays(bid.duration_days)}`} />}
      </div>

      <Link
        href={`/customer/work/${project.id}/changes`}
        className="mt-5 inline-flex min-h-10 w-full items-center justify-between rounded-xl border border-border px-3 text-sm font-semibold text-primary hover:border-primary/30 hover:bg-secondary/40"
      >
        Перейти к финансам
        <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function DocumentsActionsCard({ projectId, fileCount }: { projectId: string; fileCount: number }) {
  const items = [
    {
      href: `/customer/work/${projectId}/documents`,
      label: "Файлы проекта",
      description: `${fileCount} файлов по этапам`,
      icon: FileText,
    },
    {
      href: `/customer/work/${projectId}/materials`,
      label: "Материалы",
      description: "Подбор, тендер и доставка",
      icon: FolderOpen,
    },
    {
      href: `/customer/work/${projectId}/issues`,
      label: "Замечания",
      description: "Контроль недочётов",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <h2 className="text-sm font-bold text-foreground">Документы и действия</h2>
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
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.description}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
        <CalendarDays className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Сроки</h2>
      </div>
      <div className="mt-4 space-y-3">
        <InfoLine label="Плановый старт" value={formatDate(project.desired_start_date) ?? "Не указан"} />
        <InfoLine label="Плановое завершение" value={formatDate(project.desired_end_date) ?? "Не указано"} />
        {project.work_started_at && <InfoLine label="Работы начаты" value={formatDate(project.work_started_at) ?? "—"} />}
        {project.completed_at && <InfoLine label="Завершено" value={formatDate(project.completed_at) ?? "—"} />}
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
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={emphasized ? "text-right font-bold text-primary" : "text-right font-semibold text-foreground"}>
        {value}
      </span>
    </div>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: "Черновик", className: "bg-muted text-muted-foreground" },
    published: { label: "Опубликован", className: "bg-blue-50 text-blue-700" },
    matching: { label: "Поиск подрядчика", className: "bg-amber-50 text-amber-700" },
    contractor_selected: { label: "Подрядчик выбран", className: "bg-primary/10 text-primary" },
    in_progress: { label: "В работе", className: "bg-[#edf7df] text-[#4f7b1b]" },
    completed: { label: "Завершён", className: "bg-primary/10 text-primary" },
    disputed: { label: "Есть спор", className: "bg-red-50 text-red-700" },
    cancelled: { label: "Отменён", className: "bg-muted text-muted-foreground" },
  };
  const current = config[status] ?? { label: status, className: "bg-secondary text-foreground" };

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ${current.className}`}>
      {current.label}
    </span>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-[1.2rem] border border-dashed border-border bg-background/60 p-5 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function formatStageDate(stage: ProgressStage) {
  if (stage.planned_start_date && stage.planned_end_date) {
    return `${formatShortDate(stage.planned_start_date)} – ${formatShortDate(stage.planned_end_date)}`;
  }
  if (stage.planned_start_date) return `с ${formatShortDate(stage.planned_start_date)}`;
  if (stage.planned_end_date) return `до ${formatShortDate(stage.planned_end_date)}`;
  return stage.status === "completed" ? "Завершён" : "Срок не указан";
}

function formatMoney(value: number | string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatBudgetRange(min: string | number | null, max: string | number | null) {
  if (min != null && max != null) return `${formatMoney(min)} – ${formatMoney(max)}`;
  if (min != null) return `от ${formatMoney(min)}`;
  if (max != null) return `до ${formatMoney(max)}`;
  return "Не указан";
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(value));
}

function formatDays(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}
