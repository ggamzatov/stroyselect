"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { requireStaffUser } from "@/lib/auth/require-staff-user";
import { db } from "@/lib/db/pool";
import { createPaymentRefund, createSafeDealPayout, isYooKassaConfigured } from "@/lib/payments/yookassa";

type ProjectFinanceRow={
  id:string;project_id:string;stage_id:string|null;status:string;amount:string|number;currency:string;
  payout_amount:string|number|null;platform_fee_amount:string|number|null;provider_payment_id:string|null;provider_deal_id:string|null;
  selected_contractor_id:string|null;project_title:string;stage_title:string|null;payout_token:string|null;payout_verified_at:Date|string|null;payout_disabled_at:Date|string|null;
};
type MaterialFinanceRow={id:string;status:string;supplier_id:string;supplier_net_minor:string|number;currency:string;supplier_name_snapshot:string;supplier_legal_name_snapshot:string|null;supplier_inn_snapshot:string|null};

function clean(value:FormDataEntryValue|null){return String(value??"").trim();}
function validUuid(value:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}

async function requireFinanceAdmin(){
  const staff=await requireStaffUser();
  if(staff.profile.role!=="admin")redirect("/admin/finance?error=admin");
  return staff.user;
}

export async function refundProjectPayment(formData:FormData):Promise<never>{
  const user=await requireFinanceAdmin();
  const intentId=clean(formData.get("intentId"));
  const reason=clean(formData.get("reason")).slice(0,2000);
  if(!validUuid(intentId)||reason.length<5)redirect("/admin/finance?error=refund_input");
  if(!isYooKassaConfigured())redirect("/admin/finance?error=provider");

  const client=await db.connect();
  let refundId="";
  let idempotencyKey="";
  let paymentId="";
  let amount=0;
  let projectTitle="";
  try{
    await client.query("BEGIN");
    const result=await client.query<ProjectFinanceRow>(`
      SELECT ppi.id,ppi.project_id,ppi.stage_id,ppi.status,ppi.amount,ppi.currency,ppi.payout_amount,ppi.platform_fee_amount,
             ppi.provider_payment_id,ppi.provider_deal_id,p.selected_contractor_id,p.title AS project_title,ps.title AS stage_title,
             cpp.payout_token,cpp.verified_at AS payout_verified_at,cpp.disabled_at AS payout_disabled_at
      FROM public.project_payment_intents ppi
      JOIN public.projects p ON p.id=ppi.project_id
      LEFT JOIN public.project_stages ps ON ps.id=ppi.stage_id
      LEFT JOIN public.contractor_payout_profiles cpp ON cpp.contractor_id=p.selected_contractor_id
      WHERE ppi.id=$1::uuid
      LIMIT 1 FOR UPDATE OF ppi
    `,[intentId]);
    const row=result.rows[0];
    if(!row||!["funded","stage_submitted","release_ready","disputed"].includes(row.status)||!row.provider_payment_id){await client.query("ROLLBACK");redirect("/admin/finance?error=refund_state");}
    const active=await client.query(`SELECT 1 FROM public.finance_refunds WHERE project_payment_intent_id=$1::uuid AND status IN ('pending','succeeded') LIMIT 1`,[intentId]);
    if(active.rowCount){await client.query("ROLLBACK");redirect("/admin/finance?error=refund_exists");}

    amount=Number(row.amount);
    if(!Number.isFinite(amount)||amount<=0){await client.query("ROLLBACK");redirect("/admin/finance?error=amount");}
    paymentId=row.provider_payment_id;
    projectTitle=row.project_title;
    refundId=randomUUID();
    idempotencyKey=randomUUID();
    await client.query(`
      INSERT INTO public.finance_refunds(id,source_type,project_payment_intent_id,provider,idempotency_key,status,amount_minor,currency,reason,requested_by)
      VALUES($1::uuid,'project_payment',$2::uuid,'yookassa',$3::uuid,'pending',$4,'RUB',$5,$6::uuid)
    `,[refundId,intentId,idempotencyKey,Math.round(amount*100),reason,user.id]);
    await client.query("COMMIT");
  }catch(error){
    if(isRedirect(error))throw error;
    await client.query("ROLLBACK");
    console.error("Ошибка подготовки возврата проектного платежа:",error);
    redirect("/admin/finance?error=refund_prepare");
  }finally{client.release();}

  try{
    const refund=await createPaymentRefund({paymentIntentId:intentId,paymentId,amount,description:`Возврат по проекту «${projectTitle}»`,idempotenceKey:idempotencyKey});
    const next=refund.status==="succeeded"?"succeeded":refund.status==="canceled"?"cancelled":"pending";
    const finish=await db.connect();
    try{
      await finish.query("BEGIN");
      await finish.query(`UPDATE public.finance_refunds SET provider_refund_id=$2,status=$3::varchar,provider_data=$4::jsonb,failure_reason=CASE WHEN $3::varchar='cancelled' THEN 'Возврат отменён провайдером' ELSE NULL END,updated_at=now() WHERE id=$1::uuid`,[refundId,refund.id,next,JSON.stringify({provider_status:refund.status})]);
      if(next==="succeeded"){
        await finish.query("SET LOCAL stroyselect.payment_source='admin'");
        await finish.query(`UPDATE public.project_payment_intents SET status='refunded',provider_refund_id=$2,refunded_at=COALESCE(refunded_at,now()),updated_at=now() WHERE id=$1::uuid AND status IN ('funded','stage_submitted','release_ready','disputed')`,[intentId,refund.id]);
        await finish.query(`INSERT INTO public.finance_receipts(source_type,project_payment_intent_id,receipt_kind,amount_minor,currency,status,snapshot) VALUES('project_payment',$1::uuid,'refund',$2,'RUB','configuration_required',$3::jsonb) ON CONFLICT(source_type,project_payment_intent_id,receipt_kind) WHERE project_payment_intent_id IS NOT NULL DO NOTHING`,[intentId,Math.round(amount*100),JSON.stringify({provider:"yookassa",provider_refund_id:refund.id,legal_note:"Чек возврата формируется после настройки 54-ФЗ/агентской модели"})]);
      }
      await finish.query("COMMIT");
    }catch(error){await finish.query("ROLLBACK");throw error;}finally{finish.release();}
  }catch(error){
    console.error("Ошибка YooKassa при возврате проектного платежа:",error);
    await db.query(`UPDATE public.finance_refunds SET status='failed',failure_reason=$2,updated_at=now() WHERE id=$1::uuid AND status='pending'`,[refundId,error instanceof Error?error.message:"Ошибка провайдера"]);
    redirect("/admin/finance?error=refund_provider");
  }
  redirect("/admin/finance?refunded=1");
}

