import { NextResponse } from "next/server";

import { db } from "@/lib/db/pool";

type WebhookBody={event?:string;object?:{id?:string}};
type YooPayment={id:string;status:string;paid?:boolean;amount:{value:string;currency:string};metadata?:Record<string,string>;payment_method?:{id?:string;saved?:boolean}};
type SubscriptionPayment={id:string;contractor_id:string;plan_id:string|null;status:string;amount_minor:string|number;currency:string;duration_months_snapshot:number;auto_renew_requested:boolean};
type MaterialPayment={id:string;order_id:string;status:string;amount_minor:string|number;currency:string;order_status:string};
type AdPayment={id:string;order_id:string;status:string;amount_minor:string|number;currency:string;order_status:string};

export async function POST(request:Request){
  const shopId=process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey=process.env.YOOKASSA_SECRET_KEY?.trim();
  if(!shopId||!secretKey)return NextResponse.json({ok:false,error:"provider_not_configured"},{status:503});

  let incoming:WebhookBody;
  try{incoming=await request.json() as WebhookBody;}catch{return NextResponse.json({ok:false},{status:400});}
  const providerPaymentId=incoming.object?.id;
  if(!providerPaymentId)return NextResponse.json({ok:false},{status:400});

  const response=await fetch(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(providerPaymentId)}`,{
    headers:{Authorization:`Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`},
    cache:"no-store",
  });
  if(!response.ok)return NextResponse.json({ok:false},{status:502});
  const provider=await response.json() as YooPayment;

  if(provider.metadata?.payment_scope==="ad_order"||provider.metadata?.local_ad_payment_id){
    return processAdPayment(provider,providerPaymentId);
  }
  if(provider.metadata?.payment_scope==="material_order"||provider.metadata?.local_material_payment_id){
    return processMaterialPayment(provider,providerPaymentId);
  }
  return processSubscriptionPayment(provider,providerPaymentId);
}

async function processAdPayment(provider:YooPayment,providerPaymentId:string){
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const localResult=await client.query<AdPayment>(`
      SELECT ap.id,ap.order_id,ap.status,ap.amount_minor,ap.currency,ao.status AS order_status
      FROM public.ad_order_payments ap
      JOIN public.ad_orders ao ON ao.id=ap.order_id
      WHERE ap.provider_payment_id=$1
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
      WHERE mop.provider_payment_id=$1
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
      WHERE provider_payment_id=$1
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
