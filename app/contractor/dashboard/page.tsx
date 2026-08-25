import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, FolderKanban, Megaphone, ShieldCheck, Wrench } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getMyContractorCompany } from "@/features/contractors/queries/get-my-contractor-company";
import { getMyBidsCount } from "@/features/bids/queries/get-my-bids-count";
import { getAvailableProjectsCount } from "@/features/projects/queries/get-available-projects-count";

export default async function ContractorDashboardPage() {
  const { profile } = await getCurrentProfile();
  if (profile.role !== "contractor") redirect("/dashboard");

  const [company, bidsCount, projectsCount] = await Promise.all([
    getMyContractorCompany(),
    getMyBidsCount(),
    getAvailableProjectsCount(),
  ]);
  const status = company?.verification_status ?? "not_created";

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">Кабинет подрядчика</p>
              <h1 className="mt-2 break-words text-3xl font-bold tracking-[-0.035em] text-foreground md:text-5xl">Добро пожаловать, {profile.first_name}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">Находите новые проекты, отправляйте предложения и управляйте текущими объектами из одного кабинета.</p>
            </div>
            <div className="shrink-0"><VerificationStatus status={status} /></div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4"><p className="text-sm font-medium text-muted-foreground">Обзор</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Текущая активность</h2></div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <DashboardCard title="Новые проекты" value={projectsCount} href="/contractor/projects" linkText="Посмотреть проекты" icon={<FolderKanban className="h-5 w-5" />} />
            <DashboardCard title="Мои предложения" value={bidsCount} href="/contractor/bids" linkText="Открыть предложения" icon={<BriefcaseBusiness className="h-5 w-5" />} />
            <DashboardCard title="Мои объекты" value="→" href="/contractor/work" linkText="Перейти к объектам" icon={<Building2 className="h-5 w-5" />} />
            <DashboardCard title="Реклама" value="AD" href="/contractor/advertising" linkText="Продвигать компанию" icon={<Megaphone className="h-5 w-5" />} />
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-7 shadow-[var(--shadow-card)] md:p-8">
            <div className="pointer-events-none absolute -right-10 -bottom-16 h-52 w-52 rounded-full bg-secondary/70 blur-3xl" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(107,70,50,0.2)]"><Wrench className="h-5 w-5" /></div>
              <p className="mt-6 text-sm font-semibold text-primary">Профиль компании</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">{company?.public_name || "Настройте профиль подрядчика"}</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Управляйте реквизитами, специализациями, городами работы, контактами и доступностью для новых заказов. При изменении проверенных данных профиль может быть направлен на повторную проверку.</p>
              <Link href="/contractor/company" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(107,70,50,0.2)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a]">
                {company ? "Редактировать профиль" : "Создать профиль"}<ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><ShieldCheck className="h-6 w-6" /></div>
            <h3 className="mt-6 text-xl font-bold text-foreground">Управление профилем</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Добавляйте новые услуги, расширяйте географию работы и поддерживайте реквизиты компании в актуальном состоянии.</p>
            <Link href="/contractor/company" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Перейти к анкете <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardCard({ title, value, href, linkText, icon }: { title: string; value: number | string; href: string; linkText: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="group rounded-[1.5rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">{icon}</div><ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" /></div>
      <p className="mt-5 text-sm font-medium text-muted-foreground">{title}</p><p className="mt-2 text-4xl font-bold tracking-[-0.04em] text-foreground">{value}</p><p className="mt-4 text-sm font-semibold text-primary">{linkText}</p>
    </Link>
  );
}

function VerificationStatus({ status }: { status: string }) {
  const config = getStatusConfig(status);
  return (
    <div className={["inline-flex min-w-[240px] items-center gap-3 rounded-2xl border px-5 py-4", config.className].join(" ")}>
      <div className={["flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", config.iconClassName].join(" ")}><BadgeCheck className="h-5 w-5" /></div>
      <div className="min-w-0"><p className="text-xs font-medium opacity-70">Статус профиля</p><p className="mt-0.5 break-words text-sm font-semibold">{config.label}</p><p className="mt-0.5 text-xs opacity-70">Профиль компании</p></div>
    </div>
  );
}
function getStatusConfig(status: string) {
  switch (status) {
    case "draft": return { label: "Черновик", className: "border-border bg-secondary/50 text-foreground", iconClassName: "bg-primary/10 text-primary" };
    case "pending": return { label: "Ожидает проверки", className: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200", iconClassName: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" };
    case "verified": return { label: "Подтверждён", className: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200", iconClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" };
    case "rejected": return { label: "Требует исправлений", className: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200", iconClassName: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" };
    case "suspended": return { label: "Приостановлен", className: "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200", iconClassName: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" };
    default: return { label: "Не заполнен", className: "border-border bg-muted text-muted-foreground", iconClassName: "bg-secondary text-primary" };
  }
}