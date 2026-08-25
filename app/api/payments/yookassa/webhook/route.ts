import { NextResponse } from "next/server";

import { db } from "@/lib/db/pool";
import { getYooKassaObject, isYooKassaConfigured } from "@/lib/payments/yookassa";

type WebhookBody={event?:string;object?:{id?:string}};
type YooPayment={id:string;status:string;paid?:boolean;amount:{value:string;currency:string};metadata?:Record<string,string>;payment_method?:{id?:string;saved?:boolean}};
type SubscriptionPayment={id:string;contractor_id:string;plan_id:string|null;status:string;amount_minor:string|number;currency:string;duration_months_snapshot:number;auto_renew_requested:boolean};
type MaterialPayment={id:string;order_id:string;status:string;amount_minor:string|number;currency:string;order_status:string};
type AdPayment={id:string;order_id:string;status:string;amount_minor:string|number;currency:string;order_status:string};
type ProjectPayment={id:string;project_id:string;stage_id:string|null;status:string;amount:string|number;currency:string;provider_payment_id:string|null;provider_deal_id:string|null;payout_amount:string|number|null;platform_fee_amount:string|number|null;stage_status:string|null};

export async function POST(request:Request){
  if(!isYooKassaConfigured())return NextResponse.json({ok:false,error:"provider_not_configured"},{status:503});

  let incoming:WebhookBody;
  try{incoming=await request.json() as WebhookBody;}catch{return NextResponse.json({ok:false},{status:400});}
  const providerPaymentId=incoming.object?.id;
  if(!providerPaymentId)return NextResponse.json({ok:false},{status:400});

  let provider:YooPayment;
  try{
    const loaded=await getYooKassaObject("payment",providerPaymentId);
    if(!loaded.id||typeof loaded.status!=="string"||!loaded.amount||typeof loaded.amount!=="object")return NextResponse.json({ok:false,error:"provider_payload"},{status:502});
    provider=loaded as unknown as YooPayment;
  }catch(error){
    console.error("Не удалось проверить YooKassa webhook",{providerPaymentId,error:error instanceof Error?error.message:"provider_error"});
    return NextResponse.json({ok:false},{status:502});
  }

  if(provider.metadata?.payment_scope==="project_stage"||provider.metadata?.payment_intent_id){
    return processProjectPayment(provider,providerPaymentId);
  }
  if(provider.metadata?.payment_scope==="ad_order"||provider.metadata?.local_ad_payment_id){
    return processAdPayment(provider,providerPaymentId);
  }
  if(provider.metadata?.payment_scope==="material_order"||provider.metadata?.local_material_payment_id){
    return processMaterialPayment(provider,providerPaymentId);
  }
  return processSubscriptionPayment(provider,providerPaymentId);
}

