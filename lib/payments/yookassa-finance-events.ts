import "server-only";

import { db } from "@/lib/db/pool";

type Money={value:string;currency:string};
type YooRefund={
  id:string;
  status:string;
  amount:Money;
  payment_id?:string;
  metadata?:Record<string,string>;
};
type YooPayout={
  id:string;
  status:string;
  amount:Money;
  metadata?:Record<string,string>;
  deal?:{id?:string};
  cancellation_details?:{party?:string;reason?:string};
};

type RefundRow={
  id:string;
  source_type:"project_payment"|"material_order";
  project_payment_intent_id:string|null;
  material_order_id:string|null;
  status:string;
  amount_minor:string|number;
  currency:string;
  project_status:string|null;
  project_provider_payment_id:string|null;
  material_status:string|null;
  material_provider_payment_id:string|null;
};

type PayoutRow={
  id:string;
  project_payment_intent_id:string;
  status:string;
  amount_minor:string|number;
  currency:string;
  project_status:string;
  provider_deal_id:string|null;
};

function toMinor(money:Money){
  const value=Number(money.value);
  return Number.isFinite(value)?Math.round(value*100):NaN;
}

function safeProviderData(value:Record<string,unknown>){
  return JSON.stringify(value);
}

export async function processVerifiedYooKassaRefund(provider:YooRefund,providerRefundId:string):Promise<Response>{
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const result=await client.query<RefundRow>(`
      SELECT fr.id,fr.source_type,fr.project_payment_intent_id,fr.material_order_id,fr.status,fr.amount_minor,fr.currency,
             ppi.status AS project_status,ppi.provider_payment_id AS project_provider_payment_id,
             mo.status AS material_status,
             (SELECT mop.provider_payment_id FROM public.material_order_payments mop
               WHERE mop.order_id=mo.id AND mop.status IN ('succeeded','refunded')
               ORDER BY mop.created_at DESC LIMIT 1) AS material_provider_payment_id
      FROM public.finance_refunds fr
      LEFT JOIN public.project_payment_intents ppi ON ppi.id=fr.project_payment_intent_id
      LEFT JOIN public.material_orders mo ON mo.id=fr.material_order_id
      WHERE fr.provider='yookassa' AND fr.provider_refund_id=$1::text
      LIMIT 1
      FOR UPDATE OF fr
    `,[providerRefundId]);
    const local=result.rows[0];
    if(!local){
      await client.query("ROLLBACK");
      return Response.json({ok:true,ignored:"unknown_refund"});
    }

    const providerMinor=toMinor(provider.amount);
    if(!Number.isFinite(providerMinor)||providerMinor!==Number(local.amount_minor)||provider.amount.currency!==local.currency){
      await client.query("ROLLBACK");
      return Response.json({ok:false,error:"refund_amount_mismatch"},{status:409});
    }
    if(provider.metadata?.payment_intent_id&&provider.metadata.payment_intent_id!==local.project_payment_intent_id){
      await client.query("ROLLBACK");
      return Response.json({ok:false,error:"refund_metadata_mismatch"},{status:409});
    }
    const expectedPaymentId=local.source_type==="project_payment"?local.project_provider_payment_id:local.material_provider_payment_id;
    if(provider.payment_id&&expectedPaymentId&&provider.payment_id!==expectedPaymentId){
      await client.query("ROLLBACK");
      return Response.json({ok:false,error:"refund_payment_mismatch"},{status:409});
    }
    if(provider.status!=="succeeded"){
      await client.query("ROLLBACK");
      return Response.json({ok:true,ignored:"refund_not_succeeded"});
    }

    if(local.status==="succeeded"){
      await client.query("COMMIT");
      return Response.json({ok:true,idempotent:true,status:"refunded"});
    }
    if(local.status==="cancelled"){
      await client.query("ROLLBACK");
      return Response.json({ok:false,error:"refund_terminal_conflict"},{status:409});
    }

    await client.query(`
      UPDATE public.finance_refunds
      SET status='succeeded',provider_data=$2::jsonb,failure_reason=NULL,succeeded_at=COALESCE(succeeded_at,now()),updated_at=now()
      WHERE id=$1::uuid
    `,[local.id,safeProviderData({provider_status:provider.status,payment_id:provider.payment_id??null})]);

    if(local.source_type==="project_payment"&&local.project_payment_intent_id){
      if(local.project_status==="refunded"){
        await client.query("COMMIT");
        return Response.json({ok:true,idempotent:true,status:"refunded"});
      }
      if(!local.project_status||!["funded","stage_submitted","release_ready","disputed"].includes(local.project_status)){
        await client.query("ROLLBACK");
        return Response.json({ok:false,error:"refund_source_state_conflict"},{status:409});
      }
      await client.query("SET LOCAL stroyselect.payment_source='yookassa'");
      await client.query(`
        UPDATE public.project_payment_intents
        SET status='refunded',provider_refund_id=$2::text,refunded_at=COALESCE(refunded_at,now()),last_provider_event_at=now(),updated_at=now()
        WHERE id=$1::uuid
      `,[local.project_payment_intent_id,providerRefundId]);
      await client.query(`
        INSERT INTO public.finance_receipts(source_type,project_payment_intent_id,receipt_kind,amount_minor,currency,status,snapshot)
        VALUES('project_payment',$1::uuid,'refund',$2,$3::varchar,'configuration_required',$4::jsonb)
        ON CONFLICT(source_type,project_payment_intent_id,receipt_kind) WHERE project_payment_intent_id IS NOT NULL DO NOTHING
      `,[local.project_payment_intent_id,providerMinor,local.currency,safeProviderData({provider:"yookassa",provider_refund_id:providerRefundId,legal_note:"Чек возврата формируется после настройки 54-ФЗ/агентской модели"})]);
    }else if(local.source_type==="material_order"&&local.material_order_id){
      if(local.material_status!=="refunded"){
        if(!local.material_status||!["paid","supplier_confirmed"].includes(local.material_status)){
          await client.query("ROLLBACK");
          return Response.json({ok:false,error:"material_refund_state_conflict"},{status:409});
        }
        await client.query(`UPDATE public.material_order_payments SET status='refunded',updated_at=now() WHERE order_id=$1::uuid AND status='succeeded'`,[local.material_order_id]);
        await client.query(`UPDATE public.material_orders SET status='refunded',updated_at=now() WHERE id=$1::uuid`,[local.material_order_id]);
      }
      await client.query(`
        INSERT INTO public.finance_receipts(source_type,material_order_id,receipt_kind,amount_minor,currency,status,snapshot)
        VALUES('material_order',$1::uuid,'refund',$2,$3::varchar,'configuration_required',$4::jsonb)
        ON CONFLICT(source_type,material_order_id,receipt_kind) WHERE material_order_id IS NOT NULL DO NOTHING
      `,[local.material_order_id,providerMinor,local.currency,safeProviderData({provider:"yookassa",provider_refund_id:providerRefundId,legal_note:"Чек возврата формируется после настройки согласованной модели фискализации"})]);
    }

    await client.query("COMMIT");
    return Response.json({ok:true,status:"refunded"});
  }catch(error){
    await client.query("ROLLBACK");
    console.error("Ошибка обработки YooKassa refund webhook:",error);
    return Response.json({ok:false},{status:500});
  }finally{
    client.release();
  }
}