export async function releaseProjectPayout(formData:FormData):Promise<never>{
  const user=await requireFinanceAdmin();
  const intentId=clean(formData.get("intentId"));
  if(!validUuid(intentId))redirect("/admin/finance?error=payout_input");
  if(!isYooKassaConfigured())redirect("/admin/finance?error=provider");

  const client=await db.connect();
  let payoutId="";
  let idempotencyKey="";
  let dealId="";
  let payoutToken="";
  let amount=0;
  let projectTitle="";
  try{
    await client.query("BEGIN");
    const result=await client.query<ProjectFinanceRow>(`
      SELECT ppi.id,ppi.project_id,ppi.stage_id,ppi.status,ppi.amount,ppi.currency,ppi.payout_amount,ppi.platform_fee_amount,
             ppi.provider_payment_id,ppi.provider_deal_id,p.selected_contractor_id,p.title AS project_title,ps.title AS stage_title,
             cpp.payout_token,cpp.verified_at AS payout_verified_at,cpp.disabled_at AS payout_disabled_at
      FROM public.project_payment_intents ppi
      JOIN public.projects p ON p.id=ppi.project_id
      LEFT JOIN public.project_stages ps ON ps.id=ppi.stage_id
      LEFT JOIN public.contractor_payout_profiles cpp ON cpp.contractor_id=p.selected_contractor_id
      WHERE ppi.id=$1::uuid
      LIMIT 1 FOR UPDATE OF ppi
    `,[intentId]);
    const row=result.rows[0];
    if(!row||row.status!=="release_ready"||!row.selected_contractor_id||!row.provider_deal_id){await client.query("ROLLBACK");redirect("/admin/finance?error=payout_state");}
    if(!row.payout_token||!row.payout_verified_at||row.payout_disabled_at){await client.query("ROLLBACK");redirect("/admin/finance?error=payout_profile");}
    const blocked=await client.query(`SELECT 1 FROM public.finance_refunds WHERE project_payment_intent_id=$1::uuid AND status IN ('pending','succeeded') LIMIT 1`,[intentId]);
    if(blocked.rowCount){await client.query("ROLLBACK");redirect("/admin/finance?error=payout_refund");}

    amount=Number(row.payout_amount??row.amount);
    if(!Number.isFinite(amount)||amount<=0){await client.query("ROLLBACK");redirect("/admin/finance?error=amount");}
    dealId=row.provider_deal_id;
    payoutToken=row.payout_token;
    projectTitle=row.project_title;
    payoutId=randomUUID();
    idempotencyKey=randomUUID();
    await client.query(`
      INSERT INTO public.finance_payouts(id,source_type,project_payment_intent_id,beneficiary_type,contractor_id,provider,idempotency_key,status,amount_minor,currency,destination_snapshot,created_by)
      VALUES($1::uuid,'project_payment',$2::uuid,'contractor',$3::uuid,'yookassa',$4::uuid,'processing',$5,'RUB',$6::jsonb,$7::uuid)
    `,[payoutId,intentId,row.selected_contractor_id,idempotencyKey,Math.round(amount*100),JSON.stringify({destination_label:"YooKassa payout token",verified_at:row.payout_verified_at}),user.id]);
    await client.query("SET LOCAL stroyselect.payment_source='admin'");
    await client.query(`UPDATE public.project_payment_intents SET status='payout_processing',updated_at=now() WHERE id=$1::uuid AND status='release_ready'`,[intentId]);
    await client.query("COMMIT");
  }catch(error){
    if(isRedirect(error))throw error;
    await client.query("ROLLBACK");
    console.error("Ошибка подготовки выплаты подрядчику:",error);
    redirect("/admin/finance?error=payout_prepare");
  }finally{client.release();}

  try{
    const payout=await createSafeDealPayout({paymentIntentId:intentId,dealId,amount,payoutToken,description:`Выплата по проекту «${projectTitle}»`,idempotenceKey:idempotencyKey});
    const next=payout.status==="succeeded"?"succeeded":payout.status==="canceled"?"failed":"processing";
    const finish=await db.connect();
    try{
      await finish.query("BEGIN");
      await finish.query(`UPDATE public.finance_payouts SET provider_payout_id=$2,status=$3::varchar,provider_data=$4::jsonb,failure_reason=CASE WHEN $3::varchar='failed' THEN $5 ELSE NULL END,updated_at=now() WHERE id=$1::uuid`,[payoutId,payout.id,next,JSON.stringify({provider_status:payout.status}),payout.cancellation_details?.reason??"Выплата отменена провайдером"]);
      await finish.query("SET LOCAL stroyselect.payment_source='admin'");
      if(next==="succeeded"){
        await finish.query(`UPDATE public.project_payment_intents SET status='paid',provider_payout_id=$2,paid_at=COALESCE(paid_at,now()),updated_at=now() WHERE id=$1::uuid AND status='payout_processing'`,[intentId,payout.id]);
      }else if(next==="failed"){
        await finish.query(`UPDATE public.project_payment_intents SET status='release_ready',updated_at=now() WHERE id=$1::uuid AND status='payout_processing'`,[intentId]);
        await finish.query(`INSERT INTO public.payment_release_failures(payment_intent_id,reason,metadata) VALUES($1::uuid,$2,$3::jsonb)`,[intentId,payout.cancellation_details?.reason??"Выплата отменена провайдером",JSON.stringify({provider_payout_id:payout.id})]);
      }else{
        await finish.query(`UPDATE public.project_payment_intents SET provider_payout_id=$2,updated_at=now() WHERE id=$1::uuid AND status='payout_processing'`,[intentId,payout.id]);
      }
      await finish.query("COMMIT");
    }catch(error){await finish.query("ROLLBACK");throw error;}finally{finish.release();}
  }catch(error){
    console.error("Ошибка YooKassa при выплате подрядчику:",error);
    const failure=error instanceof Error?error.message:"Ошибка провайдера";
    const restore=await db.connect();
    try{
      await restore.query("BEGIN");
      await restore.query(`UPDATE public.finance_payouts SET status='failed',failure_reason=$2,updated_at=now() WHERE id=$1::uuid AND status='processing'`,[payoutId,failure]);
      await restore.query("SET LOCAL stroyselect.payment_source='admin'");
      await restore.query(`UPDATE public.project_payment_intents SET status='release_ready',updated_at=now() WHERE id=$1::uuid AND status='payout_processing'`,[intentId]);
      await restore.query(`INSERT INTO public.payment_release_failures(payment_intent_id,reason,metadata) VALUES($1::uuid,$2,'{}'::jsonb)`,[intentId,failure]);
      await restore.query("COMMIT");
    }catch(restoreError){await restore.query("ROLLBACK");console.error("Ошибка восстановления payout state:",restoreError);}finally{restore.release();}
    redirect("/admin/finance?error=payout_provider");
  }
  redirect("/admin/finance?payout=1");
}