async function processProjectPayment(provider:YooPayment,providerPaymentId:string){
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const localResult=await client.query<ProjectPayment>(`
      SELECT ppi.id,ppi.project_id,ppi.stage_id,ppi.status,ppi.amount,ppi.currency,
             ppi.provider_payment_id,ppi.provider_deal_id,ppi.payout_amount,ppi.platform_fee_amount,
             ps.status::text AS stage_status
      FROM public.project_payment_intents ppi
      LEFT JOIN public.project_stages ps ON ps.id=ppi.stage_id AND ps.project_id=ppi.project_id
      WHERE ppi.provider_payment_id=$1::text
      LIMIT 1
      FOR UPDATE OF ppi
    `,[providerPaymentId]);
    const local=localResult.rows[0];
    if(!local){await client.query("ROLLBACK");return NextResponse.json({ok:true,ignored:"unknown_project_payment"});}

    if(provider.metadata?.payment_intent_id&&provider.metadata.payment_intent_id!==local.id){await client.query("ROLLBACK");return NextResponse.json({ok:false,error:"metadata_mismatch"},{status:409});}
    if(provider.metadata?.project_id&&provider.metadata.project_id!==local.project_id){await client.query("ROLLBACK");return NextResponse.json({ok:false,error:"project_mismatch"},{status:409});}
    if(provider.metadata?.stage_id&&provider.metadata.stage_id!==local.stage_id){await client.query("ROLLBACK");return NextResponse.json({ok:false,error:"stage_mismatch"},{status:409});}

    const providerMinor=Math.round(Number(provider.amount.value)*100);
    const localMinor=Math.round(Number(local.amount)*100);
    if(!Number.isFinite(providerMinor)||providerMinor!==localMinor||provider.amount.currency!==local.currency.trim()){
      await client.query("ROLLBACK");
      console.error("Несовпадение суммы escrow-платежа",{providerPaymentId,providerMinor,localMinor});
      return NextResponse.json({ok:false,error:"amount_mismatch"},{status:409});
    }

    await client.query("SET LOCAL stroyselect.payment_source='yookassa'");
    if(provider.status==="canceled"){
      if(["planned","awaiting_payment"].includes(local.status)){
        await client.query(`UPDATE public.project_payment_intents SET status='cancelled',provider_status='canceled',failure_reason='Платёж отменён провайдером',last_provider_event_at=now(),updated_at=now() WHERE id=$1::uuid`,[local.id]);
      }
      await client.query("COMMIT");
      return NextResponse.json({ok:true});
    }
    if(provider.status!=="succeeded"||provider.paid===false){
      await client.query(`UPDATE public.project_payment_intents SET provider_status=$2::text,last_provider_event_at=now(),updated_at=now() WHERE id=$1::uuid`,[local.id,provider.status]);
      await client.query("COMMIT");
      return NextResponse.json({ok:true,ignored:"not_succeeded"});
    }

    if(["funded","stage_submitted","release_ready","payout_processing","paid","refunded"].includes(local.status)){
      await client.query(`UPDATE public.project_payment_intents SET provider_status='succeeded',last_provider_event_at=now(),updated_at=now() WHERE id=$1::uuid`,[local.id]);
      await client.query("COMMIT");
      return NextResponse.json({ok:true,idempotent:true});
    }
    if(local.status!=="awaiting_payment"){
      await client.query("ROLLBACK");
      return NextResponse.json({ok:false,error:"payment_state_mismatch"},{status:409});
    }

    const targetStatus=local.stage_status==="completed"?"release_ready":"funded";
    await client.query(`
      UPDATE public.project_payment_intents
      SET status=$2::text,provider_status='succeeded',funded_at=COALESCE(funded_at,now()),
          release_ready_at=CASE WHEN $2::text='release_ready' THEN COALESCE(release_ready_at,now()) ELSE release_ready_at END,
          failure_reason=NULL,last_provider_event_at=now(),updated_at=now()
      WHERE id=$1::uuid
    `,[local.id,targetStatus]);
    await client.query(`
      INSERT INTO public.finance_receipts(
        source_type,project_payment_intent_id,receipt_kind,amount_minor,currency,status,snapshot
      ) VALUES('project_payment',$1::uuid,'payment',$2,'RUB','configuration_required',$3::jsonb)
      ON CONFLICT(source_type,project_payment_intent_id,receipt_kind) WHERE project_payment_intent_id IS NOT NULL DO NOTHING
    `,[local.id,providerMinor,JSON.stringify({provider:"yookassa",provider_payment_id:providerPaymentId,platform_fee_amount:local.platform_fee_amount,payout_amount:local.payout_amount,legal_note:"Фискализация требует согласованной 54-ФЗ/агентской модели"})]);
    await client.query("COMMIT");
    return NextResponse.json({ok:true,status:targetStatus});
  }catch(error){
    await client.query("ROLLBACK");
    console.error("Ошибка обработки YooKassa webhook escrow-платежа:",error);
    return NextResponse.json({ok:false},{status:500});
  }finally{client.release();}
}

