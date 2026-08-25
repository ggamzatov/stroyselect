import { CircleDollarSign, Landmark, ReceiptText, RefreshCcw, ShieldCheck, WalletCards } from "lucide-react";

import { db } from "@/lib/db/pool";
import { recordSupplierBankPayout, refundProjectPayment, releaseProjectPayout } from "@/features/admin/actions/manage-finance";

type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
type Totals={project_gross:string|number;project_fee:string|number;contractor_payable:string|number;material_gross:string|number;material_fee:string|number;supplier_payable:string|number};
type CountRow={refund_pending:string|number;payout_processing:string|number;receipt_config:string|number};
type ProjectRow={id:string;project_title:string;stage_title:string|null;status:string;amount:string|number;payout_amount:string|number|null;platform_fee_amount:string|number|null;provider_payment_id:string|null;payout_ready:boolean;refund_status:string|null;payout_status:string|null};
type MaterialRow={id:string;project_title:string;supplier_name_snapshot:string;status:string;goods_subtotal_minor:string|number;platform_commission_minor:string|number;supplier_net_minor:string|number;payout_status:string|null};
type OperationRow={id:string;kind:string;source_type:string;status:string;amount_minor:string|number;created_at:Date|string;detail:string|null};

export default async function AdminFinancePage({searchParams}:Props){
  const query=await searchParams;
  const [totalsResult,countResult,projectsResult,materialsResult,operationsResult]=await Promise.all([
    db.query<Totals>(`
      SELECT
        COALESCE((SELECT SUM(round(ppi.amount*100)::bigint) FROM public.project_payment_intents ppi WHERE ppi.status IN ('funded','stage_submitted','release_ready','payout_processing','paid')),0) AS project_gross,
        COALESCE((SELECT SUM(round(COALESCE(ppi.platform_fee_amount,0)*100)::bigint) FROM public.project_payment_intents ppi WHERE ppi.status IN ('funded','stage_submitted','release_ready','payout_processing','paid')),0) AS project_fee,
        COALESCE((SELECT SUM(round(COALESCE(ppi.payout_amount,ppi.amount)*100)::bigint) FROM public.project_payment_intents ppi WHERE ppi.status IN ('release_ready','payout_processing')),0) AS contractor_payable,
        COALESCE((SELECT SUM(mo.goods_subtotal_minor) FROM public.material_orders mo WHERE mo.status IN ('paid','supplier_confirmed','delivery_pending','in_delivery','delivered','completed')),0) AS material_gross,
        COALESCE((SELECT SUM(mo.platform_commission_minor) FROM public.material_orders mo WHERE mo.status IN ('paid','supplier_confirmed','delivery_pending','in_delivery','delivered','completed')),0) AS material_fee,
        COALESCE((SELECT SUM(mo.supplier_net_minor) FROM public.material_orders mo WHERE mo.status='completed' AND NOT EXISTS(SELECT 1 FROM public.finance_payouts fp WHERE fp.material_order_id=mo.id AND fp.status='succeeded')),0) AS supplier_payable
    `),
    db.query<CountRow>(`
      SELECT
        (SELECT COUNT(*) FROM public.finance_refunds WHERE status='pending') AS refund_pending,
        (SELECT COUNT(*) FROM public.finance_payouts WHERE status IN ('ready','processing','blocked')) AS payout_processing,
        (SELECT COUNT(*) FROM public.finance_receipts WHERE status='configuration_required') AS receipt_config
    `),
    db.query<ProjectRow>(`
      SELECT ppi.id,p.title AS project_title,ps.title AS stage_title,ppi.status,ppi.amount,ppi.payout_amount,ppi.platform_fee_amount,ppi.provider_payment_id,
        (cpp.payout_token IS NOT NULL AND cpp.verified_at IS NOT NULL AND cpp.disabled_at IS NULL) AS payout_ready,
        (SELECT fr.status FROM public.finance_refunds fr WHERE fr.project_payment_intent_id=ppi.id ORDER BY fr.created_at DESC LIMIT 1) AS refund_status,
        (SELECT fp.status FROM public.finance_payouts fp WHERE fp.project_payment_intent_id=ppi.id ORDER BY fp.created_at DESC LIMIT 1) AS payout_status
      FROM public.project_payment_intents ppi
      JOIN public.projects p ON p.id=ppi.project_id
      LEFT JOIN public.project_stages ps ON ps.id=ppi.stage_id
      LEFT JOIN public.contractor_payout_profiles cpp ON cpp.contractor_id=p.selected_contractor_id
      WHERE ppi.status NOT IN ('planned','cancelled')
      ORDER BY ppi.updated_at DESC LIMIT 30
    `),
    db.query<MaterialRow>(`
      SELECT mo.id,p.title AS project_title,mo.supplier_name_snapshot,mo.status,mo.goods_subtotal_minor,mo.platform_commission_minor,mo.supplier_net_minor,
        (SELECT fp.status FROM public.finance_payouts fp WHERE fp.material_order_id=mo.id ORDER BY fp.created_at DESC LIMIT 1) AS payout_status
      FROM public.material_orders mo
      JOIN public.projects p ON p.id=mo.project_id
      WHERE mo.status IN ('paid','supplier_confirmed','delivery_pending','in_delivery','delivered','completed')
      ORDER BY mo.updated_at DESC LIMIT 30
    `),
    db.query<OperationRow>(`
      SELECT id,'refund'::text AS kind,source_type,status,amount_minor,created_at,failure_reason AS detail FROM public.finance_refunds
      UNION ALL
      SELECT id,'payout'::text AS kind,source_type,status,amount_minor,created_at,COALESCE(failure_reason,blocked_reason) AS detail FROM public.finance_payouts
      ORDER BY created_at DESC LIMIT 30
    `),
  ]);
  const totals=totalsResult.rows[0]??{project_gross:0,project_fee:0,contractor_payable:0,material_gross:0,material_fee:0,supplier_payable:0};
  const counts=countResult.rows[0]??{refund_pending:0,payout_processing:0,receipt_config:0};
  const message=query.refunded?"Возврат создан и подтверждён провайдером.":query.payout?"Выплата подрядчику обработана.":query.supplier_payout?"Банковский расчёт с поставщиком зафиксирован.":query.error?errorMessage(String(query.error)):null;

  return <div className="space-y-6">
    <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
      <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Landmark className="h-5 w-5"/></div><div><p className="text-sm font-semibold text-primary">Production finance</p><h1 className="mt-1 text-3xl font-black tracking-[-0.04em] md:text-4xl">Платежи и расчёты</h1><p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">Escrow-платежи по этапам, комиссии платформы, возвраты, выплаты подрядчикам и расчёты с поставщиками. Платёж заказчика и выплата получателю — разные финансовые события.</p></div></div>
    </section>
    {message&&<div className="rounded-2xl border border-border bg-card p-4 text-sm font-semibold">{message}</div>}

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Metric icon={<CircleDollarSign className="h-5 w-5"/>} label="Проекты · оплачено" value={money(totals.project_gross)} hint={`Комиссия платформы: ${money(totals.project_fee)}`}/>
      <Metric icon={<WalletCards className="h-5 w-5"/>} label="К выплате подрядчикам" value={money(totals.contractor_payable)} hint="Только принятые этапы release_ready / processing"/>
      <Metric icon={<CircleDollarSign className="h-5 w-5"/>} label="Материалы · оплачено" value={money(totals.material_gross)} hint={`Комиссия платформы: ${money(totals.material_fee)}`}/>
      <Metric icon={<Landmark className="h-5 w-5"/>} label="К расчёту с поставщиками" value={money(totals.supplier_payable)} hint="Завершённые заказы без зафиксированной выплаты"/>
      <Metric icon={<RefreshCcw className="h-5 w-5"/>} label="Операции в обработке" value={String(Number(counts.refund_pending)+Number(counts.payout_processing))} hint={`Возвраты: ${counts.refund_pending} · выплаты: ${counts.payout_processing}`}/>
      <Metric icon={<ReceiptText className="h-5 w-5"/>} label="Чеки требуют настройки" value={String(counts.receipt_config)} hint="Фискализация не включается без утверждённой 54-ФЗ/агентской модели"/>
    </section>

    <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary"/><div><h2 className="font-bold">Денежные предохранители</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Safe Deal payout доступен только после принятия этапа и только на проверенный payout-token. Полный возврат блокируется после начала выплаты. Для поставщиков кнопка ниже лишь фиксирует уже выполненный банковский перевод — приложение не имитирует YooKassa-выплату юридическому лицу.</p></div></div></section>

    <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6"><h2 className="text-xl font-bold">Расчёты по проектам</h2><div className="mt-4 space-y-3">{projectsResult.rows.map(row=><article key={row.id} className="rounded-2xl border border-border bg-background p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-semibold text-primary">{row.project_title}</p><h3 className="mt-1 font-bold">{row.stage_title??"Платёж без этапа"}</h3><p className="mt-2 text-sm text-muted-foreground">{moneyMajor(row.amount)} · комиссия {moneyMajor(row.platform_fee_amount??0)} · подрядчику {moneyMajor(row.payout_amount??row.amount)}</p><p className="mt-1 text-xs text-muted-foreground">Платёж: {row.provider_payment_id??"не создан"}</p></div><Status value={row.status}/></div><div className="mt-4 flex flex-wrap gap-2">{row.status==="release_ready"&&!row.payout_status&&row.payout_ready&&<form action={releaseProjectPayout}><input type="hidden" name="intentId" value={row.id}/><button className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Выплатить подрядчику</button></form>}{row.status==="release_ready"&&!row.payout_ready&&<span className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground">Нет проверенного payout-token</span>}{["funded","stage_submitted","release_ready","disputed"].includes(row.status)&&!row.refund_status&&!row.payout_status&&<form action={refundProjectPayment} className="flex flex-wrap gap-2"><input type="hidden" name="intentId" value={row.id}/><input name="reason" required minLength={5} maxLength={2000} aria-label="Причина возврата" placeholder="Причина полного возврата" className="stroy-input min-w-[240px] flex-1"/><button className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">Полный возврат</button></form>}{row.refund_status&&<span className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold">Возврат: {statusLabel(row.refund_status)}</span>}{row.payout_status&&<span className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold">Выплата: {statusLabel(row.payout_status)}</span>}</div></article>)}{projectsResult.rows.length===0&&<Empty text="Проектных финансовых операций пока нет."/>}</div></section>

    <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6"><h2 className="text-xl font-bold">Расчёты по материалам</h2><div className="mt-4 space-y-3">{materialsResult.rows.map(row=><article key={row.id} className="rounded-2xl border border-border bg-background p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-semibold text-primary">{row.project_title}</p><h3 className="mt-1 font-bold">{row.supplier_name_snapshot}</h3><p className="mt-2 text-sm text-muted-foreground">Заказ {money(row.goods_subtotal_minor)} · комиссия {money(row.platform_commission_minor)} · поставщику {money(row.supplier_net_minor)}</p></div><Status value={row.status}/></div>{row.status==="completed"&&!row.payout_status&&<form action={recordSupplierBankPayout} className="mt-4 grid gap-2 md:grid-cols-[220px_1fr_auto]"><input type="hidden" name="orderId" value={row.id}/><input name="bankReference" required minLength={3} maxLength={160} aria-label="Референс банковского перевода" placeholder="Референс банка" className="stroy-input"/><input name="note" maxLength={1000} aria-label="Комментарий к банковскому переводу" placeholder="Комментарий к расчёту" className="stroy-input"/><button className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">Зафиксировать перевод</button></form>}{row.payout_status&&<p className="mt-3 text-xs font-semibold text-muted-foreground">Расчёт: {statusLabel(row.payout_status)}</p>}</article>)}{materialsResult.rows.length===0&&<Empty text="Оплаченных заказов материалов пока нет."/>}</div></section>

    <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6"><h2 className="text-xl font-bold">Последние финансовые операции</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="pb-3">Операция</th><th className="pb-3">Источник</th><th className="pb-3">Сумма</th><th className="pb-3">Статус</th><th className="pb-3">Дата</th></tr></thead><tbody>{operationsResult.rows.map(row=><tr key={`${row.kind}-${row.id}`} className="border-t border-border"><td className="py-3 font-semibold">{row.kind==="refund"?"Возврат":"Выплата"}</td><td className="py-3">{row.source_type==="project_payment"?"Проект":"Материалы"}</td><td className="py-3">{money(row.amount_minor)}</td><td className="py-3"><Status value={row.status}/>{row.detail&&<p className="mt-1 max-w-xs text-xs text-muted-foreground">{row.detail}</p>}</td><td className="py-3 text-muted-foreground">{date(row.created_at)}</td></tr>)}</tbody></table>{operationsResult.rows.length===0&&<div className="pt-4"><Empty text="Операций возврата и выплаты пока нет."/></div>}</div></section>
  </div>;
}

