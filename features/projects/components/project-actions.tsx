import Link from "next/link";

import {
  ArrowRight,
  CheckCircle2,
  Edit3,
  FolderOpen,
  Gavel,
  Info,
  ListTodo,
  Scale,
  Search,
  Sparkles,
  UsersRound,
  XCircle,
} from "lucide-react";

import { PublishProjectButton } from "@/features/projects/components/publish-project-button";

type Props = {
  projectId: string;
  status: string;
};

export function ProjectActions({ projectId, status }: Props) {
  return (
    <section className="space-y-3">
      {status === "draft" && (
        <>
          <ActionLink href={`/customer/projects/${projectId}/edit`} icon={<Edit3 className="h-5 w-5" />}>
            Редактировать проект
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/matches`} icon={<Sparkles className="h-5 w-5" />}>
            Проверить подбор подрядчиков
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/advisor`} icon={<ListTodo className="h-5 w-5" />}>
            Project Advisor
          </ActionLink>
          <PublishProjectButton projectId={projectId} />
          <StatusMessage variant="neutral" icon={<Info className="h-5 w-5" />} title="Проект пока не опубликован">
            Проверьте описание, бюджет и сроки. Подбор уже можно посмотреть до публикации, а Project Advisor поможет собрать shortlist и следующие шаги.
          </StatusMessage>
        </>
      )}

      {status === "published" && (
        <>
          <ActionLink href={`/customer/projects/${projectId}/advisor`} icon={<ListTodo className="h-5 w-5" />} primary>
            Project Advisor
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/matches`} icon={<UsersRound className="h-5 w-5" />}>
            Подходящие подрядчики
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/bids/compare`} icon={<Scale className="h-5 w-5" />}>
            Сравнить предложения
          </ActionLink>
          <ActionLink href={`/customer/bids?projectId=${projectId}`} icon={<Search className="h-5 w-5" />}>
            Все предложения
          </ActionLink>
          <StatusMessage variant="success" icon={<CheckCircle2 className="h-5 w-5" />} title="Проект опубликован">
            Управляйте кандидатами через Project Advisor: shortlist, контакты, follow-up и история решений остаются в одном месте.
          </StatusMessage>
        </>
      )}

      {status === "matching" && (
        <>
          <ActionLink href={`/customer/projects/${projectId}/advisor`} icon={<ListTodo className="h-5 w-5" />} primary>
            Открыть Project Advisor
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/bids/compare`} icon={<Scale className="h-5 w-5" />}>
            Сравнить предложения
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/matches`} icon={<Sparkles className="h-5 w-5" />}>
            Открыть умный подбор
          </ActionLink>
          <StatusMessage variant="neutral" icon={<Info className="h-5 w-5" />} title="Идёт подбор подрядчика">
            Сравнивайте совпадение, детализированные сметы и StroySelect Score, а финалистов ведите по воронке в Project Advisor.
          </StatusMessage>
        </>
      )}

      {status === "contractor_selected" && (
        <>
          <ActionLink href={`/customer/work/${projectId}`} icon={<FolderOpen className="h-5 w-5" />} primary>
            Открыть рабочее пространство
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/advisor`} icon={<ListTodo className="h-5 w-5" />}>
            История выбора подрядчика
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/bids/compare`} icon={<Scale className="h-5 w-5" />}>
            История предложений
          </ActionLink>
          <StatusMessage variant="success" icon={<CheckCircle2 className="h-5 w-5" />} title="Подрядчик выбран">
            Project Advisor сохраняет историю shortlist, контактов и решений, а выполнение проекта продолжается в рабочем пространстве.
          </StatusMessage>
        </>
      )}

      {status === "in_progress" && (
        <>
          <ActionLink href={`/customer/work/${projectId}`} icon={<FolderOpen className="h-5 w-5" />} primary>
            Открыть рабочее пространство
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/advisor`} icon={<ListTodo className="h-5 w-5" />}>
            История выбора
          </ActionLink>
          <StatusMessage variant="neutral" icon={<Info className="h-5 w-5" />} title="Работы выполняются">
            Следите за этапами, документами и сообщениями подрядчика в рабочем пространстве проекта.
          </StatusMessage>
        </>
      )}

      {status === "completed" && (
        <>
          <ActionLink href={`/customer/work/${projectId}`} icon={<FolderOpen className="h-5 w-5" />}>
            Посмотреть рабочее пространство
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/advisor`} icon={<ListTodo className="h-5 w-5" />}>
            История выбора
          </ActionLink>
          <StatusMessage variant="success" icon={<CheckCircle2 className="h-5 w-5" />} title="Проект завершён">
            Рабочее пространство, этапы и история выбора подрядчика остаются доступными для просмотра.
          </StatusMessage>
        </>
      )}

      {status === "disputed" && (
        <>
          <ActionLink href={`/customer/work/${projectId}`} icon={<Gavel className="h-5 w-5" />} primary>
            Перейти в рабочее пространство
          </ActionLink>
          <StatusMessage variant="warning" icon={<Gavel className="h-5 w-5" />} title="По проекту открыт спор">
            Продолжайте взаимодействие и фиксируйте информацию через рабочее пространство проекта.
          </StatusMessage>
        </>
      )}

      {status === "cancelled" && (
        <StatusMessage variant="danger" icon={<XCircle className="h-5 w-5" />} title="Проект отменён">
          Доступные действия по этому проекту ограничены.
        </StatusMessage>
      )}

      {!["draft", "published", "matching", "contractor_selected", "in_progress", "completed", "disputed", "cancelled"].includes(status) && (
        <StatusMessage variant="neutral" icon={<Info className="h-5 w-5" />} title="Действия недоступны">
          Для текущего статуса проекта дополнительные действия пока не предусмотрены.
        </StatusMessage>
      )}
    </section>
  );
}

function ActionLink({ href, children, icon, primary = false }: {
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl px-4 font-semibold transition",
        primary
          ? "bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(107,70,50,0.20)] hover:-translate-y-0.5 hover:bg-[#5c3b2a]"
          : "border border-border bg-card text-foreground hover:border-primary/25 hover:bg-secondary/50",
      ].join(" ")}
    >
      <span className="flex items-center gap-3">
        <span className={["flex h-9 w-9 items-center justify-center rounded-xl", primary ? "bg-white/10" : "bg-secondary text-primary"].join(" ")}>{icon}</span>
        {children}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" />
    </Link>
  );
}

function StatusMessage({ variant, icon, title, children }: {
  variant: "neutral" | "success" | "warning" | "danger";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    neutral: "border-border bg-secondary/40 text-foreground",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200",
    warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
    danger: "border-red-200 bg-red-50 text-red-900 dark:border-red-950/40 dark:bg-red-950/30 dark:text-red-200",
  };

  return (
    <div className={["rounded-[1.25rem] border p-4", styles[variant]].join(" ")}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 opacity-80">{children}</p>
        </div>
      </div>
    </div>
  );
}
