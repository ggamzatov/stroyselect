import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, FileCheck2, ShieldCheck } from "lucide-react";

import { db } from "@/lib/db/pool";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import {
  saveContractorTrust,
  uploadContractorVerificationDocument,
} from "@/features/contractors/actions/contractor-trust";

type CompanyRow = {
  id: string;
  verification_status: string;
  verified_at: string | Date | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_expires_at: string | null;
  license_summary: string | null;
};
type DocumentRow = {
  id: string;
  kind: string;
  title: string;
  file_name: string;
  expires_at: string | null;
  status: string;
  created_at: string | Date;
};
type HistoryRow = { id: string; status: string; comment: string | null; created_at: string | Date };

export default async function ContractorTrustPage() {
  const { user, profile } = await getCurrentProfile();
  if (profile.role !== "contractor") redirect("/dashboard");

  const companyResult = await db.query<CompanyRow>(
    `SELECT id,verification_status::text,verified_at,insurance_provider,insurance_policy_number,
            insurance_expires_at::text,license_summary
     FROM public.contractor_companies WHERE owner_id=$1::uuid LIMIT 1`,
    [user.id]
  );
  const company = companyResult.rows[0];
  if (!company) redirect("/contractor/company");

  const [documentsResult, historyResult] = await Promise.all([
    db.query<DocumentRow>(
      `SELECT id,kind,title,file_name,expires_at::text,status,created_at
       FROM public.contractor_verification_documents
       WHERE contractor_id=$1::uuid ORDER BY created_at DESC`,
      [company.id]
    ),
    db.query<HistoryRow>(
      `SELECT id,status,comment,created_at FROM public.contractor_verification_history
       WHERE contractor_id=$1::uuid ORDER BY created_at DESC LIMIT 20`,
      [company.id]
    ),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container max-w-5xl py-8 md:py-12">
        <Link href="/contractor/company" className="text-sm font-semibold text-muted-foreground hover:text-primary">← Профиль компании</Link>
        <section className="mt-5 rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="flex items-start justify-between gap-5">
            <div><p className="text-sm font-semibold text-primary">Центр доверия</p><h1 className="mt-2 text-3xl font-black tracking-tight">Проверка и документы</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Храните регистрационные документы, лицензии, СРО, сертификаты и страхование. Статус и срок действия учитываются при проверке профиля.</p></div>
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-sm font-semibold"><BadgeCheck className="h-4 w-4 text-primary" />{formatStatus(company.verification_status)}{company.verified_at ? ` · с ${formatDate(company.verified_at)}` : ""}</div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <form action={saveContractorTrust} className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-xl font-bold">Страхование и лицензии</h2>
            <div className="mt-5 space-y-4">
              <Field label="Страховая компания"><input name="insuranceProvider" defaultValue={company.insurance_provider ?? ""} className="stroy-input" /></Field>
              <Field label="Номер полиса"><input name="insurancePolicyNumber" defaultValue={company.insurance_policy_number ?? ""} className="stroy-input" /></Field>
              <Field label="Страхование действует до"><input type="date" name="insuranceExpiresAt" defaultValue={company.insurance_expires_at ?? ""} className="stroy-input" /></Field>
              <Field label="Лицензии / СРО / сертификаты"><textarea name="licenseSummary" defaultValue={company.license_summary ?? ""} className="stroy-textarea" rows={5} /></Field>
            </div>
            <button className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Сохранить сведения</button>
          </form>

          <form action={uploadContractorVerificationDocument} className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-xl font-bold">Добавить документ</h2>
            <div className="mt-5 space-y-4">
              <Field label="Тип"><select name="kind" className="stroy-select" defaultValue="registration"><option value="registration">Регистрационный</option><option value="tax">Налоговый</option><option value="license">Лицензия</option><option value="sro">СРО</option><option value="insurance">Страхование</option><option value="certificate">Сертификат</option><option value="identity">Удостоверение</option><option value="other">Другое</option></select></Field>
              <Field label="Название"><input name="title" required className="stroy-input" placeholder="Например, выписка СРО" /></Field>
              <Field label="Действует до"><input type="date" name="expiresAt" className="stroy-input" /></Field>
              <Field label="Файл PDF/JPG/PNG"><input type="file" name="file" required accept=".pdf,.jpg,.jpeg,.png,.webp" className="stroy-input" /></Field>
            </div>
            <button className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Загрузить на проверку</button>
          </form>
        </div>

        <section className="mt-6 rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-bold">Документы ({documentsResult.rows.length})</h2>
          <div className="mt-5 space-y-3">{documentsResult.rows.length ? documentsResult.rows.map((doc) => <div key={doc.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><FileCheck2 className="mt-0.5 h-5 w-5 text-primary" /><div><p className="font-semibold">{doc.title}</p><p className="text-xs text-muted-foreground">{doc.file_name}{doc.expires_at ? ` · до ${formatDate(doc.expires_at)}` : ""}</p></div></div><span className="text-xs font-bold uppercase text-primary">{formatDocumentStatus(doc.status)}</span></div>) : <p className="text-sm text-muted-foreground">Документы ещё не загружены.</p>}</div>
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-bold">История проверки</h2>
          <div className="mt-5 space-y-3">{historyResult.rows.length ? historyResult.rows.map((item) => <div key={item.id} className="rounded-xl bg-secondary/40 px-4 py-3"><div className="flex justify-between gap-4"><strong className="text-sm">{formatStatus(item.status)}</strong><span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span></div>{item.comment && <p className="mt-1 text-sm text-muted-foreground">{item.comment}</p>}</div>) : <p className="text-sm text-muted-foreground">Изменений статуса пока нет.</p>}</div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span>{children}</label>; }
function formatStatus(value: string) { return value === "verified" ? "Профиль подтверждён" : value === "pending" ? "На проверке" : value === "rejected" ? "Требует исправлений" : value === "suspended" ? "Приостановлен" : "Черновик"; }
function formatDocumentStatus(value: string) { return value === "verified" ? "Проверен" : value === "rejected" ? "Отклонён" : value === "expired" ? "Истёк" : "На проверке"; }
function formatDate(value: string | Date) { return new Intl.DateTimeFormat("ru-RU").format(new Date(value)); }