export async function recordSupplierBankPayout(formData:FormData):Promise<never>{
  const user=await requireFinanceAdmin();
  const orderId=clean(formData.get("orderId"));
  const bankReference=clean(formData.get("bankReference")).slice(0,160);
  const note=clean(formData.get("note")).slice(0,1000);
  if(!validUuid(orderId)||bankReference.length<3)redirect("/admin/finance?error=supplier_input");

  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const result=await client.query<MaterialFinanceRow>(`
      SELECT id,status,supplier_id,supplier_net_minor,currency,supplier_name_snapshot,supplier_legal_name_snapshot,supplier_inn_snapshot
      FROM public.material_orders WHERE id=$1::uuid LIMIT 1 FOR UPDATE
    `,[orderId]);
    const row=result.rows[0];
    if(!row||row.status!=="completed"){await client.query("ROLLBACK");redirect("/admin/finance?error=supplier_state");}
    const existing=await client.query(`SELECT 1 FROM public.finance_payouts WHERE material_order_id=$1::uuid AND status IN ('ready','processing','succeeded') LIMIT 1`,[orderId]);
    if(existing.rowCount){await client.query("ROLLBACK");redirect("/admin/finance?error=supplier_exists");}
    await client.query(`
      INSERT INTO public.finance_payouts(source_type,material_order_id,beneficiary_type,supplier_id,provider,provider_payout_id,idempotency_key,status,amount_minor,currency,destination_snapshot,provider_data,created_by,succeeded_at)
      VALUES('material_order',$1::uuid,'supplier',$2::uuid,'bank_manual',$3,$4::uuid,'succeeded',$5,$6::varchar,$7::jsonb,$8::jsonb,$9::uuid,now())
    `,[orderId,row.supplier_id,`bank:${bankReference}`,randomUUID(),Number(row.supplier_net_minor),row.currency,JSON.stringify({supplier_name:row.supplier_name_snapshot,legal_name:row.supplier_legal_name_snapshot,inn:row.supplier_inn_snapshot}),JSON.stringify({bank_reference:bankReference,note:note||null,recorded_after_external_transfer:true}),user.id]);
    await client.query("COMMIT");
  }catch(error){
    if(isRedirect(error))throw error;
    await client.query("ROLLBACK");
    console.error("Ошибка фиксации банковской выплаты поставщику:",error);
    redirect("/admin/finance?error=supplier_payout");
  }finally{client.release();}
  redirect("/admin/finance?supplier_payout=1");
}

function isRedirect(error:unknown){return typeof error==="object"&&error!==null&&"digest" in error&&String((error as {digest?:unknown}).digest).startsWith("NEXT_REDIRECT");}
