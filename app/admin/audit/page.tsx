import { History } from "lucide-react";

import { getAdminAudit } from "@/features/admin/audit/queries/get-admin-audit";

export default async function AdminAuditPage() {
  const rows = await getAdminAudit();
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary"><History className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-primary">Контроль действий</p><h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">Журнал администратора</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Неизменяемая история важных административных решений: справочники, ошибки, отзывы и другие критичные операции.</p></div></div>
      </section>
      <section className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Время</th><th className="px-4 py-3">Администратор</th><th className="px-4 py-3">Действие</th><th className="px-4 py-3">Объект</th><th className="px-4 py-3">Причина</th></tr></thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => <tr key={row.id}><td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(row.created_at)}</td><td className="px-4 py-3 font-semibold text-foreground">{row.actor_name}</td><td className="px-4 py-3"><code className="text-xs">{row.action}</code></td><td className="px-4 py-3 text-xs text-muted-foreground">{row.entity_type}{row.entity_id ? ` · ${row.entity_id}` : ""}</td><td className="max-w-sm px-4 py-3 text-xs text-muted-foreground">{row.reason || "—"}</td></tr>)}
              {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Записей пока нет.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(date);
}
