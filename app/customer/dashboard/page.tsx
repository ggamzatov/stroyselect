import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bolt, ChevronRight, FileText, FolderKanban, Hammer, HardHat, Paperclip, Plus, Search, Send, Sparkles, Wrench } from "lucide-react";
import { getCustomerBidsCounts } from "@/features/bids/queries/get-customer-new-bids-count";
import { getMyProjects } from "@/features/projects/queries/get-my-projects";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

const activeStatuses = new Set(["published", "matching", "contractor_selected", "in_progress", "disputed"]);

export default async function CustomerDashboardPage() {
  const { profile } = await getCurrentProfile();
  if (profile.role !== "customer") redirect("/dashboard");
  const [projects, { newBidsCount, acceptedBidsCount }] = await Promise.all([getMyProjects(), getCustomerBidsCounts()]);
  const activeProjects = projects.filter((project) => activeStatuses.has(project.status));
  const firstName = profile.first_name || "заказчик";
  const featuredProjects = activeProjects.slice(0, 2);

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-7 sm:mb-9">
          <p className="text-sm font-medium text-muted-foreground">Добро пожаловать</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Что нужно сделать, {firstName}?</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Опишите задачу — мы поможем найти подходящего специалиста и сравнить предложения.</p>
        </header>

        <section className="relative overflow-hidden rounded-[28px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-6 lg:p-7" aria-labelledby="create-task-title">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" aria-hidden="true" />Быстрый старт</div>
            <h2 id="create-task-title" className="mt-3 text-xl font-black tracking-[-0.025em] sm:text-2xl">Опишите, что нужно сделать</h2>
            <Link href="/customer/projects/new" className="mt-4 flex min-h-[124px] items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 py-4 transition hover:border-primary/30 hover:shadow-sm sm:px-5" aria-label="Создать заявку">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground sm:text-base">Например: «нужно заменить смеситель на кухне»</p>
                <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card"><Paperclip className="h-4 w-4" aria-hidden="true" /></span>Добавить фотографии и детали</div>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.22)]"><Send className="h-5 w-5" aria-hidden="true" /></span>
            </Link>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Популярные услуги">
              <CategoryPill icon={<Wrench className="h-4 w-4" />} label="Сантехника" />
              <CategoryPill icon={<Bolt className="h-4 w-4" />} label="Электрика" />
              <CategoryPill icon={<Hammer className="h-4 w-4" />} label="Ремонт" />
              <CategoryPill icon={<HardHat className="h-4 w-4" />} label="Строительство" />
            </div>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="projects-title">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Ваши задачи</p><h2 id="projects-title" className="mt-1 text-2xl font-black tracking-[-0.03em]">Мои проекты</h2></div><Link href="/customer/projects" className="text-sm font-semibold text-primary hover:underline">Все проекты</Link></div>
          {featuredProjects.length > 0 ? <div className="grid gap-4 md:grid-cols-2">{featuredProjects.map((project) => <ProjectCard key={project.id} project={project} />)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card p-7 text-center sm:p-10"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><FolderKanban className="h-5 w-5" aria-hidden="true" /></div><h3 className="mt-4 text-lg font-bold">Пока здесь пусто</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Создайте первую задачу, и StroySelect поможет найти подходящего подрядчика.</p><Link href="/customer/projects/new" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" aria-hidden="true" />Создать задачу</Link></div>}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Быстрый доступ">
          <Link href="/customer/bids" className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-card)] sm:p-6"><div className="flex items-start justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary"><FileText className="h-5 w-5" aria-hidden="true" /></span><ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" /></div><h3 className="mt-5 text-lg font-bold">Предложения подрядчиков</h3><p className="mt-1 text-sm text-muted-foreground">Сравнивайте цену, сроки и условия</p><div className="mt-5 flex items-end gap-2"><span className="text-3xl font-black">{newBidsCount}</span><span className="pb-1 text-sm text-muted-foreground">новых</span></div></Link>
          <Link href="/customer/contractors" className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-card)] sm:p-6"><div className="flex items-start justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary"><Search className="h-5 w-5" aria-hidden="true" /></span><ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" /></div><h3 className="mt-5 text-lg font-bold">Найти специалиста</h3><p className="mt-1 text-sm text-muted-foreground">Посмотрите проверенных подрядчиков и их работы</p><div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Открыть каталог<ArrowRight className="h-4 w-4" aria-hidden="true" /></div></Link>
        </section>

        <section className="mt-8 rounded-2xl border border-[#dcebdc] bg-[linear-gradient(90deg,#f3f9ef,#fbfdf9)] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-foreground">Сейчас у вас</p><p className="mt-1 text-sm text-muted-foreground">{activeProjects.length} активных {pluralizeProject(activeProjects.length)} · {acceptedBidsCount} принятых предложений</p></div><Link href="/customer/projects" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-primary">Открыть проекты</Link></div></section>
      </div>
    </main>
  );
}

type Project = Awaited<ReturnType<typeof getMyProjects>>[number];

function ProjectCard({ project }: { project: Project }) {
  const status = statusPresentation(project.status);
  const budget = project.budget_max ?? project.budget_min;
  return <Link href={`/customer/work/${project.id}`} className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-card)] sm:p-6"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-lg font-bold">{project.title}</h3><span className={status.className}>{status.label}</span></div><p className="mt-1 text-xs text-muted-foreground">{project.service_categories?.name || "Услуга"}{project.city ? ` · ${project.city}` : ""}</p></div><ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" /></div><div className="mt-6 flex items-end justify-between border-t border-border pt-4"><div><p className="text-xs text-muted-foreground">Статус</p><p className="mt-1 text-sm font-semibold">{status.label}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Бюджет</p><p className="mt-1 text-sm font-semibold">{budget != null ? formatMoney(budget) : "Не указан"}</p></div></div><div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">Открыть проект<ArrowRight className="h-4 w-4" aria-hidden="true" /></div></Link>;
}

function CategoryPill({ icon, label }: { icon: React.ReactNode; label: string }) { return <Link href="/customer/projects/new" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold transition hover:border-primary/25 hover:bg-secondary">{icon}<span>{label}</span></Link>; }
function statusPresentation(status: string) { const map: Record<string, { label: string; className: string }> = { published: { label: "Ищем подрядчика", className: "rounded-full bg-[#fff2dc] px-2.5 py-1 text-[11px] font-bold text-[#a85f00]" }, matching: { label: "Подбор подрядчика", className: "rounded-full bg-[#fff2dc] px-2.5 py-1 text-[11px] font-bold text-[#a85f00]" }, contractor_selected: { label: "Подрядчик выбран", className: "rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary" }, in_progress: { label: "В работе", className: "rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary" }, disputed: { label: "Есть вопрос", className: "rounded-full bg-[#ffe9e7] px-2.5 py-1 text-[11px] font-bold text-[#b42318]" }, completed: { label: "Завершён", className: "rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground" } }; return map[status] ?? { label: status, className: "rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground" }; }
function formatMoney(value: number) { return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value); }
function pluralizeProject(value: number) { const mod10 = value % 10; const mod100 = value % 100; if (mod10 === 1 && mod100 !== 11) return "проект"; if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "проекта"; return "проектов"; }
