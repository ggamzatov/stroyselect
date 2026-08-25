import "server-only";

import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";
import { isYooKassaConfigured } from "@/lib/payments/yookassa";

type ProjectRow = {
  id: string; title: string; status: string; customer_id: string;
  selected_contractor_id: string | null; selected_bid_id: string | null;
  contractor_owner_id: string | null; selected_bid_price: string | number | null;
  selected_bid_duration_days: number | null;
};
type ChangeRow = { id:string; requested_by:string; title:string; reason:string; scope_change:string; amount_delta:string|number; duration_delta_days:number; status:string; decision_comment:string|null; decided_by:string|null; decided_at:Date|string|null; created_at:Date|string; updated_at:Date|string };
type PaymentRow = { id:string; recorded_by:string; stage_id:string|null; amount:string|number; paid_at:Date|string; note:string|null; created_at:Date|string; confirmation_status:string|null; customer_confirmed_at:Date|string|null; contractor_confirmed_at:Date|string|null; disputed_at:Date|string|null; dispute_reason:string|null; cancellation_reason:string|null };
type StageRow = { id:string; title:string; price:string|number|null; progress_weight:number; sort_order:number; status:string; payment_due_percent:string|number|null; payment_due_amount:string|number|null };
type IntentRow={id:string;stage_id:string|null;amount:string|number;status:string;provider:string;provider_status:string|null;confirmation_url:string|null;funded_at:Date|string|null;release_ready_at:Date|string|null;paid_at:Date|string|null;refunded_at:Date|string|null;failure_reason:string|null};
type BudgetControlRole = "customer" | "contractor";

const FUNDED_STATUSES=new Set(["funded","stage_submitted","release_ready","payout_processing","paid"]);

