"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";

export async function updateSubscriptionPlan(formData:FormData):Promise<never>{
  const {profile}=await requireStaffUser();
  if(profile.role!=="admin") redirect("/admin/subscriptions?error=forbidden");
  const planId=String(formData.get("planId")??"");
  const name=String(formData.get("name")??"").trim();
  const priceRub=Number(formData.get("priceRub"));
  const isActive=formData.get("isActive")==="on";
  if(!/^[0-9a-f-]{36}$/i.test(planId)||!name||!Number.isFinite(priceRub)||priceRub<0) redirect("/admin/subscriptions?error=plan");
  await db.query(`UPDATE public.contractor_subscription_plans SET name=$2,price_minor=$3,is_active=$4,updated_at=now() WHERE id=$1::uuid`,[planId,name,Math.round(priceRub*100),isActive]);
  revalidatePath("/admin/subscriptions");
  revalidatePath("/contractor/subscription");
  redirect("/admin/subscriptions?saved=1");
}

export async function grantContractorSubscription(formData:FormData):Promise<never>{
  const {user,profile}=await requireStaffUser();
  if(profile.role!=="admin") redirect("/admin/subscriptions?error=forbidden");
  const contractorId=String(formData.get("contractorId")??"");
  const planId=String(formData.get("planId")??"");
  if(!/^[0-9a-f-]{36}$/i.test(contractorId)||!/^[0-9a-f-]{36}$/i.test(planId)) redirect("/admin/subscriptions?error=grant");
  const planResult=await db.query<{id:string;code:string;name:string;duration_months:number;currency:string}>(`SELECT id,code,name,duration_months,currency FROM public.contractor_subscription_plans WHERE id=$1::uuid LIMIT 1`,[planId]);
  const plan=planResult.rows[0];
  if(!plan) redirect("/admin/subscriptions?error=grant");
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    await client.query(`
      INSERT INTO public.contractor_subscriptions(contractor_id,plan_id,status,started_at,current_period_start,current_period_end,auto_renew,cancel_at_period_end,updated_at)
      VALUES($1::uuid,$2::uuid,'active',now(),now(),now()+make_interval(months=>$3),false,false,now())
      ON CONFLICT(contractor_id) DO UPDATE SET
        plan_id=EXCLUDED.plan_id,status='active',
        current_period_start=CASE WHEN public.contractor_subscriptions.current_period_end>now() THEN public.contractor_subscriptions.current_period_start ELSE now() END,
        current_period_end=GREATEST(public.contractor_subscriptions.current_period_end,now())+make_interval(months=>$3),
        grace_ends_at=NULL,cancel_at_period_end=false,updated_at=now()
    `,[contractorId,plan.id,plan.duration_months]);
    await client.query(`
      INSERT INTO public.contractor_subscription_payments(
        contractor_id,plan_id,provider,idempotency_key,status,payment_type,amount_minor,currency,
        plan_code_snapshot,plan_name_snapshot,duration_months_snapshot,paid_at,metadata
      ) VALUES($1::uuid,$2::uuid,'admin',$3::uuid,'succeeded','admin_grant',0,$4,$5,$6,$7,now(),$8::jsonb)
    `,[contractorId,plan.id,randomUUID(),plan.currency,plan.code,plan.name,plan.duration_months,JSON.stringify({granted_by:user.id})]);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");console.error("Ошибка выдачи подписки:",error);redirect("/admin/subscriptions?error=grant");}finally{client.release();}
  revalidatePath("/admin/subscriptions");
  revalidatePath("/contractor/subscription");
  redirect("/admin/subscriptions?granted=1");
}
