import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Bolt,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderOpen,
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

type Props = { params: Promise<{ id: string }> };

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

  if (workspace.currentUser.role !== "customer") redirect("/dashboard");

  const { project, contractor, selectedBid, stages, events, files } = workspace;
  const completedWeight = stages
    .filter((stage) => stage.status === "completed")
    .reduce((sum, stage) => sum + Number(stage.progress_weight ?? 0), 0);
  const progress = Math.min(Math.max(Math.round(completedWeight), 0), 100);
  const completedStages = stages.filter((stage) => stage.status === "completed").length;
  const awaitingReviewStages = stages.filter((stage) => stage.status === "awaiting_review");
  const currentStage = awaitingReviewStages[0] ?? stages.find((stage) => stage.status !== "completed") ?? null;

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container max-w-[1240px] py-5 md:py-7 lg:py-9">
        <Link href="/customer/projects" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Все проекты
        </Link>

        <header className="mt-4 rounded-[1.7rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-[-0.035em] sm:text-3xl">{project.title}</h1>
                <ProjectStatusBadge status={project.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {(project.city || project.address) && <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" aria-hidden="true" />{[project.city, project.address].filter(Boolean).join(", ")}</span>}
                {project.desired_end_date && <span>До {formatDate(project.desired_end_date)}</span>}
              </div>
            </div>
            <div className="min-w-[260px] lg:max-w-[320px] lg:flex-1">
              <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold text-muted-foreground">Готово</p><p className="mt-1 text-3xl font-black tracking-[-0.04em]">{progress}%</p></div><p className="text-right text-xs text-muted-foreground">{completedStages} из {stages.length} этапов</p></div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Прогресс проекта" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${progress}%` }} /></div>
            </div>
          </div>
        </header>

        {currentStage && <section className="mt-5 rounded-[1.5rem] border border-primary/15 bg-[linear-gradient(105deg,#f1f9ec,#ffffff)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Bolt className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">{currentStage.status === "awaiting_review" ? "Нужно ваше решение" : "Сейчас в работе"}</p><h2 className="mt-1 truncate text-lg font-black sm:text-xl">{currentStage.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{currentStage.status === "awaiting_review" ? "Подрядчик завершил этап. Проверьте результат и примите решение." : "Следите за прогрессом — всё важное собрано на этой странице."}</p></div></div>
            {currentStage.status === "awaiting_review" ? <a href="#stage-review" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">Проверить этап <ArrowRight className="h-4 w-4" aria-hidden="true" /></a> : <a href="#timeline" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-primary">Что нового <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>}
          </div>
        </section>}

        {awaitingReviewStages.length > 0 && <section id="stage-review" className="mt-5 scroll-mt-24 rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6"><p className="text-sm font-semibold text-primary">Требует вашего действия</p><h2 className="mt-1 text-xl font-black">Принять выполненный этап</h2><div className="mt-5"><CustomerStageReview projectId={project.id} stages={stages} /></div></section>}

        <section className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="Разделы проекта">
          <QuickLink href={`/customer/work/${project.id}/changes`} icon={<Banknote className="h-5 w-5" />} title="Финансы" text={selectedBid ? formatMoney(selectedBid.price) : "Открыть расходы"} />
          <QuickLink href={`/customer/work/${project.id}/documents`} icon={<FileText className="h-5 w-5" />} title="Документы" text={`${files.length} файлов`} />
          <QuickLink href={`/customer/work/${project.id}/materials`} icon={<FolderOpen className="h-5 w-5" />} title="Материалы" text="Подбор и доставка" />
          <QuickLink href="#project-chat" icon={<MessageCircle className="h-5 w-5" />} title="Чат" text={chatData.unreadCount > 0 ? `${chatData.unreadCount} новых` : "Все договорённости"} />
        </section>

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Дорожная карта</p><h2 className="mt-1 text-xl font-black">Этапы проекта</h2><p className="mt-1 text-sm text-muted-foreground">{completedStages} из {stages.length} этапов завершены</p></div><span className="hidden rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary sm:inline-flex">{progress}%</span></div>
              <div className="mt-6"><WorkspaceStageList stages={stages} /></div>
            </section>

            <section id="timeline" className="scroll-mt-24 rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Последние изменения</p><h2 className="mt-1 text-xl font-black">Что происходит</h2></div><span className="text-xs font-semibold text-muted-foreground">{events.length} событий</span></div>
              <div className="mt-5"><WorkspaceTimeline events={events.slice(0, 6)} /></div>
            </section>

            <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Результат работ</p><h2 className="mt-1 text-xl font-black">Фото и файлы</h2></div><Link href={`/customer/work/${project.id}/documents`} className="text-sm font-bold text-primary">Все файлы <ChevronRight className="inline h-4 w-4" aria-hidden="true" /></Link></div>
              <div className="mt-5 space-y-4">{files.length === 0 ? <EmptyBlock text="Пока нет загруженных файлов." /> : stages.map((stage) => { const stageFiles = files.filter((file) => file.stage_id === stage.id); return stageFiles.length ? <article key={stage.id} className="rounded-2xl border border-border bg-background/60 p-4"><p className="mb-3 text-sm font-bold">{stage.title}</p><StageFileGallery projectId={project.id} files={stageFiles} currentUserId={workspace.currentUser.id} /></article> : null; })}</div>
            </section>

            <section id="project-chat" className="scroll-mt-24 rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary"><MessageCircle className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Связь</p><h2 className="mt-1 text-xl font-black">Чат с подрядчиком</h2></div></div><ProjectChat projectId={project.id} currentUserId={workspace.currentUser.id} initialMessages={chatData.messages} initialUnreadCount={chatData.unreadCount} otherUserLastReadAt={chatData.otherUserReadState?.last_read_at ?? null} /></section>

            {project.status === "completed" && <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">После завершения</p><h2 className="mt-1 text-xl font-black">Оцените работу</h2><div className="mt-5"><ContractorReviewForm projectId={project.id} review={contractorReview} /></div></section>}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24">
            <ContractorCard contractor={contractor} />
            <InfoCard title="Смета проекта" icon={<Banknote className="h-4 w-4" />}><InfoLine label="Бюджет заказчика" value={formatBudgetRange(project.budget_min, project.budget_max)} /><InfoLine label="Предложение" value={selectedBid ? formatMoney(selectedBid.price) : "Нет"} emphasized /></InfoCard>
            <InfoCard title="Сроки" icon={<CalendarDays className="h-4 w-4" />}><InfoLine label="Старт" value={formatDate(project.desired_start_date) ?? "Не указан"} /><InfoLine label="Завершение" value={formatDate(project.desired_end_date) ?? "Не указано"} /></InfoCard>
            <div className="rounded-2xl border border-[#dcebdc] bg-[#f4faef] p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><div><p className="text-sm font-bold">Контроль в одном месте</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Этапы, фото, документы и чат проекта доступны здесь.</p></div></div></div>
            <CompleteProjectButton projectId={project.id} projectStatus={project.status} stages={stages} />
          </aside>
        </div>
      </div>
    </main>
  );
}

type WorkspaceContractor = { public_name: string; contact_phone: string | null; rating: number | string; rating_count: number; verification_status: string };
function ContractorCard({ contractor }: { contractor: WorkspaceContractor | null }) { return <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Подрядчик</p>{!contractor ? <p className="mt-3 text-sm text-muted-foreground">Подрядчик ещё не выбран.</p> : <><div className="mt-4 flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><UserRound className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><div className="flex items-center gap-1.5"><p className="truncate font-bold">{contractor.public_name}</p>{contractor.verification_status === "verified" && <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Проверенный подрядчик" />}</div><div className="mt-1 flex items-center gap-1.5 text-sm"><Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" /><span className="font-semibold">{Number(contractor.rating).toFixed(1)}</span><span className="text-muted-foreground">({contractor.rating_count})</span></div></div></div><div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><a href="#project-chat" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground">Написать</a>{contractor.contact_phone ? <a href={`tel:${contractor.contact_phone}`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-border" aria-label={`Позвонить ${contractor.public_name}`}><Phone className="h-4 w-4" aria-hidden="true" /></a> : null}</div></>}</section>; }
function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><div className="flex items-center gap-2 text-primary">{icon}<h2 className="text-sm font-bold text-foreground">{title}</h2></div><div className="mt-4 space-y-3">{children}</div></section>; }
function QuickLink({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) { return <Link href={href} className="group rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary/25"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</span><p className="mt-4 text-sm font-black">{title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{text}</p><ArrowRight className="mt-3 h-4 w-4 text-primary transition group-hover:translate-x-0.5" aria-hidden="true" /></Link>; }
function InfoLine({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) { return <div className="flex items-start justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><span className={emphasized ? "text-right font-bold text-primary" : "text-right font-semibold text-foreground"}>{value}</span></div>; }
function ProjectStatusBadge({ status }: { status: string }) { const map: Record<string, { label: string; className: string }> = { draft: { label: "Черновик", className: "bg-muted text-muted-foreground" }, published: { label: "Опубликован", className: "bg-blue-50 text-blue-700" }, matching: { label: "Поиск подрядчика", className: "bg-amber-50 text-amber-700" }, contractor_selected: { label: "Подрядчик выбран", className: "bg-primary/10 text-primary" }, in_progress: { label: "В работе", className: "bg-[#edf7df] text-[#4f7b1b]" }, completed: { label: "Завершён", className: "bg-primary/10 text-primary" }, disputed: { label: "Есть спор", className: "bg-red-50 text-red-700" }, cancelled: { label: "Отменён", className: "bg-muted text-muted-foreground" } }; const current = map[status] ?? { label: status, className: "bg-secondary text-foreground" }; return <span className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ${current.className}`}>{current.label}</span>; }
function EmptyBlock({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-center text-sm text-muted-foreground">{text}</div>; }
function formatMoney(value: number | string) { const amount = Number(value); if (!Number.isFinite(amount)) return "—"; return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(amount); }
function formatBudgetRange(min: string | number | null, max: string | number | null) { if (min != null && max != null) return `${formatMoney(min)} – ${formatMoney(max)}`; if (min != null) return `от ${formatMoney(min)}`; if (max != null) return `до ${formatMoney(max)}`; return "Не указан"; }
function formatDate(value: string | null) { if (!value) return "—"; return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value)); }