export async function getProjectBudgetControl(projectId: string) {
  const userId = await getCurrentSessionUserId();
  if (!userId) redirect("/login");

  const projectResult = await db.query<ProjectRow>(`
    SELECT p.id,p.title,p.status,p.customer_id,p.selected_contractor_id,p.selected_bid_id,
           cc.owner_id AS contractor_owner_id,pb.price AS selected_bid_price,
           pb.duration_days AS selected_bid_duration_days
    FROM public.projects p
    LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id
    LEFT JOIN public.project_bids pb ON pb.id=p.selected_bid_id
    WHERE p.id=$1 LIMIT 1
  `,[projectId]);
  const project=projectResult.rows[0];
  if(!project) notFound();
  const role:BudgetControlRole|null=project.customer_id===userId?"customer":project.contractor_owner_id===userId?"contractor":null;
  if(!role||!project.selected_contractor_id) notFound();

  const [changesResult,paymentsResult,stagesResult,intentsResult]=await Promise.all([
    db.query<ChangeRow>(`SELECT id,requested_by,title,reason,scope_change,amount_delta,duration_delta_days,status,decision_comment,decided_by,decided_at,created_at,updated_at FROM public.project_change_orders WHERE project_id=$1 ORDER BY created_at DESC`,[projectId]),
    db.query<PaymentRow>(`
      SELECT pp.id,pp.recorded_by,pp.stage_id,pp.amount,pp.paid_at,pp.note,pp.created_at,
             ppc.status AS confirmation_status,ppc.customer_confirmed_at,ppc.contractor_confirmed_at,
             ppc.disputed_at,ppc.dispute_reason,ppc.cancellation_reason
      FROM public.project_payments pp
      LEFT JOIN public.project_payment_confirmations ppc ON ppc.payment_id=pp.id
      WHERE pp.project_id=$1
      ORDER BY pp.paid_at DESC,pp.created_at DESC
    `,[projectId]),
    db.query<StageRow>(`SELECT id,title,price,progress_weight,sort_order,status,payment_due_percent,payment_due_amount FROM public.project_stages WHERE project_id=$1 ORDER BY sort_order ASC,created_at ASC`,[projectId]),
    db.query<IntentRow>(`SELECT id,stage_id,amount,status,provider,provider_status,confirmation_url,funded_at,release_ready_at,paid_at,refunded_at,failure_reason FROM public.project_payment_intents WHERE project_id=$1 ORDER BY created_at DESC`,[projectId]),
  ]);

  const originalContract=toNumber(project.selected_bid_price);
  const approvedDelta=changesResult.rows.filter(i=>i.status==="approved").reduce((s,i)=>s+toNumber(i.amount_delta),0);
  const approvedDurationDelta=changesResult.rows.filter(i=>i.status==="approved").reduce((s,i)=>s+(Number(i.duration_delta_days)||0),0);
  const currentContract=originalContract+approvedDelta;
  const confirmedPayments=paymentsResult.rows.filter(i=>i.confirmation_status==="confirmed");
  const providerFunded=intentsResult.rows.filter(i=>FUNDED_STATUSES.has(i.status));
  const paidTotal=confirmedPayments.reduce((s,i)=>s+toNumber(i.amount),0)+providerFunded.reduce((s,i)=>s+toNumber(i.amount),0);

  const paymentsByStage=new Map<string,number>();
  for(const payment of confirmedPayments){if(payment.stage_id) paymentsByStage.set(payment.stage_id,(paymentsByStage.get(payment.stage_id)??0)+toNumber(payment.amount));}
  for(const intent of providerFunded){if(intent.stage_id)paymentsByStage.set(intent.stage_id,(paymentsByStage.get(intent.stage_id)??0)+toNumber(intent.amount));}
  const intentByStage=new Map(intentsResult.rows.filter(i=>i.stage_id).map(i=>[i.stage_id as string,i]));

  const stages=stagesResult.rows.map(stage=>{
    const explicitAmount=stage.payment_due_amount===null?null:toNumber(stage.payment_due_amount);
    const percent=stage.payment_due_percent===null?null:toNumber(stage.payment_due_percent);
    const plannedAmount=explicitAmount??(percent!==null?currentContract*percent/100:toNumber(stage.price));
    const paidAmount=paymentsByStage.get(stage.id)??0;
    const intent=intentByStage.get(stage.id);
    return {id:stage.id,title:stage.title,status:stage.status,sortOrder:stage.sort_order,progressWeight:stage.progress_weight,stagePrice:toNumber(stage.price),paymentDuePercent:percent,paymentDueAmount:explicitAmount,plannedAmount,paidAmount,remainingAmount:Math.max(0,plannedAmount-paidAmount),paymentProgress:plannedAmount>0?Math.min(100,Math.round(paidAmount/plannedAmount*100)):0,paymentIntent:intent?{id:intent.id,amount:toNumber(intent.amount),status:intent.status,provider:intent.provider,providerStatus:intent.provider_status,confirmationUrl:intent.confirmation_url,fundedAt:toNullableIso(intent.funded_at),releaseReadyAt:toNullableIso(intent.release_ready_at),paidAt:toNullableIso(intent.paid_at),refundedAt:toNullableIso(intent.refunded_at),failureReason:intent.failure_reason}:null};
  });

  return {
    role,
    paymentsEnabled:String(process.env.PAYMENTS_ENABLED??"false").toLowerCase()==="true"&&isYooKassaConfigured(),
    project:{id:project.id,title:project.title,status:project.status,originalContract,approvedDelta,currentContract,paidTotal,remaining:Math.max(0,currentContract-paidTotal),originalDurationDays:project.selected_bid_duration_days??0,currentDurationDays:(project.selected_bid_duration_days??0)+approvedDurationDelta},
    stages,
    paymentIntents:intentsResult.rows.map(i=>({id:i.id,stageId:i.stage_id,amount:toNumber(i.amount),status:i.status,provider:i.provider,providerStatus:i.provider_status,confirmationUrl:i.confirmation_url,fundedAt:toNullableIso(i.funded_at),releaseReadyAt:toNullableIso(i.release_ready_at),paidAt:toNullableIso(i.paid_at),refundedAt:toNullableIso(i.refunded_at),failureReason:i.failure_reason})),
    changes:changesResult.rows.map(row=>({id:row.id,requestedBy:row.requested_by,requestedByCurrentUser:row.requested_by===userId,title:row.title,reason:row.reason,scopeChange:row.scope_change,amountDelta:toNumber(row.amount_delta),durationDeltaDays:Number(row.duration_delta_days)||0,status:row.status,decisionComment:row.decision_comment,decidedBy:row.decided_by,decidedAt:toNullableIso(row.decided_at),createdAt:toIso(row.created_at),updatedAt:toIso(row.updated_at)})),
    payments:paymentsResult.rows.map(row=>({
      id:row.id,recordedBy:row.recorded_by,stageId:row.stage_id,amount:toNumber(row.amount),paidAt:toDateString(row.paid_at),note:row.note,createdAt:toIso(row.created_at),
      confirmationStatus:row.confirmation_status??"pending",
      customerConfirmedAt:toNullableIso(row.customer_confirmed_at),
      contractorConfirmedAt:toNullableIso(row.contractor_confirmed_at),
      disputedAt:toNullableIso(row.disputed_at),
      disputeReason:row.dispute_reason,
      cancellationReason:row.cancellation_reason,
      currentUserConfirmed:role==="customer"?Boolean(row.customer_confirmed_at):Boolean(row.contractor_confirmed_at),
    })),
  };
}
function toNumber(value:unknown){const n=Number(value??0);return Number.isFinite(n)?n:0}
function toIso(value:Date|string){return value instanceof Date?value.toISOString():String(value)}
function toNullableIso(value:Date|string|null){return value?toIso(value):null}
function toDateString(value:Date|string){return value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10)}