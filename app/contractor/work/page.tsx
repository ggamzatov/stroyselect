import Link from "next/link"
import { FolderKanban } from "lucide-react"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/feedback/empty-state"
import { PageFrame } from "@/components/layout/page-frame"
import { PageHeader } from "@/components/patterns/page-header"
import { ContractorObjectCard } from "@/features/projects/components/contractor-object-card"
import { getAssignedProjects } from "@/features/projects/queries/get-assigned-projects"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

export default async function ContractorWorkPage() {
  const { profile } = await getCurrentProfile()

  if (profile.role !== "contractor") {
    redirect("/dashboard")
  }

  const projects = await getAssignedProjects()
  const activeProjects = projects.filter((project) => project.status !== "completed")
  const completedProjects = projects.filter((project) => project.status === "completed")

  return (
    <PageFrame size="wide" className="pb-28 md:pb-8">
      <PageHeader
        eyebrow="Объекты"
        title="Мои объекты"
        description="Здесь собраны заказы, по которым заказчик уже выбрал вашу компанию. Этапы, файлы и диалог доступны внутри объекта."
        actions={<Button variant="secondary" render={<Link href="/contractor/projects" />}>Найти заказы</Button>}
      />

      {!projects.length ? (
        <EmptyState
          className="mt-8"
          icon={FolderKanban}
          title="Назначенных объектов пока нет"
          description="После выбора вашего предложения объект появится здесь и станет доступен для работы."
          action={<Button render={<Link href="/contractor/projects" />}>Найти заказы</Button>}
        />
      ) : (
        <div className="mt-8 space-y-8">
          {activeProjects.length ? <ObjectGroup title="Текущие объекты" description="Откройте объект, чтобы продолжить работу." projects={activeProjects} /> : null}
          {completedProjects.length ? <ObjectGroup title="Завершённые объекты" description="Здесь хранится история завершённых работ." projects={completedProjects} /> : null}
        </div>
      )}
    </PageFrame>
  )
}

function ObjectGroup({ title, description, projects }: { title: string; description: string; projects: Awaited<ReturnType<typeof getAssignedProjects>> }) {
  return <section aria-labelledby={`objects-${title}`}><h2 id={`objects-${title}`} className="text-xl font-semibold tracking-tight text-foreground">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{projects.map((project) => <ContractorObjectCard key={project.id} project={project} />)}</div></section>
}
