import type { ProjectContractView } from "@/features/workspace/queries/get-project-contract";
import { PrintContractButton } from "@/features/workspace/components/print-contract-button";

export function ContractPrintDocument({contract}:{contract:ProjectContractView}){
  if(!contract.contractId||!contract.body)return <main className="mx-auto max-w-3xl p-8"><p>Договор ещё не сформирован.</p></main>;
  return <main className="mx-auto max-w-[210mm] bg-white p-6 text-black print:max-w-none print:p-0 md:p-10">
    <div className="mb-6 flex items-center justify-between gap-4 print:hidden"><div><p className="text-xs text-neutral-500">СтройВыбор · версия {contract.versionNo}</p><h1 className="text-xl font-bold">{contract.title}</h1></div><PrintContractButton/></div>
    <article className="min-h-[260mm] border border-neutral-200 bg-white p-7 print:min-h-0 print:border-0 print:p-0">
      <div className="mb-6 border-b border-neutral-300 pb-4"><p className="text-xs uppercase tracking-wider text-neutral-500">Проект</p><h1 className="mt-1 text-2xl font-bold">{contract.projectTitle}</h1><p className="mt-2 text-sm text-neutral-600">Редакция договора № {contract.versionNo}. Статус: {contract.status==="active"?"подписан обеими сторонами":"ожидает согласования"}.</p></div>
      <pre className="whitespace-pre-wrap break-words font-serif text-[11pt] leading-[1.55] [overflow-wrap:anywhere]">{contract.body}</pre>
      <footer className="mt-10 grid gap-5 border-t border-neutral-300 pt-5 text-sm sm:grid-cols-2"><div><strong>Заказчик</strong><p className="mt-1 text-neutral-600">{contract.customerApprovedAt?`Электронно подписано ${formatDateTime(contract.customerApprovedAt)}`:"Подпись отсутствует"}</p></div><div><strong>Подрядчик</strong><p className="mt-1 text-neutral-600">{contract.contractorApprovedAt?`Электронно подписано ${formatDateTime(contract.contractorApprovedAt)}`:"Подпись отсутствует"}</p></div></footer>
    </article>
  </main>;
}
function formatDateTime(value:string|Date){return new Intl.DateTimeFormat("ru-RU",{dateStyle:"long",timeStyle:"short"}).format(new Date(value))}
