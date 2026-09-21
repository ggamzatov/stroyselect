import { ArrowRight } from "lucide-react"

import { ButtonLink } from "@/components/ui/button"
import { PublishProjectButton } from "@/features/projects/components/publish-project-button"

type Props = { projectId: string; status: string; bidCount?: number }

/** Reuses existing project actions while giving customers one clear next step. */
export function CustomerProjectNextAction({ projectId, status, bidCount = 0 }: Props) {
  const content = getContent(projectId, status, bidCount)

  return (
    <section className="rounded-[var(--radius-md)] border border-primary/20 bg-secondary/45 p-5 shadow-[var(--shadow-subtle)]" aria-labelledby="next-action-title">
      <p className="text-xs font-semibold text-primary">Следующее действие</p>
      <h2 id="next-action-title" className="mt-1 text-lg font-semibold text-foreground">{content.title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{content.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {content.kind === "publish" ? <PublishProjectButton projectId={projectId} /> : null}
        {content.href ? (
          <ButtonLink href={content.href}>
            {content.label}
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </ButtonLink>
        ) : null}
        {content.secondaryHref ? (
          <ButtonLink variant="outline" href={content.secondaryHref}>
            {content.secondaryLabel}
          </ButtonLink>
        ) : null}
      </div>
    </section>
  )
}

function getContent(projectId: string, status: string, bidCount: number) {
  switch (status) {
    case "draft":
      return {
        kind: "publish" as const,
        title: "Проверьте и опубликуйте задачу",
        description: "Черновик виден только вам. После публикации специалисты смогут отправлять предложения.",
        href: `/customer/projects/${projectId}/edit`,
        label: "Редактировать",
      }
    case "published":
    case "collecting_bids":
    case "matching":
      return bidCount > 0
        ? {
            kind: "link" as const,
            title: "Сравните полученные предложения",
            description: `Для этой задачи доступно предложений: ${bidCount}. Сопоставьте цену, сроки и условия перед выбором.`,
            href: `/customer/projects/${projectId}/bids/compare`,
            label: "Сравнить предложения",
            secondaryHref: `/customer/projects/${projectId}/matches`,
            secondaryLabel: "Специалисты по задаче",
          }
        : {
            kind: "link" as const,
            title: "Посмотрите подходящих специалистов",
            description: "Задача опубликована. Можно изучить профили и пригласить подходящего специалиста.",
            href: `/customer/projects/${projectId}/matches`,
            label: "Открыть специалистов",
          }
    case "contractor_selected":
      return {
        kind: "link" as const,
        title: "Продолжайте работу с исполнителем",
        description: "Исполнитель выбран. В рабочем пространстве доступны актуальные материалы и действия по задаче.",
        href: `/customer/work/${projectId}`,
        label: "Открыть рабочее пространство",
      }
    case "in_progress":
    case "disputed":
    case "completed":
      return {
        kind: "link" as const,
        title: status === "completed" ? "Проверьте итог работы" : "Перейдите к работе по проекту",
        description: status === "disputed" ? "В рабочем пространстве отображаются доступные действия по текущей ситуации." : "Все текущие действия и материалы собраны в рабочем пространстве.",
        href: `/customer/work/${projectId}`,
        label: status === "completed" ? "Открыть итог" : "Открыть рабочее пространство",
      }
    default:
      return { kind: "link" as const, title: "Откройте проект", description: "Проверьте актуальные данные по задаче.", href: `/customer/projects/${projectId}`, label: "Открыть" }
  }
}
