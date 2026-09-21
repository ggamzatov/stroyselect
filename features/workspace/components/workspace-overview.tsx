import Link from "next/link";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderOpen,
  MessageCircle,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { ContractorReviewForm } from "@/features/reviews/components/contractor-review-form";
import { CompleteProjectButton } from "@/features/workspace/components/complete-project-button";
import { ContractorStageManager } from "@/features/workspace/components/contractor-stage-manager";
import { CustomerStageReview } from "@/features/workspace/components/customer-stage-review";
import { StageFileGallery } from "@/features/workspace/components/stage-file-gallery";
import { StageFileUpload } from "@/features/workspace/components/stage-file-upload";
import { StageStatusBadge } from "@/features/workspace/components/stage-status-badge";
import { WorkspaceStageList } from "@/features/workspace/components/workspace-stage-list";
import { WorkspaceTimeline } from "@/features/workspace/components/workspace-timeline";
import type { ProjectWorkspace } from "@/features/workspace/queries/get-project-workspace";
import {
  formatWorkspaceDate,
  formatWorkspaceMoney,
  getCurrentStage,
  getStageStatusPresentation,
  getWorkspaceProgress,
  type WorkspaceRole,
} from "@/features/workspace/utils/workspace-presentation";

type Props = {
  workspace: ProjectWorkspace;
  role: WorkspaceRole;
  contractorReview?: Awaited<ReturnType<typeof import("@/features/reviews/queries/get-project-contractor-review").getProjectContractorReview>>;
};

