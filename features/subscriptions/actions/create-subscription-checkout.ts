"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

type PlanRow={id:string;code:string;name:string;duration_months:number;price_minor:string|number;currency:string};
type CompanyRow={id:string;verification_status:string};
type YooPayment={id:string;confirmation?:{confirmation_url?:string};status:string};

export async function createSubscriptionCheckout(formData:FormData):Promise<never>{
  const activeUser=await requireActiveUser();
  if(!activeUser.success) redirect("/login");
  if(activeUser.profile.role!=="contractor") redirect("/dashboard");

  const planId=String(formData.get("planId")??"");
  const savePaymentMethod=formData.get("savePaymentMethod")==="on";
  if(!/^[0-9a-f-]{36}$/i.test(planId)) redirect("/contractor/subscription?error=plan");

  const [companyResult,planResult]=await Promise.all([
    db.query<CompanyRow>(`SELECT id,verification_status FROM public.contractor_companies WHERE owner_id=$1::uuid LIMIT 1`,[activeUser.user.id]),
    db.query<PlanRow>(`SELECT id,code,name,duration_months,price_minor,currency FROM public.contractor_subscription_plans WHERE id=$1::uuid AND is_active=true LIMIT 1`,[planId]),
  ]);
  const company=companyResult.rows[0];
  const plan=planResult.rows[0];
  if(!company) redirect("/contractor/company");
  if(company.verification_status!=="verified") redirect("/contractor/subscription?error=verification");
  if(!plan) redirect("/contractor/subscription?error=plan");

  const shopId=process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey=process.env.YOOKASSA_SECRET_KEY?.trim();
  if(!shopId||!secretKey) redirect("/contractor/subscription?error=provider");

  const idempotencyKey=randomUUID();
  const localPaymentId=randomUUID();
  const amountMinor=Number(plan.price_minor);
  const requestHeaders=await headers();
  const host=requestHeaders.get("x-forwarded-host")??requestHeaders.get("host");
  const proto=requestHeaders.get("x-forwarded-proto")??(process.env.NODE_ENV==="production"?"https":"http");
  const configuredOrigin=process.env.APP_URL?.trim().replace(/\/$/,"");
  const origin=configuredOrigin||(host?`${proto}://${host}`:null);
  if(!origin) redirect("/contractor/subscription?error=origin");

  await db.query(`
    INSERT INTO public.contractor_subscription_payments(
      id,contractor_id,plan_id,provider,idempotency_key,status,payment_type,amount_minor,currency,
      plan_code_snapshot,plan_name_snapshot,duration_months_snapshot,auto_renew_requested,metadata
    ) VALUES($1::uuid,$2::uuid,$3::uuid,'yookassa',$4::uuid,'pending','initial',$5,$6,$7,$8,$9,$10,$11::jsonb)
  `,[localPaymentId,company.id,plan.id,idempotencyKey,amountMinor,plan.currency,plan.code,plan.name,plan.duration_months,savePaymentMethod,JSON.stringify({user_id:activeUser.user.id})]);

  let provider:YooPayment;
  try{
    const response=await fetch("https://api.yookassa.ru/v3/payments",{
      method:"POST",
      headers:{
        Authorization:`Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,
        "Idempotence-Key":idempotencyKey,
        "Content-Type":"application/json",
      },
      body:JSON.stringify({
        amount:{value:(amountMinor/100).toFixed(2),currency:plan.currency},
        capture:true,
        confirmation:{type:"redirect",return_url:`${origin}/contractor/subscription?payment=return`},
        save_payment_method:savePaymentMethod,
        description:`Подписка StroySelect: ${plan.name}`,
        metadata:{local_subscription_payment_id:localPaymentId,contractor_id:company.id},
      }),
      cache:"no-store",
    });
    if(!response.ok) throw new Error(`YooKassa create payment failed: ${response.status}`);
    provider=await response.json() as YooPayment;
  }catch(error){
    console.error("Ошибка создания платежа подписки:",error);
    await db.query(`UPDATE public.contractor_subscription_payments SET status='failed',updated_at=now() WHERE id=$1::uuid AND status='pending'`,[localPaymentId]);
    redirect("/contractor/subscription?error=payment");
  }

  await db.query(`UPDATE public.contractor_subscription_payments SET provider_payment_id=$2,updated_at=now() WHERE id=$1::uuid`,[localPaymentId,provider.id]);
  const confirmationUrl=provider.confirmation?.confirmation_url;
  if(!confirmationUrl) redirect("/contractor/subscription?error=confirmation");
  redirect(confirmationUrl);
}
