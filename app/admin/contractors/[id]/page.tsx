import Link from "next/link";

import { getContractorReview } from
  "@/features/admin/contractors/queries/get-contractor-review";

import { VerificationStatusBadge } from
  "@/features/admin/contractors/components/verification-status-badge";

import { ContractorReviewActions } from
  "@/features/admin/contractors/components/contractor-review-actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ContractorReviewPage({
  params,
}: Props) {
  const { id } = await params;

  const {
    company,
    owner,
    logs,
  } = await getContractorReview(id);

  return (
    <div>
      <Link
        href="/admin/contractors"
        className="text-sm font-medium text-blue-700"
      >
        ← Вернуться к подрядчикам
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            Проверка подрядчика
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            {company.public_name}
          </h1>
        </div>

        <VerificationStatusBadge
          status={company.verification_status}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <InfoSection title="Основная информация">
            <InfoRow
              label="Публичное название"
              value={company.public_name}
            />

            <InfoRow
              label="Юридическое название"
              value={company.legal_name}
            />

            <InfoRow
              label="Тип подрядчика"
              value={formatCompanyType(
                company.company_type
              )}
            />

            <InfoRow
              label="ИНН"
              value={company.inn}
            />

            <InfoRow
              label="ОГРН / ОГРНИП"
              value={company.ogrn}
            />

            <InfoRow
              label="Год начала работы"
              value={
                company.founded_year?.toString() ??
                null
              }
            />

            <InfoRow
              label="Количество сотрудников"
              value={
                company.employee_count?.toString() ??
                null
              }
            />
          </InfoSection>

          <InfoSection title="Описание">
            <p className="whitespace-pre-wrap leading-7 text-slate-700">
              {company.description ||
                "Описание не указано"}
            </p>
          </InfoSection>

          <InfoSection title="Диапазон проектов">
            <InfoRow
              label="Минимальный бюджет"
              value={formatMoney(
                company.minimum_project_budget
              )}
            />

            <InfoRow
              label="Максимальный бюджет"
              value={formatMoney(
                company.maximum_project_budget
              )}
            />

            <InfoRow
              label="Принимает новые проекты"
              value={
                company.accepts_new_projects
                  ? "Да"
                  : "Нет"
              }
            />
          </InfoSection>

          <InfoSection title="Специализации">
            <div className="flex flex-wrap gap-2">
              {company.contractor_services
                ?.length ? (
                company.contractor_services.map(
                  (service) => (
                    <span
                      key={service.category_id}
                      className="rounded-full bg-blue-50 px-3 py-2 text-sm text-blue-800"
                    >
                      {service
                        .service_categories
                        ?.name ??
                        `Категория ${service.category_id}`}
                    </span>
                  )
                )
              ) : (
                <p className="text-slate-500">
                  Специализации не указаны
                </p>
              )}
            </div>
          </InfoSection>

          <InfoSection title="Города работы">
            <div className="flex flex-wrap gap-2">
              {company
                .contractor_service_areas
                ?.length ? (
                company
                  .contractor_service_areas
                  .map((area) => (
                    <span
                      key={area.id}
                      className="rounded-full bg-slate-100 px-3 py-2 text-sm"
                    >
                      {area.city}
                      {area.is_primary
                        ? " — основной"
                        : ""}
                    </span>
                  ))
              ) : (
                <p className="text-slate-500">
                  Города не указаны
                </p>
              )}
            </div>
          </InfoSection>

          <InfoSection title="Контактные данные">
            <InfoRow
              label="Телефон"
              value={company.contact_phone}
            />

            <InfoRow
              label="Email"
              value={company.contact_email}
            />

            <InfoRow
              label="Сайт"
              value={company.website}
            />

            <InfoRow
              label="Telegram"
              value={company.telegram}
            />
          </InfoSection>

          <InfoSection title="Владелец аккаунта">
            <InfoRow
              label="Имя"
              value={
                owner
                  ? `${owner.first_name} ${
                      owner.last_name ?? ""
                    }`.trim()
                  : null
              }
            />

            <InfoRow
              label="Телефон профиля"
              value={owner?.phone ?? null}
            />

            <InfoRow
              label="Город"
              value={owner?.city ?? null}
            />
          </InfoSection>

          <VerificationHistory logs={logs} />
        </div>

        <div>
          <ContractorReviewActions
            contractorId={company.id}
            currentStatus={
              company.verification_status
            }
          />
        </div>
      </div>
    </div>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold">
        {title}
      </h2>

      <div className="mt-5 space-y-4">
        {children}
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="grid gap-1 border-b pb-3 last:border-b-0 md:grid-cols-[220px_1fr]">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="font-medium text-slate-900">
        {value || "Не указано"}
      </span>
    </div>
  );
}

function VerificationHistory({
  logs,
}: {
  logs: Array<{
    id: string;
    previous_status: string;
    new_status: string;
    comment: string | null;
    created_at: string;
    admin_id: string;
  }>;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold">
        История проверки
      </h2>

      {logs.length === 0 ? (
        <p className="mt-4 text-slate-500">
          Решений по профилю пока нет.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border p-4"
            >
              <p className="font-medium">
                {log.previous_status}
                {" → "}
                {log.new_status}
              </p>

              {log.comment && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                  {log.comment}
                </p>
              )}

              <p className="mt-3 text-xs text-slate-400">
                {new Intl.DateTimeFormat(
                  "ru-RU",
                  {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }
                ).format(
                  new Date(log.created_at)
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatCompanyType(
  value: string | null
) {
  switch (value) {
    case "individual":
      return "Частная бригада";

    case "self_employed":
      return "Самозанятый";

    case "entrepreneur":
      return "Индивидуальный предприниматель";

    case "company":
      return "Юридическое лицо";

    default:
      return null;
  }
}

function formatMoney(
  value: number | string | null
) {
  if (value === null) {
    return null;
  }

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}