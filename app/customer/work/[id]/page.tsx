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
  import { CustomerStageReview } from
  "@/features/workspace/components/customer-stage-review";
  import { StageFileGallery } from
  "@/features/workspace/components/stage-file-gallery";
  import { getProjectMessages } from
  "@/features/chat/queries/get-project-messages";
import { ProjectChat } from
  "@/features/chat/components/project-chat";
 

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CustomerWorkspacePage({
  params,
}: Props) {
  const { id } = await params;

  const workspace =
    await getProjectWorkspace(id);
    const chatData =
  await getProjectMessages(id);

  if (
    workspace.currentUser.role !==
    "customer"
  ) {
    redirect("/dashboard");
  }

  const {
    project,
    contractor,
    selectedBid,
    stages,
    events,
    files,
  } = workspace;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href={`/customer/projects/${project.id}`}
          className="text-sm font-medium text-blue-700"
        >
          ← Вернуться к проекту
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Рабочее пространство
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

          <ProjectStatusBadge
            status={project.status}
          />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
           <WorkspaceProgress stages={stages} />

            <CustomerStageReview
            projectId={project.id}
            stages={stages}
            />

           <WorkspaceStageList
  stages={stages}
/>

<ProjectChat
  projectId={project.id}
  currentUserId={
    workspace.currentUser.id
  }
  initialMessages={
    chatData.messages
  }
  initialUnreadCount={
    chatData.unreadCount
  }
  otherUserLastReadAt={
    chatData.otherUserReadState
      ?.last_read_at ?? null
  }
/>

<WorkspaceTimeline
  events={events}
/>
            <section className="rounded-2xl border bg-white p-6">
  <h2 className="text-xl font-semibold">
    Фото и документы
  </h2>

  {stages.length === 0 ? (
    <p className="mt-4 text-sm text-slate-500">
      Этапы пока не созданы.
    </p>
  ) : (
    <div className="mt-6 space-y-6">
      {stages.map((stage) => {
        const stageFiles =
          files.filter(
            (file) =>
              file.stage_id ===
              stage.id
          );

        return (
          <article
            key={stage.id}
            className="rounded-xl border p-5"
          >
            <h3 className="font-semibold">
              {stage.title}
            </h3>

            <StageFileGallery
              projectId={project.id}
              files={stageFiles}
              currentUserId={
                workspace.currentUser.id
              }
            />
          </article>
        );
      })}
    </div>
  )}
</section>

            <WorkspaceTimeline
              events={events}
            />
          </div>

          <aside className="space-y-6">
            <ContractorCard
              contractor={contractor}
            />

            <SelectedBidCard
              bid={selectedBid}
            />

            <ProjectDatesCard
              project={project}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function ContractorCard({
  contractor,
}: {
  contractor: {
    public_name: string;
    legal_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    rating: number | string;
    rating_count: number;
  } | null;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-lg font-semibold">
        Подрядчик
      </h2>

      {!contractor ? (
        <p className="mt-4 text-sm text-slate-500">
          Подрядчик ещё не выбран.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="font-semibold">
            {contractor.public_name}
          </p>

          {contractor.legal_name && (
            <p className="text-sm text-slate-600">
              {contractor.legal_name}
            </p>
          )}

          <p className="text-sm text-slate-600">
            Рейтинг:{" "}
            {Number(
              contractor.rating
            ).toFixed(1)}
            {" · "}
            отзывов:{" "}
            {contractor.rating_count}
          </p>

          {contractor.contact_phone && (
            <p className="text-sm">
              {contractor.contact_phone}
            </p>
          )}

          {contractor.contact_email && (
            <p className="text-sm">
              {contractor.contact_email}
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
        Принятое предложение
      </h2>

      {!bid ? (
        <p className="mt-4 text-sm text-slate-500">
          Предложение не выбрано.
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
              formatDate(
                bid.proposed_start_date
              ) ?? "Не указано"
            }
          />
        </div>
      )}
    </section>
  );
}

function ProjectDatesCard({
  project,
}: {
  project: {
    contractor_selected_at: string | null;
    work_started_at: string | null;
    completed_at: string | null;
  };
}) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-lg font-semibold">
        Основные даты
      </h2>

      <div className="mt-4 space-y-3">
        <InfoLine
          label="Подрядчик выбран"
          value={
            formatDateTime(
              project.contractor_selected_at
            ) ?? "Не указано"
          }
        />

        <InfoLine
          label="Работы начаты"
          value={
            formatDateTime(
              project.work_started_at
            ) ?? "Не начаты"
          }
        />

        <InfoLine
          label="Завершено"
          value={
            formatDateTime(
              project.completed_at
            ) ?? "Не завершено"
          }
        />
      </div>
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
    contractor_selected:
      "Подрядчик выбран",
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

function formatMoney(
  value: number | string
) {
  return new Intl.NumberFormat(
    "ru-RU",
    {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }
  ).format(Number(value));
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "medium",
    }
  ).format(
    new Date(`${value}T00:00:00`)
  );
}

function formatDateTime(
  value: string | null
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
}