async function processAdPayment(provider:YooPayment,providerPaymentId:string){
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const localResult=await client.query<AdPayment>(`
      SELECT ap.id,ap.order_id,ap.status,ap.amount_minor,ap.currency,ao.status AS order_status
      FROM public.ad_order_payments ap
      JOIN public.ad_orders ao ON ao.id=ap.order_id
      WHERE ap.provider_payment_id=$1::text
      LIMIT 1 FOR UPDATE OF ap,ao
    `,[providerPaymentId]);
    const local=localResult.rows[0];
    if(!local){await client.query("ROLLBACK");return NextResponse.json({ok:true,ignored:"unknown_ad_payment"});}

    if(provider.status==="canceled"){
      if(local.status==="pending")await client.query(`UPDATE public.ad_order_payments SET status='cancelled',updated_at=now() WHERE id=$1::uuid`,[local.id]);
      await client.query("COMMIT");
      return NextResponse.json({ok:true});
    }
    if(provider.status!=="succeeded"||provider.paid===false){await client.query("COMMIT");return NextResponse.json({ok:true,ignored:"not_succeeded"});}
    if(local.status==="succeeded"){await client.query("COMMIT");return NextResponse.json({ok:true,idempotent:true});}

    const providerMinor=Math.round(Number(provider.amount.value)*100);
    if(providerMinor!==Number(local.amount_minor)||provider.amount.currency!==local.currency){
      await client.query("ROLLBACK");
      console.error("Несовпадение суммы платежа рекламы",{providerPaymentId,providerMinor,localAmount:local.amount_minor});
      return NextResponse.json({ok:false,error:"amount_mismatch"},{status:409});
    }
    if(provider.metadata?.local_ad_payment_id&&provider.metadata.local_ad_payment_id!==local.id){await client.query("ROLLBACK");return NextResponse.json({ok:false,error:"metadata_mismatch"},{status:409});}
    if(provider.metadata?.ad_order_id&&provider.metadata.ad_order_id!==local.order_id){await client.query("ROLLBACK");return NextResponse.json({ok:false,error:"order_mismatch"},{status:409});}
    if(local.order_status!=="awaiting_payment"){
      await client.query("ROLLBACK");
      return NextResponse.json({ok:false,error:"order_state_mismatch"},{status:409});
    }

    await client.query(`UPDATE public.ad_order_payments SET status='succeeded',paid_at=now(),updated_at=now() WHERE id=$1::uuid`,[local.id]);
    await client.query(`UPDATE public.ad_orders SET status='paid' WHERE id=$1::uuid AND status='awaiting_payment'`,[local.order_id]);
    await client.query("COMMIT");
    return NextResponse.json({ok:true});
  }catch(error){
    await client.query("ROLLBACK");
    console.error("Ошибка обработки YooKassa webhook рекламы:",error);
    return NextResponse.json({ok:false},{status:500});
  }finally{client.release();}
}

async function processMaterialPayment(provider:YooPayment,providerPaymentId:string){
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const localResult=await client.query<MaterialPayment>(`
      SELECT mop.id,mop.order_id,mop.status,mop.amount_minor,mop.currency,mo.status AS order_status
      FROM public.material_order_payments mop
      JOIN public.material_orders mo ON mo.id=mop.order_id
      WHERE mop.provider_payment_id=$1::text
      LIMIT 1 FOR UPDATE OF mop,mo
    `,[providerPaymentId]);
    const local=localResult.rows[0];
    if(!local){await client.query("ROLLBACK");return NextResponse.json({ok:true,ignored:"unknown_material_payment"});}

    if(provider.status==="canceled"){
      if(local.status==="pending")await client.query(`UPDATE public.material_order_payments SET status='cancelled',updated_at=now() WHERE id=$1::uuid`,[local.id]);
      await client.query("COMMIT");
      return NextResponse.json({ok:true});
    }
    if(provider.status!=="succeeded"||provider.paid===false){await client.query("COMMIT");return NextResponse.json({ok:true,ignored:"not_succeeded"});}
    if(local.status==="succeeded"){await client.query("COMMIT");return NextResponse.json({ok:true,idempotent:true});}

    const providerMinor=Math.round(Number(provider.amount.value)*100);
    if(providerMinor!==Number(local.amount_minor)||provider.amount.currency!==local.currency){
      await client.query("ROLLBACK");
      console.error("Несовпадение суммы платежа заказа материалов",{providerPaymentId,providerMinor,localAmount:local.amount_minor});
      return NextResponse.json({ok:false,error:"amount_mismatch"},{status:409});
    }
    if(provider.metadata?.local_material_payment_id&&provider.metadata.local_material_payment_id!==local.id){await client.query("ROLLBACK");return NextResponse.json({ok:false,error:"metadata_mismatch"},{status:409});}
    if(provider.metadata?.material_order_id&&provider.metadata.material_order_id!==local.order_id){await client.query("ROLLBACK");return NextResponse.json({ok:false,error:"order_mismatch"},{status:409});}
    if(local.order_status!=="awaiting_payment"){
      await client.query("ROLLBACK");
      return NextResponse.json({ok:false,error:"order_state_mismatch"},{status:409});
    }

    await client.query(`UPDATE public.material_order_payments SET status='succeeded',paid_at=now(),updated_at=now() WHERE id=$1::uuid`,[local.id]);
    await client.query(`UPDATE public.material_orders SET status='paid',paid_at=now(),updated_at=now() WHERE id=$1::uuid AND status='awaiting_payment'`,[local.order_id]);
    await client.query(`
      INSERT INTO public.finance_receipts(source_type,material_order_id,receipt_kind,amount_minor,currency,status,snapshot)
      VALUES('material_order',$1::uuid,'payment',$2,$3::varchar,'configuration_required',$4::jsonb)
      ON CONFLICT(source_type,material_order_id,receipt_kind) WHERE material_order_id IS NOT NULL DO NOTHING
    `,[local.order_id,providerMinor,local.currency,JSON.stringify({provider:"yookassa",provider_payment_id:providerPaymentId,legal_note:"Чек и агентские реквизиты зависят от согласованной модели продажи материалов"})]);
    await client.query("COMMIT");
    return NextResponse.json({ok:true});
  }catch(error){
    await client.query("ROLLBACK");
    console.error("Ошибка обработки YooKassa webhook заказа материалов:",error);
    return NextResponse.json({ok:false},{status:500});
  }finally{client.release();}
}

