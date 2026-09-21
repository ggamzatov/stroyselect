import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  FileSignature,
  MapPin,
  UsersRound,
} from "lucide-react";

import type { ProjectWorkspace } from "@/features/workspace/queries/get-project-workspace";
import {
  getCurrentStage,
  getProjectStatusPresentation,
  getStageStatusPresentation,
  getWorkspaceProgress,
  type WorkspaceRole,
} from "@/features/workspace/utils/workspace-presentation";

type Props = {
  workspace: ProjectWorkspace;
  role: WorkspaceRole;
  executionUnlocked: boolean;
  contractMessage?: string;
};

/**
 * Shared, server-rendered project context. Role-only wording changes here;
 * actions continue to live in the existing authorised feature components.
 */
export function WorkspaceHeader({ workspace, role, executionUnlocked, contractMessage }: Props) {
  const { project, stages, customer, contractor } = workspace;
  const progress = getWorkspaceProgress(stages);
  const currentStage = getCurrentStage(stages, role);
  const status = getProjectStatusPresentation(project.status);
  const base = `/${role}/work/${project.id}`;
  const counterpart =
    role === "customer"
      ? contractor?.public_name ?? "Подрядчик ещё не выбран"
      : [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Заказчик";
  const action = getPrimaryAction({ role, executionUnlocked, currentStage, projectStatus: project.status, base });

  return (
    <section className="border-b border-border bg-background" aria-labelledby="workspace-title">
      <div className="app-container py-4 sm:py-5 lg:py-6">
        <Link
          href={role === "customer" ? `/customer/projects/${project.id}` : "/contractor/work"}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {role === "customer" ? "К проекту" : "К списку объектов"}
        </Link>

        <div className="mt-3 grid gap-4 rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.56fr)] lg:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={["inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold", status.className].join(" ")}>
                {status.label}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
                {role === "customer" ? "Заказчик · подрядчик" : "Подрядчик · заказчик"}
              </span>
            </div>

            <h1 id="workspace-title" className="mt-3 break-words text-2xl font-black tracking-[-0.04em] text-foreground sm:text-3xl lg:text-4xl">
              {project.title}
            </h1>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {(project.city || project.address) && (
                <span className="inline-flex min-w-0 items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="break-words">{[project.city, project.address].filter(Boolean).join(", ")}</span>
                </span>
              )}
              <span className="break-words">{role === "customer" ? "Подрядчик: " : "Заказчик: "}{counterpart}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.1rem] bg-secondary/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Текущий ход</p>
                  {currentStage ? (
                    <>
                      <p className="mt-1 break-words text-sm font-bold text-foreground">{currentStage.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{getStageStatusPresentation(currentStage.status)}</p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-foreground">{stages.length === 0 ? "План работ ещё не составлен" : "Все этапы завершены"}</p>
                  )}
                </div>
                {progress.percentage !== null && <span className="shrink-0 text-lg font-black text-primary">{progress.percentage}%</span>}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{progress.completedCount} из {progress.totalCount} этапов приняты</p>
            </div>

            <div className="rounded-[1.1rem] border border-border bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <FileSignature className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">{executionUnlocked ? "Договор действует" : "Договор ожидает действия"}</p>
                  {!executionUnlocked && <p className="mt-1 text-xs leading-5 text-muted-foreground">{contractMessage ?? "Рабочие действия откроются после подписания договора обеими сторонами."}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 rounded-[1.25rem] border border-primary/15 bg-primary/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Следующее действие</p>
            <p className="mt-1 break-words text-sm font-bold text-foreground">{action.title}</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{action.description}</p>
          </div>
          {action.href && (
            <Link href={action.href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(13,59,46,0.16)] hover:bg-[var(--primary-hover)]">
              {action.label}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function getPrimaryAction({
  role,
  executionUnlocked,
  currentStage,
  projectStatus,
  base,
}: {
  role: WorkspaceRole;
  executionUnlocked: boolean;
  currentStage: { status: string; title: string } | null;
  projectStatus: string;
  base: string;
}) {
  if (!executionUnlocked) {
    return {
      title: "Продолжите работу с договором",
      description: "Рабочие разделы и действия по этапам станут доступны после оформления договора.",
      label: "Открыть договор",
      href: `${base}/contract`,
    };
  }

  if (projectStatus === "completed") {
    return { title: "Проект завершён", description: "Все дальнейшие действия доступны в истории и разделах проекта.", label: "Открыть обзор", href: base };
  }

  if (role === "customer" && currentStage?.status === "awaiting_review") {
    return {
      title: `Проверьте этап «${currentStage.title}»`,
      description: "Подрядчик сообщил о завершении. Проверьте материалы и примите решение.",
      label: "Проверить этап",
      href: `${base}#workspace-next-action`,
    };
  }

  if (role === "contractor" && currentStage) {
    if (currentStage.status === "awaiting_review") {
      return { title: "Ожидается решение заказчика", description: `Этап «${currentStage.title}» отправлен на проверку.`, label: "Открыть общение", href: `${base}/chat` };
    }
    return {
      title: currentStage.status === "revision_required" ? "Исправьте замечания по этапу" : `Продолжите этап «${currentStage.title}»`,
      description: currentStage.status === "revision_required" ? "Заказчик оставил замечание — продолжите работу после исправлений." : "Когда работа будет готова, отправьте этап заказчику на проверку.",
      label: "Открыть этап",
      href: `${base}#project-work`,
    };
  }

  if (role === "contractor") {
    return { title: "Составьте план работ", description: "Добавьте этапы, чтобы заказчик видел последовательность и сроки.", label: "Добавить этап", href: `${base}#project-work` };
  }

  return { title: "Следите за ходом работ", description: "Здесь появится действие, когда понадобится ваше решение.", label: "Открыть этапы", href: `${base}#project-work` };
}