/** A role-aware composition of existing workspace actions; all data stays server-first. */
export function WorkspaceOverview({ workspace, role, contractorReview }: Props) {
  const { project, stages, files, events, selectedBid } = workspace;
  const base = `/${role}/work/${project.id}`;
  const progress = getWorkspaceProgress(stages);
  const currentStage = getCurrentStage(stages, role);
  const reviewStages = stages.filter((stage) => stage.status === "awaiting_review");
  const counterpart = role === "customer"
    ? workspace.contractor?.public_name ?? "Подрядчик ещё не выбран"
    : [workspace.customer?.first_name, workspace.customer?.last_name].filter(Boolean).join(" ") || "Заказчик";

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container max-w-[1320px] py-5 md:py-7 lg:py-8">
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <section id="workspace-next-action" className="scroll-mt-24 rounded-[1.6rem] border border-primary/15 bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6" aria-labelledby="next-action-title">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Следующее действие</p>
              {role === "customer" && reviewStages.length > 0 ? (
                <>
                  <h2 id="next-action-title" className="mt-2 text-xl font-black tracking-tight text-foreground sm:text-2xl">Проверьте выполненный этап</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    Подрядчик сообщил о завершении. Посмотрите приложенные материалы, затем примите этап или верните его с замечанием.
                  </p>
                  <div className="mt-5 space-y-4">
                    {reviewStages.map((stage) => {
                      const stageFiles = files.filter((file) => file.stage_id === stage.id);
                      return (
                        <article key={stage.id} className="rounded-[1.25rem] border border-border bg-background/60 p-4 sm:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Что подрядчик передал на проверку</p>
                              <h3 className="mt-1 break-words text-lg font-bold text-foreground">{stage.title}</h3>
                              {stage.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{stage.description}</p>}
                            </div>
                            <StageStatusBadge status={stage.status} />
                          </div>
                          <div className="mt-4 rounded-xl border border-border bg-card p-3">
                            <p className="text-sm font-semibold text-foreground">Материалы и фото этапа</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {stageFiles.length > 0 ? `Приложено файлов: ${stageFiles.length}. После принятия этап будет отмечен как завершённый.` : "Файлы к этапу не приложены. При необходимости уточните детали у подрядчика в общении."}
                            </p>
                            {stageFiles.length > 0 && <div className="mt-3"><StageFileGallery projectId={project.id} files={stageFiles} currentUserId={workspace.currentUser.id} /></div>}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <div className="mt-4"><CustomerStageReview projectId={project.id} stages={stages} /></div>
                </>
              ) : role === "contractor" ? (
                <NextContractorAction base={base} currentStage={currentStage} />
              ) : (
                <NextCustomerAction base={base} currentStage={currentStage} />
              )}
            </section>

            <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6" aria-labelledby="workspace-progress-title">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 id="workspace-progress-title" className="text-lg font-black text-foreground sm:text-xl">Ход проекта</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Фактический прогресс считается по принятым этапам.</p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1.5 text-sm font-bold text-primary">{progress.completedCount} из {progress.totalCount}</span>
              </div>
              {progress.percentage !== null ? (
                <>
                  <div className="mt-5 flex items-end justify-between gap-4">
                    <p className="text-sm font-semibold text-foreground">Принято заказчиком</p>
                    <p className="text-3xl font-black tracking-[-0.04em] text-primary">{progress.percentage}%</p>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Прогресс проекта" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percentage}%` }} />
                  </div>
                </>
              ) : (
                <p className="mt-5 rounded-xl bg-secondary/60 p-4 text-sm leading-6 text-muted-foreground">У этапов пока не указаны доли проекта, поэтому показываем только фактическое число принятых этапов.</p>
              )}

              {currentStage && (
                <div className="mt-5 flex flex-col gap-3 rounded-[1.25rem] border border-border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Текущий этап</p>
                    <p className="mt-1 break-words text-base font-bold text-foreground">{currentStage.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{getStageStatusPresentation(currentStage.status)}</p>
                  </div>
                  <Link href="#project-work" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold text-primary hover:border-primary/30">
                    Открыть этапы <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </section>

            <section id="project-work" className="scroll-mt-24 rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6" aria-labelledby="work-plan-title">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="work-plan-title" className="text-lg font-black text-foreground sm:text-xl">Работа по этапам</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Сроки, стоимость, материалы и текущие действия собраны по плану работ.</p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">{stages.length} этапов</span>
              </div>
              <div className="mt-5">
                {role === "contractor" ? <ContractorStageManager projectId={project.id} stages={stages} /> : <WorkspaceStageList stages={stages} />}
              </div>
            </section>

            <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6" aria-labelledby="stage-files-title">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="stage-files-title" className="text-lg font-black text-foreground sm:text-xl">Материалы этапов</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Фото, акты и результаты работ остаются привязанными к своему этапу.</p>
                </div>
                <Link href={`${base}/documents`} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-primary hover:bg-secondary/60">
                  Все документы <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-5 space-y-4">
                {stages.length === 0 ? <EmptyState title="Этапы ещё не добавлены" text={role === "contractor" ? "Составьте план работ, чтобы прикладывать материалы к каждому этапу." : "Материалы появятся, когда подрядчик сформирует план работ."} /> : stages.map((stage) => {
                  const stageFiles = files.filter((file) => file.stage_id === stage.id);
                  return (
                    <article key={stage.id} className="rounded-[1.25rem] border border-border bg-background/60 p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Этап</p>
                          <h3 className="mt-1 break-words text-base font-bold text-foreground">{stage.title}</h3>
                        </div>
                        <StageStatusBadge status={stage.status} />
                      </div>
                      {role === "contractor" && stage.status !== "completed" && <div className="mt-4"><StageFileUpload projectId={project.id} stageId={stage.id} /></div>}
                      <div className="mt-4">
                        {stageFiles.length > 0 ? <StageFileGallery projectId={project.id} files={stageFiles} currentUserId={workspace.currentUser.id} allowDelete={role === "contractor" && stage.status !== "completed"} /> : <p className="rounded-xl border border-dashed border-border bg-card px-4 py-5 text-sm text-muted-foreground">Файлы к этому этапу пока не добавлены.</p>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6" aria-labelledby="activity-title">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="activity-title" className="text-lg font-black text-foreground sm:text-xl">История проекта</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Только зафиксированные события проекта.</p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground">{events.length} событий</span>
              </div>
              <div className="mt-5"><WorkspaceTimeline events={events.slice(0, 8)} /></div>
            </section>

            {role === "customer" && (
              <section id="project-review" className="scroll-mt-24 rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6" aria-labelledby="project-completion-title">
                <h2 id="project-completion-title" className="text-lg font-black text-foreground sm:text-xl">Завершение проекта</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">После приёмки всех этапов подтвердите завершение. Отзыв станет доступен только после завершения проекта.</p>
                <div className="mt-5"><CompleteProjectButton projectId={project.id} projectStatus={project.status} stages={stages} /></div>
                {project.status === "completed" && <div className="mt-6 border-t border-border pt-6"><h3 className="text-base font-bold text-foreground">Оценка подрядчика</h3><p className="mt-1 text-sm text-muted-foreground">Ваш отзыв поможет другим заказчикам принять решение.</p><div className="mt-4"><ContractorReviewForm projectId={project.id} review={contractorReview ?? null} /></div></div>}
              </section>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24">
            <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-primary" aria-hidden="true" /><h2 className="text-sm font-black text-foreground">Участники проекта</h2></div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">{role === "customer" ? "Подрядчик" : "Заказчик"}</p>
              <p className="mt-1 break-words text-base font-bold text-foreground">{counterpart}</p>
              <Link href={`${base}/chat`} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 text-sm font-bold text-primary hover:bg-primary/10"><MessageCircle className="h-4 w-4" aria-hidden="true" />Открыть общение</Link>
            </section>

            <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-primary" aria-hidden="true" /><h2 className="text-sm font-black text-foreground">Бюджет</h2></div>
              <dl className="mt-4 space-y-3 text-sm">
                <InfoLine label="Бюджет заказчика" value={formatBudgetRange(project.budget_min, project.budget_max)} />
                <InfoLine label={role === "customer" ? "Согласованное предложение" : "Ваше предложение"} value={selectedBid ? formatWorkspaceMoney(selectedBid.price) : "Не определено"} emphasized={Boolean(selectedBid)} />
              </dl>
              <Link href={`${base}/changes`} className="mt-4 inline-flex min-h-10 w-full items-center justify-between rounded-xl border border-border px-3 text-sm font-bold text-primary hover:border-primary/30 hover:bg-secondary/50">Финансы и изменения <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
            </section>

            <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" /><h2 className="text-sm font-black text-foreground">Сроки</h2></div>
              <dl className="mt-4 space-y-3 text-sm"><InfoLine label="Плановый старт" value={formatWorkspaceDate(project.desired_start_date) ?? "Не указан"} /><InfoLine label="Плановое завершение" value={formatWorkspaceDate(project.desired_end_date) ?? "Не указано"} />{project.work_started_at && <InfoLine label="Работы начаты" value={formatWorkspaceDate(project.work_started_at.slice(0, 10)) ?? "—"} />}</dl>
            </section>

            <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-sm font-black text-foreground">Инструменты проекта</h2>
              <div className="mt-3 space-y-1">
                <Shortcut href={`${base}/documents`} label="Документы" description="Проектные файлы и версии" icon={FileText} />
                <Shortcut href={`${base}/materials`} label="Материалы" description="Заказы и доставка" icon={FolderOpen} />
                <Shortcut href={`${base}/appointments`} label="Встречи" description="События и договорённости" icon={CalendarDays} />
                <Shortcut href={`${base}/issues`} label="Замечания" description="Контроль качества" icon={CheckCircle2} />
                <Shortcut href={`${base}/disputes`} label="Споры" description="Высокое внимание" icon={ShieldAlert} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function NextContractorAction({ base, currentStage }: { base: string; currentStage: { title: string; status: string } | null }) {
  const isAwaitingReview = currentStage?.status === "awaiting_review";
  return <><h2 id="next-action-title" className="mt-2 text-xl font-black tracking-tight text-foreground sm:text-2xl">{isAwaitingReview ? "Ожидается решение заказчика" : currentStage ? `Продолжите этап «${currentStage.title}»` : "Составьте план работ"}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{isAwaitingReview ? "Этап отправлен на проверку. Заказчик увидит материалы и примет решение; пока можно зафиксировать договорённости в общении." : currentStage?.status === "revision_required" ? "Заказчик оставил замечание. Исправьте результат и продолжите этап в плане работ." : currentStage ? "Проверьте срок, приложите результаты работы и отправьте этап заказчику на проверку, когда он будет готов." : "Добавьте этапы с описанием, сроками и долей проекта — так план станет понятен обеим сторонам."}</p><Link href={isAwaitingReview ? `${base}/chat` : "#project-work"} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(13,59,46,0.16)] hover:bg-[var(--primary-hover)]">{isAwaitingReview ? "Открыть общение" : currentStage ? "Открыть этап" : "Добавить этап"}<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link></>;
}

function NextCustomerAction({ base, currentStage }: { base: string; currentStage: { title: string; status: string } | null }) {
  return <><h2 id="next-action-title" className="mt-2 text-xl font-black tracking-tight text-foreground">{currentStage ? `Сейчас выполняется «${currentStage.title}»` : "Следите за ходом работ"}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{currentStage ? "Когда подрядчик отправит этап на проверку, здесь появится действие для приёмки или возврата с замечаниями." : "Подрядчик ещё не сформировал план работ. Обсудить детали можно в общем чате проекта."}</p><Link href={currentStage ? "#project-work" : `${base}/chat`} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-primary hover:border-primary/30 hover:bg-secondary/50">{currentStage ? "Открыть этапы" : "Открыть общение"}<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link></>;
}

function InfoLine({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className={emphasized ? "text-right font-black text-primary" : "text-right font-semibold text-foreground"}>{value}</dd></div>;
}

function Shortcut({ href, label, description, icon: Icon }: { href: string; label: string; description: string; icon: typeof FileText }) {
  return <Link href={href} className="flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary/60"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><Icon className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-foreground">{label}</span><span className="block break-words text-xs text-muted-foreground">{description}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="rounded-[1.25rem] border border-dashed border-border bg-background/60 p-6 text-center"><h3 className="font-bold text-foreground">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>;
}

function formatBudgetRange(min: number | string | null, max: number | string | null) {
  if (min === null && max === null) return "Не указан";
  if (min !== null && max !== null) return `${formatWorkspaceMoney(min)} — ${formatWorkspaceMoney(max)}`;
  return formatWorkspaceMoney(min ?? max);
}
