import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bolt,
  ChevronRight,
  CircleAlert,
  FileText,
  FolderKanban,
  Hammer,
  HardHat,
  Paperclip,
  Plus,
  Search,
  Send,
  Sparkles,
  Wrench,
} from "lucide-react";

import { getCustomerBidsCounts } from "@/features/bids/queries/get-customer-new-bids-count";
import { getMyProjects } from "@/features/projects/queries/get-my-projects";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

const activeStatuses = new Set([
  "published",
  "matching",
  "contractor_selected",
  "in_progress",
  "disputed",
]);

export default async function CustomerDashboardPage() {
  const { profile } = await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  const [projects, { newBidsCount, acceptedBidsCount }] = await Promise.all([
    getMyProjects(),
    getCustomerBidsCounts(),
  ]);

  const activeProjects = projects.filter((project) => activeStatuses.has(project.status));
  const searchingProjects = projects.filter(
    (project) => project.status === "published" || project.status === "matching"
  );
  const featuredProjects = activeProjects.length > 0 ? activeProjects.slice(0, 2) : projects.slice(0, 2);
  const firstName = profile.first_name || "заказчик";

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <div className="mb-5 flex items-center justify-between gap-4 md:mb-7">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Кабинет заказчика</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl">
              Добрый день, {firstName}! <span aria-hidden="true">👋</span>
            </h1>
          </div>
        </div>

        <section className="ui-v2-panel relative overflow-hidden p-4 sm:p-6 lg:p-7" aria-labelledby="quick-project-title">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[30%] bg-[radial-gradient(circle_at_65%_45%,rgba(170,216,190,0.55),transparent_58%)] lg:block" />
          <div className="relative max-w-[900px]">
            <h2 id="quick-project-title" className="text-xl font-black tracking-[-0.025em] sm:text-2xl">
              Что нужно сделать?
            </h2>

            <Link
              href="/customer/projects/new"
              className="mt-4 flex min-h-[108px] items-center justify-between gap-4 rounded-2xl border border-input bg-card px-4 py-4 shadow-sm transition hover:border-primary/25 hover:shadow-[var(--shadow-soft)] sm:px-5"
              aria-label="Создать проект и описать задачу"
            >
              <div className="min-w-0 self-start pt-1">
                <p className="text-sm text-muted-foreground sm:text-base">
                  Опишите задачу, бюджет и сроки или добавьте материалы…
                </p>
                <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background">
                    <Paperclip className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="hidden sm:inline">Создать подробную заявку</span>
                </div>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.24)]">
                <Send className="h-5 w-5" aria-hidden="true" />
              </span>
            </Link>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Популярные категории">
              <CategoryPill icon={<Hammer className="h-4 w-4" />} label="Ремонт" />
              <CategoryPill icon={<Wrench className="h-4 w-4" />} label="Сантехника" />
              <CategoryPill icon={<Bolt className="h-4 w-4" />} label="Электрика" />
              <CategoryPill icon={<HardHat className="h-4 w-4" />} label="Специалисты" />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_0.7fr]" aria-label="Сводка по проектам">
          <div className="grid gap-4 md:grid-cols-2">
            {featuredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}

            {featuredProjects.length === 0 ? (
              <div className="ui-v2-panel md:col-span-2 p-6 sm:p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <FolderKanban className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-xl font-bold">Первый проект можно создать за несколько минут</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Опишите задачу и получите предложения от подходящих подрядчиков.
                </p>
                <Link
                  href="/customer/projects/new"
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Создать проект
                </Link>
              </div>
            ) : null}

            <Link
              href="/customer/bids"
              className="ui-v2-panel group p-5 transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--shadow-card)] sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">Предложения подрядчиков</h2>
                    {newBidsCount > 0 ? (
                      <span className="rounded-full bg-[#fff2dc] px-2 py-1 text-[11px] font-bold text-[#b96a00]">
                        Новые
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Сравните цену, сроки и условия</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
              </div>

              <div className="mt-7 flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-black tracking-[-0.04em]">{newBidsCount}</p>
                  <p className="mt-1 text-xs text-muted-foreground">новых предложений</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{acceptedBidsCount}</p>
                  <p className="mt-1 text-xs text-muted-foreground">принято</p>
                </div>
              </div>
            </Link>
          </div>

          <aside className="space-y-4">
            <div className="ui-v2-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Краткая сводка</h2>
                <span className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                  Сейчас
                </span>
              </div>

              <div className="mt-4 divide-y divide-border">
                <SummaryRow label="Активные проекты" value={activeProjects.length} tone="green" />
                <SummaryRow label="Ищут подрядчика" value={searchingProjects.length} tone="orange" />
                <SummaryRow label="Новые предложения" value={newBidsCount} tone="blue" />
              </div>

              <Link
                href="/customer/projects"
                className="mt-4 flex min-h-11 items-center justify-between rounded-xl border border-border px-4 text-sm font-semibold text-primary transition hover:bg-secondary"
              >
                Перейти к проектам
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="ui-v2-panel p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
                  <CircleAlert className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-bold">Требует внимания</h2>
                  <p className="text-xs text-muted-foreground">Только реальные действия по вашим данным</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {newBidsCount > 0 ? (
                  <ActionLink
                    href="/customer/bids"
                    title={`Посмотреть ${newBidsCount} ${pluralizeOffer(newBidsCount)}`}
                    subtitle="Есть новые предложения подрядчиков"
                  />
                ) : null}
                {searchingProjects.length > 0 ? (
                  <ActionLink
                    href="/customer/projects"
                    title="Проверить проекты в подборе"
                    subtitle={`${searchingProjects.length} ${pluralizeProject(searchingProjects.length)} ищут подрядчика`}
                  />
                ) : null}
                {newBidsCount === 0 && searchingProjects.length === 0 ? (
                  <p className="rounded-xl bg-muted px-4 py-4 text-sm text-muted-foreground">
                    Срочных действий сейчас нет.
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-5 ui-v2-panel p-5 sm:p-6" aria-labelledby="specialists-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Каталог</p>
              <h2 id="specialists-title" className="mt-1 text-xl font-black tracking-tight">
                Найдите нужного специалиста
              </h2>
            </div>
            <Link href="/customer/contractors" className="hidden text-sm font-semibold text-primary hover:underline sm:inline">
              Смотреть всех
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <SpecialistCategory
              title="Ремонт и отделка"
              description="Подрядчики для комплексных и локальных работ"
              icon={<Hammer className="h-5 w-5" />}
            />
            <SpecialistCategory
              title="Сантехника"
              description="Монтаж, ремонт и инженерные работы"
              icon={<Wrench className="h-5 w-5" />}
            />
            <SpecialistCategory
              title="Электрика"
              description="Электромонтаж и обслуживание объектов"
              icon={<Bolt className="h-5 w-5" />}
            />
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[1.2rem] border border-[#dcebdc] bg-[linear-gradient(90deg,#f3f9ef,#fbfdf9)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e6f4dd] text-primary">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-bold">Подрядчики проходят проверку профиля</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Сравнивайте предложения, историю и данные подрядчика перед выбором.
                </p>
              </div>
            </div>
            <Link
              href="/customer/contractors"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-primary shadow-sm"
            >
              Найти специалиста
              <Search className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

type ProjectCardProject = Awaited<ReturnType<typeof getMyProjects>>[number];

function ProjectCard({ project }: { project: ProjectCardProject }) {
  const budget = project.budget_max ?? project.budget_min;
  const status = getStatusPresentation(project.status);
  const href = getProjectHref(project);

  return (
    <Link
      href={href}
      className="ui-v2-panel group p-5 transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--shadow-card)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-bold">{project.title}</h2>
            <span className={status.className}>{status.label}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {project.service_categories?.name || "Проект"}
            {project.city ? ` · ${project.city}` : ""}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
      </div>

      <div className="mt-7 grid grid-cols-2 gap-4 border-t border-border pt-5">
        <div>
          <p className="text-xs text-muted-foreground">Статус</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{status.label}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Бюджет</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {budget !== null ? formatMoney(budget) : "Не указан"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex min-h-11 items-center justify-between rounded-xl border border-border px-4 text-sm font-semibold text-primary">
        Открыть проект
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </div>
    </Link>
  );
}

function CategoryPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Link
      href="/customer/projects/new"
      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground hover:border-primary/20 hover:bg-secondary"
    >
      <span className="text-primary" aria-hidden="true">{icon}</span>
      {label}
    </Link>
  );
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "orange" | "blue";
}) {
  const toneClass = {
    green: "bg-secondary text-primary",
    orange: "bg-[#fff3df] text-[#c87908]",
    blue: "bg-[#eaf4ff] text-[#287ac9]",
  }[tone];

  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`h-8 w-8 rounded-full ${toneClass}`} aria-hidden="true" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <strong className="text-xl tracking-tight">{value}</strong>
    </div>
  );
}

function ActionLink({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 hover:border-primary/20 hover:bg-secondary/40">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
    </Link>
  );
}

function SpecialistCategory({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href="/customer/contractors" className="group rounded-2xl border border-border p-4 transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--shadow-soft)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary" aria-hidden="true">
        {icon}
      </div>
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
      <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
        Смотреть подрядчиков
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </p>
    </Link>
  );
}

function getProjectHref(project: ProjectCardProject) {
  if (["contractor_selected", "in_progress", "completed", "disputed"].includes(project.status)) {
    return `/customer/work/${project.id}`;
  }
  return `/customer/projects/${project.id}`;
}

function getStatusPresentation(status: string) {
  const base = "rounded-full px-2.5 py-1 text-[11px] font-bold";
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Черновик", className: `${base} bg-muted text-muted-foreground` },
    published: { label: "Поиск подрядчика", className: `${base} bg-[#fff2dc] text-[#b96a00]` },
    matching: { label: "Подбор", className: `${base} bg-[#fff2dc] text-[#b96a00]` },
    contractor_selected: { label: "Подрядчик выбран", className: `${base} bg-secondary text-primary` },
    in_progress: { label: "В работе", className: `${base} bg-[#e7f3dd] text-[#4d7d13]` },
    completed: { label: "Завершён", className: `${base} bg-secondary text-primary` },
    disputed: { label: "Есть спор", className: `${base} bg-red-50 text-red-700` },
  };

  return map[status] ?? { label: status, className: `${base} bg-muted text-muted-foreground` };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function pluralizeOffer(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return "новое предложение";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "новых предложения";
  return "новых предложений";
}

function pluralizeProject(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return "проект";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "проекта";
  return "проектов";
}