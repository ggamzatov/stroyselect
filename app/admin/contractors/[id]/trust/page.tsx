import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCheck2, ShieldCheck } from "lucide-react";

import { db } from "@/lib/db/pool";
import { getSignedFileUrl } from "@/lib/storage/get-signed-file-url";
import { reviewContractorTrustDocument } from "@/features/admin/contractors/actions/review-contractor-trust-document";

type CompanyRow = { id:string; public_name:string; verification_status:string; insurance_provider:string|null; insurance_policy_number:string|null; insurance_expires_at:string|null; license_summary:string|null };
type DocRow = { id:string; kind:string; title:string; storage_bucket:string; storage_path:string; file_name:string; expires_at:string|null; status:string; review_comment:string|null; created_at:string|Date };

export default async function AdminContractorTrustPage({ params }: { params:Promise<{id:string}> }) {
  const { id } = await params;
  const companyResult = await db.query<CompanyRow>(
    `SELECT id,public_name,verification_status::text,insurance_provider,insurance_policy_number,
            insurance_expires_at::text,license_summary
     FROM public.contractor_companies WHERE id=$1::uuid LIMIT 1`,[id]
  );
  const company=companyResult.rows[0];
  if(!company) notFound();
  const documentsResult=await db.query<DocRow>(
    `SELECT id,kind,title,storage_bucket,storage_path,file_name,expires_at::text,status,review_comment,created_at
     FROM public.contractor_verification_documents WHERE contractor_id=$1::uuid
     ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END,created_at DESC`,[id]
  );
  const documents=await Promise.all(documentsResult.rows.map(async(doc)=>({
    ...doc,
    url: await getSignedFileUrl({ bucket:doc.storage_bucket,key:doc.storage_path,expiresIn:900 }).catch(()=>null),
  })));

  return <div className="space-y-6">
    <Link href={`/admin/contractors/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />Карточка подрядчика</Link>
    <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Trust moderation</p><h1 className="mt-2 text-3xl font-black tracking-tight">{company.public_name}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Проверяйте подтверждающие документы отдельно от общего статуса компании. Только подтверждённые документы учитываются в публичном trust-profile.</p></div><ShieldCheck className="h-9 w-9 text-primary" /></div></section>
    <section className="grid gap-4 md:grid-cols-3"><Info label="Страховая" value={company.insurance_provider}/><Info label="Полис" value={company.insurance_policy_number}/><Info label="Страхование до" value={company.insurance_expires_at?formatDate(company.insurance_expires_at):null}/></section>
    {company.license_summary&&<section className="rounded-[1.5rem] border border-border bg-card p-5"><h2 className="font-bold">Заявленные лицензии / СРО</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{company.license_summary}</p></section>}
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]"><h2 className="text-xl font-bold">Документы ({documents.length})</h2><div className="mt-5 space-y-4">{documents.length?documents.map(doc=><article key={doc.id} className="rounded-2xl border border-border bg-background p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><FileCheck2 className="mt-0.5 h-5 w-5 text-primary"/><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{doc.title}</h3><span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold uppercase">{formatStatus(doc.status)}</span></div><p className="mt-1 text-xs text-muted-foreground">{doc.file_name} · {doc.kind}{doc.expires_at?` · до ${formatDate(doc.expires_at)}`:""}</p>{doc.review_comment&&<p className="mt-2 text-sm text-destructive">{doc.review_comment}</p>}</div></div>{doc.url&&<a href={doc.url} target="_blank" rel="noreferrer" className="rounded-xl border border-border px-3 py-2 text-xs font-bold">Открыть файл</a>}</div>{doc.status==='pending'&&<div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2"><form action={reviewContractorTrustDocument}><input type="hidden" name="contractorId" value={id}/><input type="hidden" name="documentId" value={doc.id}/><input type="hidden" name="decision" value="verify"/><button className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Подтвердить документ</button></form><form action={reviewContractorTrustDocument} className="flex gap-2"><input type="hidden" name="contractorId" value={id}/><input type="hidden" name="documentId" value={doc.id}/><input type="hidden" name="decision" value="reject"/><input name="comment" required minLength={3} className="stroy-input min-w-0" placeholder="Причина отклонения"/><button className="shrink-0 rounded-xl border border-destructive/30 px-4 text-sm font-semibold text-destructive">Отклонить</button></form></div>}</article>):<p className="text-sm text-muted-foreground">Подрядчик ещё не загрузил проверочные документы.</p>}</div></section>
  </div>;
}
function Info({label,value}:{label:string;value:string|null}){return <div className="rounded-[1.4rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-bold">{value||'Не указано'}</p></div>}
function formatStatus(value:string){return value==='verified'?'Проверен':value==='rejected'?'Отклонён':value==='expired'?'Истёк':'На проверке'}
function formatDate(value:string){return new Intl.DateTimeFormat('ru-RU').format(new Date(value))}
