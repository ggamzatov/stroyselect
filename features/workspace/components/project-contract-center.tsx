import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileDown,
  FileSignature,
  History,
  Printer,
  ShieldCheck,
} from "lucide-react";

import { approveProjectContract } from "@/features/workspace/actions/project-contracts";
import { ProjectContractBuilder } from "@/features/workspace/components/project-contract-builder";
import type { ProjectContractView } from "@/features/workspace/queries/get-project-contract";

export function ProjectContractCenter({ contract }: { contract: ProjectContractView }) {
  const viewerApproved =
    contract.viewerRole === "customer"
      ? Boolean(contract.customerApprovedAt)
      : Boolean(contract.contractorApprovedAt);
  const roleBase = contract.viewerRole === "customer" ? "customer" : "contractor";
  const bothApproved = Boolean(contract.customerApprovedAt && contract.contractorApprovedAt);

  return (
    <div className="app-container py-6 md:py-8">
      <Link
        href={`/${roleBase}/work/${contract.projectId}`}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        К проекту
      </Link>

      <section className="ui-v2-panel mt-3 overflow-hidden p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
                <FileSignature className="h-4 w-4" aria-hidden="true" />
                Договор проекта
              </span>
              {contract.contractId ? (
                <StatusBadge status={contract.status} />
              ) : (
                <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">
                  Ещё не сформирован
                </span>
              )}
            </div>

            <h1 className="mt-4 break-words text-2xl font-black tracking-[-0.035em] sm:text-3xl lg:text-4xl">
              {contract.projectTitle}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Условия, версии и электронные подписи собраны в одном месте. Новая редакция
              сохраняется отдельно, а подписи предыдущей версии не переносятся.
            </p>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:w-[430px]">
            <ApprovalSummary
              label="Заказчик"
              approvedAt={contract.customerApprovedAt}
            />
            <ApprovalSummary
              label="Подрядчик"
              approvedAt={contract.contractorApprovedAt}
            />
          </div>
        </div>

        {contract.contractId ? (
          <div className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
            <Metric
              label="Текущая версия"
              value={`№ ${contract.versionNo ?? "—"}`}
              icon={<History className="h-4 w-4" />}
            />
            <Metric
              label="Подписи"
              value={bothApproved ? "Обе стороны" : "Ожидаются"}
              icon={<BadgeCheck className="h-4 w-4" />}
            />
            <Metric
              label="Архив редакций"
              value={String(contract.versions.length)}
              icon={<FileSignature className="h-4 w-4" />}
            />
          </div>
        ) : null}
      </section>

      {!contract.contractId ? (
        <section className="ui-v2-panel mt-5 p-5 sm:p-6 lg:p-7">
          {contract.viewerRole === "customer" && contract.hasSelectedContractor ? (
            <>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <FileSignature className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-black">Составить договор</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Заполните только условия, которые относятся к этому объекту. Полный текст
                    появится до подписания и останется доступен для проверки.
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <ProjectContractBuilder projectId={contract.projectId} />
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-muted p-5 text-sm leading-6 text-muted-foreground">
              Договор ещё не сформирован заказчиком.
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="ui-v2-panel mt-5 overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-border p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Версия {contract.versionNo}
                </p>
                <h2 className="mt-1 break-words text-xl font-black sm:text-2xl">
                  {contract.title}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/${roleBase}/work/${contract.projectId}/contract/print`}
                  target="_blank"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold transition hover:bg-secondary"
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  Печать / PDF
                </Link>
                <a
                  href={`/api/contracts/${contract.projectId}/docx${
                    contract.versionNo ? `?version=${contract.versionNo}` : ""
                  }`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold transition hover:bg-secondary"
                >
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  Скачать DOCX
                </a>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="rounded-2xl border border-border bg-background/70 p-4 sm:p-5">
                <pre className="max-w-full whitespace-pre-wrap break-words font-sans text-sm leading-7 text-foreground [overflow-wrap:anywhere]">
                  {contract.body}
                </pre>
              </div>
            </div>

            {contract.viewerRole === "customer" ? (
              <div className="border-t border-border bg-muted/30 p-5 sm:p-6">
                <h3 className="text-lg font-black">Изменить условия и создать новую версию</h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Новая редакция не изменяет уже сохранённую версию. После формирования стороны
                  должны отдельно проверить и подписать новую редакцию.
                </p>
                <div className="mt-5">
                  <ProjectContractBuilder projectId={contract.projectId} regenerate />
                </div>
              </div>
            ) : null}
          </section>

          <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="ui-v2-panel p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <History className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-black">Архив версий договора</h2>
                  <p className="text-xs text-muted-foreground">
                    Сохранённые редакции неизменяемы и остаются в истории проекта.
                  </p>
                </div>
              </div>

              {contract.versions.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {contract.versions.map((version) => (
                    <div
                      key={version.versionNo}
                      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-bold">
                          Версия {version.versionNo} · {version.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Создана {formatDate(version.createdAt)} · шаблон {version.legalTemplateVersion}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          {version.customerApprovedAt && version.contractorApprovedAt
                            ? "Подписана обеими сторонами"
                            : "Подписи не завершены"}
                        </p>
                      </div>
                      <a
                        href={`/api/contracts/${contract.projectId}/docx?version=${version.versionNo}`}
                        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold transition hover:bg-secondary"
                      >
                        <FileDown className="h-4 w-4" aria-hidden="true" />
                        DOCX
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                  Предыдущих редакций пока нет.
                </p>
              )}
            </div>

            <aside className="space-y-4">
              <ApprovalCard label="Заказчик" approvedAt={contract.customerApprovedAt} />
              <ApprovalCard label="Подрядчик" approvedAt={contract.contractorApprovedAt} />
            </aside>
          </section>

          {!viewerApproved && contract.status !== "cancelled" ? (
            <section className="ui-v2-panel mt-5 border-primary/20 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-black">Подтвердить текущую версию</h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                    Подтверждение относится только к этой версии и фиксируется вместе с аккаунтом,
                    датой и техническими доказательствами.
                  </p>
                </div>
              </div>

              <form action={approveProjectContract} className="mt-5 space-y-4">
                <input type="hidden" name="projectId" value={contract.projectId} />
                <label className="flex items-start gap-3 rounded-2xl border border-border bg-background/70 p-4 text-sm leading-6">
                  <input
                    required
                    type="checkbox"
                    name="electronicSignatureAgreement"
                    value="accepted"
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 break-words">
                    Я прочитал(а) текущую версию договора, согласен(на) с её условиями и соглашаюсь
                    использовать действие в моём аутентифицированном аккаунте как простую
                    электронную подпись по правилам, указанным в договоре. Я обязуюсь сохранять
                    данные доступа в тайне.
                  </span>
                </label>
                <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.18)]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Подписать текущую версию
                </button>
              </form>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function ApprovalSummary({
  label,
  approvedAt,
}: {
  label: string;
  approvedAt: string | Date | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <div className="flex items-center gap-2">
        {approvedAt ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        ) : (
          <Clock3 className="h-4 w-4 text-amber-600" aria-hidden="true" />
        )}
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-sm font-bold">
        {approvedAt ? `Подписано ${formatDate(approvedAt)}` : "Ожидает подписи"}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-background/65 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

function ApprovalCard({
  label,
  approvedAt,
}: {
  label: string;
  approvedAt: string | Date | null;
}) {
  return (
    <div className="ui-v2-panel p-5">
      <div className="flex items-center gap-3">
        <span
          className={[
            "flex h-10 w-10 items-center justify-center rounded-xl",
            approvedAt ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground",
          ].join(" ")}
        >
          <BadgeCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Подпись стороны</p>
          <strong className="text-sm">{label}</strong>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {approvedAt ? `Подписано ${formatDate(approvedAt)}` : "Ожидает подписи"}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const active = status === "active" || status === "completed";
  return (
    <span
      className={[
        "rounded-full px-3 py-1.5 text-xs font-bold",
        active ? "bg-emerald-50 text-emerald-700" : "bg-[#fff2dc] text-[#a85f00]",
      ].join(" ")}
    >
      {formatStatus(status)}
    </span>
  );
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("ru-RU").format(new Date(value));
}

function formatStatus(status: string | null) {
  return status === "active"
    ? "Подписан сторонами"
    : status === "pending_approval"
      ? "Ожидает подписания"
      : status === "completed"
        ? "Завершён"
        : status === "cancelled"
          ? "Отменён"
          : "Черновик";
}