function Metric({icon,label,value,hint}:{icon:React.ReactNode;label:string;value:string;hint:string}){return <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><div className="flex items-center gap-3 text-primary">{icon}<span className="text-xs font-semibold uppercase tracking-[0.08em]">{label}</span></div><p className="mt-4 text-2xl font-black">{value}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{hint}</p></div>}
function Status({value}:{value:string}){return <span className="inline-flex w-fit rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">{statusLabel(value)}</span>}
function Empty({text}:{text:string}){return <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</div>}
function money(value:string|number){return new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:2}).format(Number(value)/100)}
function moneyMajor(value:string|number){return new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:2}).format(Number(value))}
function date(value:Date|string){return new Intl.DateTimeFormat("ru-RU",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Moscow"}).format(new Date(value))}
function statusLabel(value:string){return({awaiting_payment:"Ожидает оплаты",funded:"Оплачено в сделку",stage_submitted:"Этап на проверке",release_ready:"Готово к выплате",payout_processing:"Выплата обрабатывается",paid:"Выплачено",disputed:"Спор",refunded:"Возвращено",paid_order:"Оплачено",supplier_confirmed:"Подтверждено поставщиком",delivery_pending:"Ожидает доставку",in_delivery:"В доставке",delivered:"Доставлено",completed:"Завершено",pending:"Ожидает",processing:"Обрабатывается",succeeded:"Успешно",failed:"Ошибка",cancelled:"Отменено",blocked:"Заблокировано"} as Record<string,string>)[value]??value}
function errorMessage(value:string){return({admin:"Денежные операции доступны только администратору.",provider:"YooKassa не настроена для production-операции.",refund_input:"Проверьте причину возврата.",refund_state:"Этот платёж нельзя вернуть в текущем состоянии.",refund_exists:"Для платежа уже есть активный возврат.",refund_prepare:"Не удалось подготовить возврат.",refund_provider:"Провайдер не подтвердил возврат.",payout_input:"Некорректная выплата.",payout_state:"Выплата доступна только для принятого этапа в release_ready.",payout_profile:"У подрядчика нет проверенного payout-token.",payout_refund:"Выплата заблокирована возвратом.",payout_prepare:"Не удалось подготовить выплату.",payout_provider:"Провайдер не подтвердил выплату.",supplier_input:"Укажите референс банковского перевода.",supplier_state:"Расчёт с поставщиком фиксируется только после завершения заказа.",supplier_exists:"Расчёт по этому заказу уже зафиксирован.",supplier_payout:"Не удалось зафиксировать банковский расчёт.",amount:"Некорректная сумма операции."} as Record<string,string>)[value]??"Финансовая операция не выполнена."}
