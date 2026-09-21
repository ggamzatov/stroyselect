import Link from "next/link"
import { FolderKanban, Plus } from "lucide-react"
import { redirect } from "next/navigation"

import { EmptyState } from "@/components/feedback/empty-state"
import { PageFrame } from "@/components/layout/page-frame"
import { PageHeader } from "@/components/patterns/page-header"
import { Button } from "@/components/ui/button"
import { CustomerProjectCard } from "@/features/projects/components/customer-project-card"
import { getMyProjects } from "@/features/projects/queries/get-my-projects"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

const attentionStatuses = new Set(["draft", "disputed"])
const activeStatuses = new Set(["published", "collecting_bids", "matching", "contractor_selected", "in_progress"])

export default async function CustomerProjectsPage() {
  const { profile } = await getCurrentProfile()
  if (profile.role !== "customer") redirect("/dashboard")

  const projects = await getMyProjects()
  const attention = projects.filter((project) => attentionStatuses.has(project.status))
  const active = projects.filter((project) => activeStatuses.has(project.status))
  const finished = projects.filter((project) => !attentionStatuses.has(project.status) && !activeStatuses.has(project.status))

  return (
    <PageFrame size="wide" className="pb-28 md:pb-8">
      <PageHeader
        eyebrow="Проекты"
        title="Мои задачи"
        description="Создавайте задачи, выбирайте исполнителя и переходите к работе в одном понятном потоке."
        actions={<Button render={<Link href="/customer/projects/new" />}><Plus data-icon="inline-start" />Создать задачу</Button>}
      />

      {projects.length === 0 ? (
        <EmptyState className="mt-8" icon={FolderKanban} title="Задач пока нет" description="Опишите первую задачу — её можно сохранить черновиком и дополнить позже." action={<Button render={<Link href="/customer/projects/new" />}><Plus data-icon="inline-start" />Создать задачу</Button>} />
      ) : (
        <div className="mt-8 space-y-9">
          <ProjectSection title="Требуют внимания" description="Черновики и задачи, по которым нужна реакция" projects={attention} />
          <ProjectSection title="Активные" description="Задачи в подборе, с выбранным исполнителем и в работе" projects={active} />
          {finished.length ? <ProjectSection title="Завершённые и другие" description="История ваших задач" projects={finished} /> : null}
        </div>
      )}
    </PageFrame>
  )
}

function ProjectSection({ title, description, projects }: { title: string; description: string; projects: Awaited<ReturnType<typeof getMyProjects>> }) {
  if (!projects.length) return null
  return (
    <section aria-label={title}>
      <div><h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <CustomerProjectCard key={project.id} project={project} />)}</div>
    </section>
  )
}
