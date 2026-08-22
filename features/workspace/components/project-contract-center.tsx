import { BadgeCheck, FileSignature, ShieldCheck } from "lucide-react";

import type { ProjectContractView } from "@/features/workspace/queries/get-project-contract";
import {
  approveProjectContract,
  createProjectContract,
} from "@/features/workspace/actions/project-contracts";

export function ProjectContractCenter({ contract }: { contract: ProjectContractView }) {
  const viewerApproved = contract.viewerRole === "customer"
    ? Boolean(contract.customerApprovedAt)
    : Boolean(contract.contractorApprovedAt);

  return (
    <div className="app-container py-8 md:py-10">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-primary">Договор и согласование</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{contract.projectTitle}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Договор формируется из выбранного предложения. Изменения стоимости, сроков и объёма после согласования оформляются через change order.</p>
          </div>
          <FileSignature className="h-10 w-10 text-primary" />
        </div>
      </section>

      {!contract.contractId ? (
        <section className="mt-6 rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          {contract.viewerRole === "customer" && contract.hasSelectedContractor ? (
            <><h2 className="text-xl font-bold">Создать договор из принятого предложения</h2><p className="mt-2 text-sm text-muted-foreground">СтройВыбор перенесёт стоимость, срок, состав работ, материалы, исключения, порядок оплаты и гарантию.</p><form action={createProjectContract} className="mt-5"><input type="hidden" name="projectId" value={contract.projectId} /><button className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Сформировать договор</button></form></>
          ) : (
            <p className="text-sm text-muted-foreground">Договор ещё не сформирован заказчиком.</p>
          )}
        </section>
      ) : (
        <>
          <section className="mt-6 rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Версия {contract.versionNo}</p><h2 className="mt-1 text-xl font-bold">{contract.title}</h2></div><span className="rounded-full bg-secondary px-3 py-2 text-xs font-bold text-primary">{formatStatus(contract.status)}</span></div>
            <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-border bg-background p-5 font-sans text-sm leading-7 text-foreground">{contract.body}</pre>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <ApprovalCard label="Заказчик" approvedAt={contract.customerApprovedAt} />
            <ApprovalCard label="Подрядчик" approvedAt={contract.contractorApprovedAt} />
          </section>

          {!viewerApproved && contract.status !== "cancelled" && (
            <section className="mt-6 rounded-[1.75rem] border border-primary/20 bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-bold">Согласовать текущую версию</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Это фиксирует согласие с текущей версией внутри СтройВыбора. Юридическая квалификация такого согласования зависит от выбранной модели электронного документооборота.</p></div></div>
              <form action={approveProjectContract} className="mt-5"><input type="hidden" name="projectId" value={contract.projectId} /><button className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Согласовать версию</button></form>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ApprovalCard({ label, approvedAt }: { label: string; approvedAt: string | Date | null }) {
  return <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><div className="flex items-center gap-2"><BadgeCheck className={`h-5 w-5 ${approvedAt ? "text-emerald-600" : "text-muted-foreground"}`} /><strong>{label}</strong></div><p className="mt-2 text-sm text-muted-foreground">{approvedAt ? `Согласовано ${new Intl.DateTimeFormat("ru-RU").format(new Date(approvedAt))}` : "Ожидает согласования"}</p></div>;
}
function formatStatus(status: string | null) { return status === "active" ? "Согласован" : status === "pending_approval" ? "Ожидает согласования" : status === "completed" ? "Завершён" : status === "cancelled" ? "Отменён" : "Черновик"; }
