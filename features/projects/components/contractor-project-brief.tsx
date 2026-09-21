import { Banknote, Building2, FileText } from "lucide-react"

type ProjectBriefProject = {
  description: string | null
  property_type: string | null
  region: string | null
  city: string | null
  address: string | null
  budget_min: number | null
  budget_max: number | null
  desired_start_date: string | null
  desired_end_date: string | null
  service_categories: { id: number; name: string } | null
}

/** Decision-useful order facts, kept flat instead of nesting cards. */
export function ContractorProjectBrief({ project }: { project: ProjectBriefProject }) {
  return (
    <div className="space-y-4">
      <section className="rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)]" aria-labelledby="brief-description">
        <Heading icon={FileText} eyebrow="Задача" title="Что нужно сделать" id="brief-description" />
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground sm:text-base">{project.description || "Заказчик не добавил подробное описание."}</p>
      </section>
      <section className="rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)]" aria-labelledby="brief-main">
        <Heading icon={Building2} eyebrow="Основное" title="Объект и место работ" id="brief-main" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><Detail label="Категория" value={project.service_categories?.name} /><Detail label="Тип объекта" value={formatPropertyType(project.property_type)} /><Detail label="Регион" value={project.region} /><Detail label="Город" value={project.city} /><Detail label="Адрес" value={project.address} wide /></div>
      </section>
      <section className="rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)]" aria-labelledby="brief-terms">
        <Heading icon={Banknote} eyebrow="Условия" title="Бюджет и сроки" id="brief-terms" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><Detail label="Бюджет" value={formatBudget(project.budget_min, project.budget_max)} emphasized /><Detail label="Желаемое начало" value={formatDate(project.desired_start_date)} /><Detail label="Желаемое завершение" value={formatDate(project.desired_end_date)} /></div>
      </section>
    </div>
  )
}

function Heading({ icon: Icon, eyebrow, title, id }: { icon: typeof FileText; eyebrow: string; title: string; id: string }) { return <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"><Icon className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-semibold text-primary">{eyebrow}</p><h2 id={id} className="mt-1 text-lg font-semibold text-foreground">{title}</h2></div></div> }
function Detail({ label, value, wide, emphasized }: { label: string; value: string | null | undefined; wide?: boolean; emphasized?: boolean }) { return <div className={`rounded-[var(--radius-sm)] bg-muted/55 p-3.5 ${wide ? "sm:col-span-2" : ""}`}><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1.5 break-words text-foreground ${emphasized ? "font-semibold" : "text-sm font-medium"}`}>{value || "Не указано"}</p></div> }
function formatPropertyType(value: string | null) { return ({ apartment: "Квартира", private_house: "Частный дом", commercial: "Коммерческий объект", land: "Участок", industrial: "Производственный объект", other: "Другое" } as Record<string, string>)[value ?? ""] ?? "Не указан" }
function formatBudget(min: number | null, max: number | null) { const money = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value); if (min !== null && max !== null) return `${money(min)} — ${money(max)}`; if (min !== null) return `от ${money(min)}`; if (max !== null) return `до ${money(max)}`; return "Не указан" }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T00:00:00`)) : "Не указано" }