async function processSubscriptionPayment(provider:YooPayment,providerPaymentId:string){
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const localResult=await client.query<SubscriptionPayment>(`
      SELECT id,contractor_id,plan_id,status,amount_minor,currency,duration_months_snapshot,auto_renew_requested
      FROM public.contractor_subscription_payments
      WHERE provider_payment_id=$1::text
      LIMIT 1 FOR UPDATE
    `,[providerPaymentId]);
    const local=localResult.rows[0];
    if(!local){await client.query("ROLLBACK");return NextResponse.json({ok:true,ignored:"unknown_payment"});}

    if(provider.status==="canceled"){
      if(local.status==="pending")await client.query(`UPDATE public.contractor_subscription_payments SET status='cancelled',updated_at=now() WHERE id=$1::uuid`,[local.id]);
      await client.query("COMMIT");
      return NextResponse.json({ok:true});
    }
    if(provider.status!=="succeeded"||provider.paid===false){await client.query("COMMIT");return NextResponse.json({ok:true,ignored:"not_succeeded"});}
    if(local.status==="succeeded"){await client.query("COMMIT");return NextResponse.json({ok:true,idempotent:true});}

    const providerMinor=Math.round(Number(provider.amount.value)*100);
    if(providerMinor!==Number(local.amount_minor)||provider.amount.currency!==local.currency){
      await client.query("ROLLBACK");
      console.error("Несовпадение суммы платежа подписки",{providerPaymentId,providerMinor,localAmount:local.amount_minor});
      return NextResponse.json({ok:false,error:"amount_mismatch"},{status:409});
    }
    if(provider.metadata?.local_subscription_payment_id&&provider.metadata.local_subscription_payment_id!==local.id){await client.query("ROLLBACK");return NextResponse.json({ok:false,error:"metadata_mismatch"},{status:409});}

    await client.query(`UPDATE public.contractor_subscription_payments SET status='succeeded',paid_at=now(),updated_at=now() WHERE id=$1::uuid`,[local.id]);
    const savedMethod=provider.payment_method?.saved&&provider.payment_method.id?provider.payment_method.id:null;
    await client.query(`
      INSERT INTO public.contractor_subscriptions(
        contractor_id,plan_id,status,started_at,current_period_start,current_period_end,auto_renew,provider_payment_method_id,cancel_at_period_end,updated_at
      ) VALUES($1::uuid,$2::uuid,'active',now(),now(),now()+make_interval(months=>$3),$4,$5,false,now())
      ON CONFLICT(contractor_id) DO UPDATE SET
        plan_id=EXCLUDED.plan_id,
        status='active',
        current_period_start=CASE WHEN public.contractor_subscriptions.current_period_end>now() THEN public.contractor_subscriptions.current_period_start ELSE now() END,
        current_period_end=GREATEST(public.contractor_subscriptions.current_period_end,now())+make_interval(months=>$3),
        grace_ends_at=NULL,
        auto_renew=$4,
        provider_payment_method_id=COALESCE($5,public.contractor_subscriptions.provider_payment_method_id),
        cancel_at_period_end=false,
        updated_at=now()
    `,[local.contractor_id,local.plan_id,local.duration_months_snapshot,local.auto_renew_requested,savedMethod]);
    await client.query("COMMIT");
    return NextResponse.json({ok:true});
  }catch(error){
    await client.query("ROLLBACK");
    console.error("Ошибка обработки YooKassa webhook подписки:",error);
    return NextResponse.json({ok:false},{status:500});
  }finally{client.release();}
}
