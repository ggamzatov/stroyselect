import Link from "next/link";
import { AlertTriangle, Database, History, ShieldCheck } from "lucide-react";

import { RegistryCheckForm } from "@/features/admin/contractors/components/registry-check-form";

type ProfileChange = {
  id: string;
  changed_fields: string[];
  before_data: Record<string, unknown>;
  after_data: Record<string, unknown>;
  created_at: string;
};

type RegistryCheck = {
  id: string;
  source: string;
  identifier_type: string;
  identifier_value: string;
  status: string;
  checked_at: string;
  review_note: string | null;
};

type OpenMatch = {
  id: string;
  match_type: string;
  match_value: string;
  status: string;
  other_id: string;
  other_name: string;
};

export function ContractorDataQualityPanel({
  contractorId,
  inn,
  ogrn,
  profileChanges,
  registryChecks,
  openMatches,
}: {
  contractorId: string;
  inn: string | null;
  ogrn: string | null;
  profileChanges: ProfileChange[];
  registryChecks: RegistryCheck[];
  openMatches: OpenMatch[];
}) {
  return (
    <>
      {openMatches.length > 0 && (
        <section className="rounded-[1.75rem] border border-amber-300 bg-amber-50/70 p-6 dark:border-amber-800 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="min-w-0">
              <h2 className="font-bold text-foreground">Подтверждение временно заблокировано</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Обнаружено совпадение реквизитов с другим профилем. Сначала разберите его в разделе «Качество данных».</p>
              <div className="mt-3 space-y-2">
                {openMatches.map((match) => (
                  <p key={match.id} className="break-words text-sm font-semibold text-foreground">
                    {match.match_type === "inn" ? "ИНН" : "ОГРН"} {match.match_value} · {match.other_name}
                  </p>
                ))}
              </div>
              <Link href="/admin/data-quality" className="mt-4 inline-flex rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white">Разобрать совпадения</Link>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary"><Database className="h-5 w-5" /></span>
          <div>
            <h2 className="text-xl font-bold text-foreground">Проверка по реестрам</h2>
            <p className="mt-1 text-xs text-muted-foreground">Фиксируйте результат сверки с официальным источником</p>
          </div>
        </div>
        <div className="mt-6"><RegistryCheckForm contractorId={contractorId} inn={inn} ogrn={ogrn} /></div>

        <div className="mt-6 border-t border-border pt-5">
          <h3 className="font-semibold text-foreground">Последние проверки</h3>
          {registryChecks.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Проверок пока нет.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {registryChecks.map((check) => (
                <article key={check.id} className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="break-words text-sm font-semibold text-foreground">{formatSource(check.source)} · {formatIdentifier(check.identifier_type)} {check.identifier_value}</p>
                    <span className={statusClass(check.status)}>{formatStatus(check.status)}</span>
                  </div>
                  {check.review_note && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{check.review_note}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(check.checked_at)}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary"><History className="h-5 w-5" /></span>
          <div><h2 className="text-xl font-bold text-foreground">История реквизитов</h2><p className="mt-1 text-xs text-muted-foreground">Изменения ключевых данных компании</p></div>
        </div>
        {profileChanges.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Изменений реквизитов после включения истории пока нет.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {profileChanges.map((change) => (
              <article key={change.id} className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ShieldCheck className="h-4 w-4 text-primary" />{change.changed_fields.map(formatField).join(", ")}</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <DataSnapshot title="Было" data={change.before_data} fields={change.changed_fields} />
                  <DataSnapshot title="Стало" data={change.after_data} fields={change.changed_fields} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{formatDate(change.created_at)}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function DataSnapshot({ title, data, fields }: { title: string; data: Record<string, unknown>; fields: string[] }) {
  return <div className="rounded-xl bg-secondary/40 p-3"><p className="text-xs font-semibold text-primary">{title}</p><div className="mt-2 space-y-1">{fields.map((field) => <p key={field} className="break-words text-xs text-muted-foreground"><span className="font-semibold text-foreground">{formatField(field)}:</span> {formatValue(data[field])}</p>)}</div></div>;
}
function formatValue(value: unknown) { if (value === null || value === undefined || value === "") return "—"; if (typeof value === "boolean") return value ? "Да" : "Нет"; return String(value); }
function formatField(value: string) { return ({ public_name: "Публичное название", legal_name: "Юридическое название", company_type: "Тип компании", inn: "ИНН", ogrn: "ОГРН / ОГРНИП", contact_phone: "Телефон", contact_email: "Email", website: "Сайт", accepts_new_projects: "Приём новых проектов" } as Record<string,string>)[value] ?? value; }
function formatSource(value: string) { return ({ fns_egrul_egrip: "ФНС ЕГРЮЛ/ЕГРИП", fns_transparent_business: "ФНС Прозрачный бизнес", sro_registry: "Реестр СРО", license_registry: "Реестр лицензий", other: "Другой источник" } as Record<string,string>)[value] ?? value; }
function formatIdentifier(value: string) { return ({ inn: "ИНН", ogrn: "ОГРН", license: "Лицензия", sro: "СРО", other: "Идентификатор" } as Record<string,string>)[value] ?? value; }
function formatStatus(value: string) { return value === "matched" ? "Совпадает" : value === "mismatch" ? "Расхождение" : value === "error" ? "Ошибка проверки" : "Не проверено"; }
function statusClass(value: string) { return ["rounded-full px-2.5 py-1 text-xs font-semibold", value === "matched" ? "bg-emerald-50 text-emerald-700" : value === "mismatch" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"].join(" "); }
function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
