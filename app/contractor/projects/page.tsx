import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, BadgeCheck, Banknote, BriefcaseBusiness, CalendarDays, FolderSearch, Mail, MapPin, SearchX, Sparkles, TriangleAlert,
} from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getAvailableProjects } from "@/features/projects/queries/get-available-projects";

export default async function ContractorProjectsPage() {
  const { profile } = await getCurrentProfile();
  if (profile.role !== "contractor") redirect("/dashboard");
  const { company, projects, debugMessage } = await getAvailableProjects();

  if (!company) {
    return <ContractorNotice title="Создайте профиль подрядчика" description="Перед просмотром проектов необходимо заполнить профиль компании." href="/contractor/company" buttonText="Создать профиль" />;
  }
  if (company.verification_status !== "verified") {
    return <ContractorNotice title="Профиль ещё не подтверждён" description="Доступ к опубликованным проектам появится после проверки профиля администратором." href="/contractor/company" buttonText="Открыть профиль" />;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_25px_rgba(107,70,50,0.20)]">
              <FolderSearch className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">Кабинет подрядчика</p>
              <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-foreground md:text-5xl">Доступные проекты</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">Проекты ранжируются по специализации, географии и совместимости бюджета. Приглашения заказчиков показываются первыми.</p>
            </div>
          </div>
        </section>

        {debugMessage && (
          <div className="mt-6 rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            <div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-semibold">Диагностическое сообщение</p><p className="mt-1 break-words text-sm leading-6 opacity-85">{debugMessage}</p></div></div>
          </div>
        )}

        {projects.length === 0 ? <EmptyProjects /> : (
          <section className="mt-8 grid items-stretch gap-5 xl:grid-cols-2">
            {projects.map((project) => {
              const myBid = project.project_bids?.find((bid) => bid.contractor_id === company.id);
              return (
                <Link
                  key={project.id}
                  href={`/contractor/projects/${project.id}`}
                  className="group flex h-full min-w-0 overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[var(--shadow-card)]"
                >
                  <div className="flex min-h-[520px] w-full min-w-0 flex-col p-6 md:p-7">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-h-7 flex-wrap items-center gap-2">
                          <p className="break-words text-sm font-semibold text-primary">{getCategoryName(project.service_categories)}</p>
                          {project.is_invited && <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"><Mail className="h-3.5 w-3.5" />Заказчик пригласил</span>}
                        </div>
                        <h2 className="mt-2 line-clamp-2 min-h-[3.6rem] break-words text-xl font-bold tracking-tight text-foreground md:text-2xl">{project.title}</h2>
                        <div className="mt-3 flex min-w-0 items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{project.city || "Город не указан"}</span></div>
                      </div>

                      <div className="flex w-28 shrink-0 flex-col items-center gap-2">
                        <div className="flex min-h-[88px] w-28 flex-col items-center justify-center rounded-2xl bg-secondary px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 text-primary"><Sparkles className="h-3.5 w-3.5" /><span className="text-[10px] font-bold uppercase tracking-[0.08em]">Совпадение</span></div>
                          <p className="mt-1 text-2xl font-black leading-none text-foreground">{Math.round(project.match_score)}%</p>
                        </div>
                        {myBid && <span className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-emerald-50 px-2 py-1.5 text-center text-[10px] font-semibold leading-4 text-emerald-700"><BadgeCheck className="h-3.5 w-3.5 shrink-0" />Отклик отправлен</span>}
                      </div>
                    </div>

                    <div className="mt-4 flex min-h-[72px] flex-wrap content-start gap-2">
                      {project.match_reasons.map((reason) => <span key={reason} className="max-w-full break-words rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold">{reason}</span>)}
                    </div>

                    <p className="mt-5 line-clamp-3 min-h-[4.5rem] break-words text-sm leading-6 text-muted-foreground">{project.description}</p>
                    <div className="my-6 h-px bg-border" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ProjectInfo icon={<Banknote className="h-5 w-5" />} label="Бюджет" value={formatBudget(project.budget_min, project.budget_max)} emphasized />
                      <ProjectInfo icon={<CalendarDays className="h-5 w-5" />} label="Желаемое начало" value={project.desired_start_date ? formatDate(project.desired_start_date) : "Не указано"} />
                    </div>

                    <div className="mt-auto pt-6">
                      <div className="flex min-h-12 items-center justify-between border-t border-border pt-5">
                        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-primary"><BriefcaseBusiness className="h-4 w-4 shrink-0" /><span className="truncate">{myBid ? "Открыть проект" : project.is_invited ? "Ответить на приглашение" : "Посмотреть и откликнуться"}</span></div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-primary transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function EmptyProjects() {
  return <section className="mt-8 flex min-h-[420px] items-center justify-center rounded-[2rem] border border-dashed border-border bg-card/70 px-6 text-center shadow-[var(--shadow-soft)]"><div className="max-w-md"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-secondary text-primary"><SearchX className="h-7 w-7" /></div><h2 className="mt-6 text-2xl font-bold">Подходящих проектов пока нет</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Новые опубликованные проекты, соответствующие вашему профилю, будут появляться здесь.</p></div></section>;
}
function ContractorNotice({ title, description, href, buttonText }: { title: string; description: string; href: string; buttonText: string }) {
  return <main className="min-h-screen bg-background"><div className="app-container flex min-h-[75vh] items-center justify-center py-12"><section className="w-full max-w-xl rounded-[2rem] border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-secondary text-primary"><BriefcaseBusiness className="h-7 w-7" /></div><h1 className="mt-6 text-2xl font-bold md:text-3xl">{title}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p><Link href={href} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground">{buttonText}<ArrowRight className="h-4 w-4" /></Link></section></div></main>;
}
function ProjectInfo({ icon, label, value, emphasized = false }: { icon: React.ReactNode; label: string; value: string; emphasized?: boolean }) {
  return <div className={["min-w-0 rounded-2xl border border-border p-4", emphasized ? "bg-secondary/60" : "bg-background/60"].join(" ")}><div className="flex items-center gap-2 text-primary">{icon}<p className="text-xs font-medium text-muted-foreground">{label}</p></div><p className={["mt-2 break-words text-foreground", emphasized ? "text-lg font-bold" : "text-sm font-semibold"].join(" ")}>{value}</p></div>;
}
function getCategoryName(value: { name: string } | Array<{ name: string }> | null) { return Array.isArray(value) ? (value[0]?.name ?? "Строительные работы") : (value?.name ?? "Строительные работы"); }
function formatBudget(min: number | string | null, max: number | string | null) { const f = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }); if (min !== null && max !== null) return `${f.format(Number(min))} — ${f.format(Number(max))}`; if (min !== null) return `От ${f.format(Number(min))}`; if (max !== null) return `До ${f.format(Number(max))}`; return "Бюджет не указан"; }
function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)); }
