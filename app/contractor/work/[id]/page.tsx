import Link from "next/link";
import { redirect } from "next/navigation";

import { getProjectWorkspace } from
  "@/features/workspace/queries/get-project-workspace";

import { WorkspaceProgress } from
  "@/features/workspace/components/workspace-progress";

import { WorkspaceStageList } from
  "@/features/workspace/components/workspace-stage-list";

import { WorkspaceTimeline } from
  "@/features/workspace/components/workspace-timeline";

import { ContractorStageManager } from
  "@/features/workspace/components/contractor-stage-manager";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ContractorWorkspacePage({
  params,
}: Props) {
  const { id } = await params;

  const workspace = await getProjectWorkspace(id);

  if (workspace.currentUser.role !== "contractor") {
    redirect("/dashboard");
  }

  const {
    project,
    customer,
    selectedBid,
    stages,
    events,
  } = workspace;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/contractor/bids"
          className="text-sm font-medium text-blue-700"
        >
          ← Вернуться к предложениям
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Рабочее пространство подрядчика
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              {project.title}
            </h1>

            <p className="mt-3 text-slate-600">
              {project.city}
              {project.address
                ? `, ${project.address}`
                : ""}
            </p>
          </div>

          <ProjectStatusBadge status={project.status} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <WorkspaceProgress stages={stages} />

            <ContractorStageManager
              projectId={project.id}
              stages={stages}
            />

            <WorkspaceStageList stages={stages} />

            <WorkspaceTimeline events={events} />
          </div>

          <aside className="space-y-6">
            <CustomerCard customer={customer} />

            <SelectedBidCard bid={selectedBid} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function CustomerCard({
  customer,
}: {
  customer: {
    first_name: string;
    last_name: string | null;
    phone: string | null;
    city: string | null;
  } | null;
}) {
  const fullName = customer
    ? [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(" ")
    : null;

  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-lg font-semibold">
        Заказчик
      </h2>

      {!customer ? (
        <p className="mt-4 text-sm text-slate-500">
          Данные заказчика недоступны.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="font-semibold">{fullName}</p>

          {customer.city && (
            <p className="text-sm text-slate-600">
              {customer.city}
            </p>
          )}

          {customer.phone && (
            <p className="text-sm">
              {customer.phone}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function SelectedBidCard({
  bid,
}: {
  bid: {
    price: number | string;
    duration_days: number;
    proposed_start_date: string | null;
  } | null;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-lg font-semibold">
        Ваше предложение
      </h2>

      {!bid ? (
        <p className="mt-4 text-sm text-slate-500">
          Предложение не найдено.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <InfoLine
            label="Стоимость"
            value={formatMoney(bid.price)}
          />

          <InfoLine
            label="Срок"
            value={`${bid.duration_days} дней`}
          />

          <InfoLine
            label="Начало"
            value={
              formatDate(bid.proposed_start_date) ??
              "Не указано"
            }
          />
        </div>
      )}
    </section>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-3 last:border-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-semibold">
        {value}
      </span>
    </div>
  );
}

function ProjectStatusBadge({
  status,
}: {
  status: string;
}) {
  const labels: Record<string, string> = {
    contractor_selected: "Подрядчик выбран",
    in_progress: "В работе",
    completed: "Завершён",
    disputed: "Спор",
  };

  return (
    <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">
      {labels[status] ?? status}
    </span>
  );
}

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}