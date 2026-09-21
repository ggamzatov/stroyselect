import Link from "next/link"
import { ArrowRight, CircleAlert, FolderKanban, Plus, UsersRound } from "lucide-react"
import { redirect } from "next/navigation"

import { ButtonLink } from "@/components/ui/button"
import { PageFrame } from "@/components/layout/page-frame"
import { Metric } from "@/components/patterns/metric"
import { PageHeader } from "@/components/patterns/page-header"
import { CustomerProjectCard } from "@/features/projects/components/customer-project-card"
import { getCustomerBidsCounts } from "@/features/bids/queries/get-customer-new-bids-count"
import { getMyProjects } from "@/features/projects/queries/get-my-projects"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

const activeStatuses = new Set(["published", "collecting_bids", "matching", "contractor_selected", "in_progress", "disputed"])

export default async function CustomerDashboardPage() {
  const { profile } = await getCurrentProfile()
  if (profile.role !== "customer") redirect("/dashboard")

  const [projects, { newBidsCount, acceptedBidsCount }] = await Promise.all([getMyProjects(), getCustomerBidsCounts()])
  const activeProjects = projects.filter((project) => activeStatuses.has(project.status))
  const drafts = projects.filter((project) => project.status === "draft")
  const firstName = profile.first_name || "заказчик"

  return (
    <PageFrame size="wide" className="pb-28 md:pb-8">
      <PageHeader
        eyebrow="Кабинет заказчика"
        title={`Здравствуйте, ${firstName}`}
        description="Здесь собраны только ближайшие действия по вашим задачам."
        actions={<ButtonLink href="/customer/projects/new"><Plus data-icon="inline-start" />Создать задачу</ButtonLink>}
      />

      <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Краткая сводка">
        <Metric label="Активные задачи" value={activeProjects.length} note="опубликованные и в работе" />
        <Metric label="Новые предложения" value={newBidsCount} note={newBidsCount ? "ждут вашего решения" : "сейчас нет новых"} />
        <Metric label="Исполнитель выбран" value={acceptedBidsCount} note="задачи с принятым предложением" />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Мои задачи</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Продолжите с того места, где остановились</h2>
            </div>
            <Link href="/customer/projects" className="text-sm font-semibold text-primary hover:underline">Все задачи</Link>
          </div>

          {projects.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {projects.slice(0, 4).map((project) => <CustomerProjectCard key={project.id} project={project} />)}
            </div>
          ) : (
            <section className="mt-4 flex min-h-64 flex-col items-start justify-center rounded-[var(--radius-md)] border border-dashed border-border bg-card p-6 shadow-[var(--shadow-subtle)]">
              <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary"><FolderKanban className="size-5" aria-hidden="true" /></span>
              <h2 className="mt-4 text-lg font-semibold text-foreground">Создайте первую задачу</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Опишите нужные работы, а затем сможете получить и сравнить предложения специалистов.</p>
              <ButtonLink className="mt-5" href="/customer/projects/new"><Plus data-icon="inline-start" />Создать задачу</ButtonLink>
            </section>
          )}
        </div>

        <aside className="rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)]" aria-labelledby="attention-title">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning"><CircleAlert className="size-5" aria-hidden="true" /></span>
            <div>
              <p className="text-sm font-semibold text-primary">Требует внимания</p>
              <h2 id="attention-title" className="mt-1 text-base font-semibold text-foreground">Ближайшие действия</h2>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {newBidsCount > 0 ? <AttentionLink href="/customer/bids" title={`Сравнить ${newBidsCount} ${formatOffer(newBidsCount)}`} description="Получены новые предложения специалистов" /> : null}
            {drafts.slice(0, 2).map((project) => <AttentionLink key={project.id} href={`/customer/projects/${project.id}/edit`} title={`Заполнить «${project.title}»`} description="Черновик ещё не опубликован" />)}
            {newBidsCount === 0 && drafts.length === 0 ? <p className="rounded-[var(--radius-sm)] bg-muted/60 px-4 py-4 text-sm leading-6 text-muted-foreground">Срочных действий сейчас нет. Новые предложения и изменения появятся здесь.</p> : null}
          </div>
        </aside>
      </section>

      <section className="mt-6 rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)] sm:flex sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"><UsersRound className="size-5" aria-hidden="true" /></span>
          <div><h2 className="font-semibold text-foreground">Нужен специалист до публикации задачи?</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Изучите специализацию, географию, отзывы и выполненные проекты в каталоге.</p></div>
        </div>
        <ButtonLink variant="outline" className="mt-4 sm:mt-0" href="/customer/contractors">Открыть каталог<ArrowRight data-icon="inline-end" /></ButtonLink>
      </section>
    </PageFrame>
  )
}

function AttentionLink({ href, title, description }: { href: string; title: string; description: string }) {
  return <Link href={href} className="group flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border p-3.5 transition hover:border-primary/25 hover:bg-secondary/45"><span><span className="block text-sm font-semibold text-foreground">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span><ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" /></Link>
}

function formatOffer(value: number) {
  const remainder = value % 100
  if (remainder >= 11 && remainder <= 14) return "предложений"
  if (value % 10 === 1) return "предложение"
  if (value % 10 >= 2 && value % 10 <= 4) return "предложения"
  return "предложений"
}
