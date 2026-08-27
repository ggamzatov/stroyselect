import Link from "next/link";
import {
  ArrowRight,
  Banknote,
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
    <section className="space-y-2.5">
      {status === "draft" && (
        <>
          <ActionLink href={`/customer/projects/${projectId}/edit`} icon={<Edit3 className="h-4 w-4" />}>
            Редактировать проект
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/matches`} icon={<Sparkles className="h-4 w-4" />}>
            Проверить подбор подрядчиков
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/advisor`} icon={<ListTodo className="h-4 w-4" />}>
            Project Advisor
          </ActionLink>
          <PublishProjectButton projectId={projectId} />
          <StatusMessage variant="neutral" icon={<Info className="h-4 w-4" />} title="Проект пока не опубликован">
            Проверьте описание, бюджет и сроки. Подбор уже можно посмотреть до публикации, а Project Advisor поможет собрать shortlist и следующие шаги.
          </StatusMessage>
        </>
      )}

      {status === "published" && (
        <>
          <ActionLink href={`/customer/projects/${projectId}/advisor`} icon={<ListTodo className="h-4 w-4" />} primary>
            Project Advisor
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/matches`} icon={<UsersRound className="h-4 w-4" />}>
            Подходящие подрядчики
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/bids/compare`} icon={<Scale className="h-4 w-4" />}>
            Сравнить предложения
          </ActionLink>
          <ActionLink href={`/customer/bids?projectId=${projectId}`} icon={<Search className="h-4 w-4" />}>
            Все предложения
          </ActionLink>
          <StatusMessage variant="success" icon={<CheckCircle2 className="h-4 w-4" />} title="Проект опубликован">
            Управляйте кандидатами через Project Advisor: shortlist, контакты, follow-up и история решений остаются в одном месте.
          </StatusMessage>
        </>
      )}

      {status === "matching" && (
        <>
          <ActionLink href={`/customer/projects/${projectId}/advisor`} icon={<ListTodo className="h-4 w-4" />} primary>
            Открыть Project Advisor
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/bids/compare`} icon={<Scale className="h-4 w-4" />}>
            Сравнить предложения
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/matches`} icon={<Sparkles className="h-4 w-4" />}>
            Открыть умный подбор
          </ActionLink>
          <StatusMessage variant="neutral" icon={<Info className="h-4 w-4" />} title="Идёт подбор подрядчика">
            Сравнивайте совпадение, детализированные сметы и StroySelect Score, а финалистов ведите по воронке в Project Advisor.
          </StatusMessage>
        </>
      )}

      {status === "contractor_selected" && (
        <>
          <ActionLink href={`/customer/work/${projectId}`} icon={<FolderOpen className="h-4 w-4" />} primary>
            Открыть рабочее пространство
          </ActionLink>
          <ActionLink href={`/customer/work/${projectId}/changes`} icon={<Banknote className="h-4 w-4" />}>
            Бюджет и изменения
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/advisor`} icon={<ListTodo className="h-4 w-4" />}>
            История выбора подрядчика
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/bids/compare`} icon={<Scale className="h-4 w-4" />}>
            История предложений
          </ActionLink>
          <StatusMessage variant="success" icon={<CheckCircle2 className="h-4 w-4" />} title="Подрядчик выбран">
            Project Advisor сохраняет историю выбора, а стоимость и дополнительные работы фиксируются в Budget Control.
          </StatusMessage>
        </>
      )}

      {status === "in_progress" && (
        <>
          <ActionLink href={`/customer/work/${projectId}`} icon={<FolderOpen className="h-4 w-4" />} primary>
            Открыть рабочее пространство
          </ActionLink>
          <ActionLink href={`/customer/work/${projectId}/changes`} icon={<Banknote className="h-4 w-4" />}>
            Бюджет и изменения
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/advisor`} icon={<ListTodo className="h-4 w-4" />}>
            История выбора
          </ActionLink>
          <StatusMessage variant="neutral" icon={<Info className="h-4 w-4" />} title="Работы выполняются">
            Следите за этапами, документами, платежами и согласованными изменениями проекта.
          </StatusMessage>
        </>
      )}

      {status === "completed" && (
        <>
          <ActionLink href={`/customer/work/${projectId}`} icon={<FolderOpen className="h-4 w-4" />}>
            Посмотреть рабочее пространство
          </ActionLink>
          <ActionLink href={`/customer/work/${projectId}/changes`} icon={<Banknote className="h-4 w-4" />}>
            Итоговый бюджет
          </ActionLink>
          <ActionLink href={`/customer/projects/${projectId}/advisor`} icon={<ListTodo className="h-4 w-4" />}>
            История выбора
          </ActionLink>
          <StatusMessage variant="success" icon={<CheckCircle2 className="h-4 w-4" />} title="Проект завершён">
            Рабочее пространство, финальный бюджет и история выбора подрядчика остаются доступными для просмотра.
          </StatusMessage>
        </>
      )}

      {status === "disputed" && (
        <>
          <ActionLink href={`/customer/work/${projectId}`} icon={<Gavel className="h-4 w-4" />} primary>
            Перейти в рабочее пространство
          </ActionLink>
          <ActionLink href={`/customer/work/${projectId}/changes`} icon={<Banknote className="h-4 w-4" />}>
            Бюджет и изменения
          </ActionLink>
          <StatusMessage variant="warning" icon={<Gavel className="h-4 w-4" />} title="По проекту открыт спор">
            Продолжайте взаимодействие и фиксируйте информацию через рабочее пространство проекта.
          </StatusMessage>
        </>
      )}

      {status === "cancelled" && (
        <StatusMessage variant="danger" icon={<XCircle className="h-4 w-4" />} title="Проект отменён">
          Доступные действия по этому проекту ограничены.
        </StatusMessage>
      )}

      {!["draft", "published", "matching", "contractor_selected", "in_progress", "completed", "disputed", "cancelled"].includes(status) && (
        <StatusMessage variant="neutral" icon={<Info className="h-4 w-4" />} title="Действия недоступны">
          Для текущего статуса проекта дополнительные действия пока не предусмотрены.
        </StatusMessage>
      )}
    </section>
  );
}

function ActionLink({
  href,
  children,
  icon,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3.5 text-sm font-bold transition",
        primary
          ? "bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.2)] hover:-translate-y-0.5 hover:bg-[#076c47]"
          : "border border-border bg-card text-foreground hover:border-primary/25 hover:bg-secondary/55",
      ].join(" ")}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            primary ? "bg-white/12" : "bg-secondary text-primary",
          ].join(" ")}
        >
          {icon}
        </span>
        <span className="truncate">{children}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

function StatusMessage({
  variant,
  icon,
  title,
  children,
}: {
  variant: "neutral" | "success" | "warning" | "danger";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    neutral: "border-border bg-secondary/40 text-foreground",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200",
    warning:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
    danger:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-950/40 dark:bg-red-950/30 dark:text-red-200",
  };

  return (
    <div className={`rounded-xl border p-3.5 ${styles[variant]}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-1 text-xs leading-5 opacity-80">{children}</p>
        </div>
      </div>
    </div>
  );
}