export async function processVerifiedYooKassaPayout(provider:YooPayout,providerPayoutId:string):Promise<Response>{
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const result=await client.query<PayoutRow>(`
      SELECT fp.id,fp.project_payment_intent_id,fp.status,fp.amount_minor,fp.currency,
             ppi.status AS project_status,ppi.provider_deal_id
      FROM public.finance_payouts fp
      JOIN public.project_payment_intents ppi ON ppi.id=fp.project_payment_intent_id
      WHERE fp.provider='yookassa' AND fp.source_type='project_payment' AND fp.provider_payout_id=$1::text
      LIMIT 1
      FOR UPDATE OF fp,ppi
    `,[providerPayoutId]);
    const local=result.rows[0];
    if(!local){
      await client.query("ROLLBACK");
      return Response.json({ok:true,ignored:"unknown_payout"});
    }

    const providerMinor=toMinor(provider.amount);
    if(!Number.isFinite(providerMinor)||providerMinor!==Number(local.amount_minor)||provider.amount.currency!==local.currency){
      await client.query("ROLLBACK");
      return Response.json({ok:false,error:"payout_amount_mismatch"},{status:409});
    }
    if(provider.metadata?.payment_intent_id&&provider.metadata.payment_intent_id!==local.project_payment_intent_id){
      await client.query("ROLLBACK");
      return Response.json({ok:false,error:"payout_metadata_mismatch"},{status:409});
    }
    if(provider.deal?.id&&local.provider_deal_id&&provider.deal.id!==local.provider_deal_id){
      await client.query("ROLLBACK");
      return Response.json({ok:false,error:"payout_deal_mismatch"},{status:409});
    }

    if(provider.status==="succeeded"){
      if(local.status==="succeeded"&&local.project_status==="paid"){
        await client.query("COMMIT");
        return Response.json({ok:true,idempotent:true,status:"paid"});
      }
      if(local.status==="cancelled"){
        await client.query("ROLLBACK");
        return Response.json({ok:false,error:"payout_terminal_conflict"},{status:409});
      }
      if(!["payout_processing","release_ready","paid"].includes(local.project_status)){
        await client.query("ROLLBACK");
        return Response.json({ok:false,error:"payout_source_state_conflict"},{status:409});
      }
      await client.query(`
        UPDATE public.finance_payouts
        SET status='succeeded',provider_data=$2::jsonb,failure_reason=NULL,blocked_reason=NULL,succeeded_at=COALESCE(succeeded_at,now()),updated_at=now()
        WHERE id=$1::uuid
      `,[local.id,safeProviderData({provider_status:provider.status,deal_id:provider.deal?.id??null})]);
      if(local.project_status!=="paid"){
        await client.query("SET LOCAL stroyselect.payment_source='yookassa'");
        await client.query(`
          UPDATE public.project_payment_intents
          SET status='paid',provider_payout_id=$2::text,paid_at=COALESCE(paid_at,now()),last_provider_event_at=now(),updated_at=now()
          WHERE id=$1::uuid
        `,[local.project_payment_intent_id,providerPayoutId]);
      }
      await client.query(`UPDATE public.payment_release_failures SET resolved_at=now() WHERE payment_intent_id=$1::uuid AND resolved_at IS NULL`,[local.project_payment_intent_id]);
      await client.query("COMMIT");
      return Response.json({ok:true,status:"paid"});
    }

    if(provider.status==="canceled"){
      if(local.status==="succeeded"||local.project_status==="paid"){
        await client.query("ROLLBACK");
        return Response.json({ok:false,error:"payout_terminal_conflict"},{status:409});
      }
      const reason=provider.cancellation_details?.reason??"Выплата отменена провайдером";
      if(local.status!=="cancelled"){
        await client.query(`
          UPDATE public.finance_payouts
          SET status='cancelled',provider_data=$2::jsonb,failure_reason=$3,updated_at=now()
          WHERE id=$1::uuid
        `,[local.id,safeProviderData({provider_status:provider.status,cancellation_details:provider.cancellation_details??null}),reason]);
      }
      if(local.project_status==="payout_processing"){
        await client.query("SET LOCAL stroyselect.payment_source='yookassa'");
        await client.query(`UPDATE public.project_payment_intents SET status='release_ready',last_provider_event_at=now(),updated_at=now() WHERE id=$1::uuid`,[local.project_payment_intent_id]);
      }
      await client.query(`
        INSERT INTO public.payment_release_failures(payment_intent_id,reason,metadata)
        SELECT $1::uuid,$2,$3::jsonb
        WHERE NOT EXISTS(
          SELECT 1 FROM public.payment_release_failures
          WHERE payment_intent_id=$1::uuid AND resolved_at IS NULL AND metadata->>'provider_payout_id'=$4::text
        )
      `,[local.project_payment_intent_id,reason,safeProviderData({provider_payout_id:providerPayoutId,provider_status:provider.status}),providerPayoutId]);
      await client.query("COMMIT");
      return Response.json({ok:true,status:"release_ready"});
    }

    await client.query("COMMIT");
    return Response.json({ok:true,ignored:"payout_not_terminal"});
  }catch(error){
    await client.query("ROLLBACK");
    console.error("Ошибка обработки YooKassa payout webhook:",error);
    return Response.json({ok:false},{status:500});
  }finally{
    client.release();
  }
}
