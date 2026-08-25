"use server";

import { redirect } from "next/navigation";

import { requireStaffUser } from "@/lib/auth/require-staff-user";
import { db } from "@/lib/db/pool";

function clean(value:FormDataEntryValue|null){return String(value??"").trim();}
function validUuid(value:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function parseMinor(value:string){const normalized=value.replace(",",".");const amount=Number(normalized);return Number.isFinite(amount)&&amount>=0?Math.round(amount*100):null;}
function parseMskDateTime(value:string){if(!value)return null;const iso=/[zZ]|[+-]\d\d:\d\d$/.test(value)?value:`${value}:00+03:00`;const date=new Date(iso);return Number.isFinite(date.getTime())?date:null;}

export async function updateAdPlacement(formData:FormData):Promise<never>{
  await requireStaffUser();
  const placementId=clean(formData.get("placementId"));
  const priceMinor=parseMinor(clean(formData.get("priceRub")));
  const minDays=Number(clean(formData.get("minDays")));
  const maxDays=Number(clean(formData.get("maxDays")));
  const active=formData.get("active")==="on";
  if(!validUuid(placementId)||priceMinor===null||!Number.isInteger(minDays)||!Number.isInteger(maxDays)||minDays<1||maxDays<minDays||maxDays>365)redirect("/admin/ads?error=placement");
  await db.query(`UPDATE public.ad_placements SET unit_price_minor=$2,min_days=$3,max_days=$4,is_active=$5,updated_at=now() WHERE id=$1::uuid`,[placementId,priceMinor,minDays,maxDays,active]);
  redirect("/admin/ads?saved=placement");
}

export async function setAdAdvertiserStatus(formData:FormData):Promise<never>{
  const {user}=await requireStaffUser();
  const advertiserId=clean(formData.get("advertiserId"));
  const status=clean(formData.get("status"));
  const notes=clean(formData.get("notes")).slice(0,2000);
  if(!validUuid(advertiserId)||!["verified","rejected","suspended","pending"].includes(status))redirect("/admin/ads?error=advertiser");
  await db.query(`UPDATE public.ad_advertisers SET status=$2,verification_notes=$3,verified_by=CASE WHEN $2='verified' THEN $4::uuid ELSE verified_by END,verified_at=CASE WHEN $2='verified' THEN now() ELSE NULL END,updated_at=now() WHERE id=$1::uuid`,[advertiserId,status,notes||null,user.id]);
  redirect("/admin/ads?saved=advertiser");
}

export async function moderateAdOrder(formData:FormData):Promise<never>{
  const {user}=await requireStaffUser();
  const orderId=clean(formData.get("orderId"));
  const decision=clean(formData.get("decision"));
  const notes=clean(formData.get("notes")).slice(0,3000);
  if(!validUuid(orderId)||!["approve","reject"].includes(decision)||(decision==="reject"&&!notes))redirect("/admin/ads?error=moderation");
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const result=await client.query<{id:string;creative_id:string}>(`SELECT id,creative_id FROM public.ad_orders WHERE id=$1::uuid AND status='moderation' LIMIT 1 FOR UPDATE`,[orderId]);
    const order=result.rows[0];
    if(!order){await client.query("ROLLBACK");redirect("/admin/ads?error=state");}
    if(decision==="approve"){
      await client.query(`UPDATE public.ad_creatives SET status='approved',moderation_notes=$2,approved_by=$3::uuid,approved_at=now(),updated_at=now() WHERE id=$1::uuid`,[order.creative_id,notes||null,user.id]);
      await client.query(`UPDATE public.ad_orders SET status='approved',rejection_reason=NULL WHERE id=$1::uuid`,[orderId]);
      await client.query(`INSERT INTO public.ad_moderation_events(order_id,actor_id,action,note) VALUES($1::uuid,$2::uuid,'approved',$3)`,[orderId,user.id,notes||"Креатив одобрен"]);
    }else{
      await client.query(`UPDATE public.ad_creatives SET status='rejected',moderation_notes=$2,updated_at=now() WHERE id=$1::uuid`,[order.creative_id,notes]);
      await client.query(`UPDATE public.ad_orders SET status='rejected',rejection_reason=$2 WHERE id=$1::uuid`,[orderId,notes]);
      await client.query(`INSERT INTO public.ad_moderation_events(order_id,actor_id,action,note) VALUES($1::uuid,$2::uuid,'rejected',$3)`,[orderId,user.id,notes]);
    }
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");console.error("Ошибка модерации рекламы:",error);redirect("/admin/ads?error=moderation");}finally{client.release();}
  redirect(`/admin/ads?moderated=${decision}`);
}

export async function recordAdEridAndSchedule(formData:FormData):Promise<never>{
  const {user}=await requireStaffUser();
  const orderId=clean(formData.get("orderId"));
  const erid=clean(formData.get("erid")).slice(0,160);
  const ordProvider=clean(formData.get("ordProvider")).slice(0,100);
  const ordCreativeId=clean(formData.get("ordCreativeId")).slice(0,500);
  const startNow=formData.get("startNow")==="on";
  if(!validUuid(orderId)||!erid||!ordProvider)redirect("/admin/ads?error=erid");

  const orderResult=await db.query<{id:string;creative_id:string;campaign_id:string;duration_days_snapshot:number}>(`SELECT id,creative_id,campaign_id,duration_days_snapshot FROM public.ad_orders WHERE id=$1::uuid AND status='approved' LIMIT 1`,[orderId]);
  const order=orderResult.rows[0];
  if(!order)redirect("/admin/ads?error=state");
  const now=new Date();
  const from=startNow?new Date(now.getTime()-60_000):parseMskDateTime(clean(formData.get("scheduledFrom")));
  const to=startNow?new Date(now.getTime()+order.duration_days_snapshot*86_400_000):parseMskDateTime(clean(formData.get("scheduledTo")));
  if(!from||!to||to<=from||to.getTime()-from.getTime()>order.duration_days_snapshot*86_400_000+300_000)redirect("/admin/ads?error=schedule");
  const targetStatus=from<=now&&to>now?"active":"scheduled";

  const client=await db.connect();
  try{
    await client.query("BEGIN");
    await client.query(`UPDATE public.ad_creatives SET erid=$2,ord_provider=$3,ord_creative_id=$4,erid_registered_at=now(),updated_at=now() WHERE id=$1::uuid AND status='approved'`,[order.creative_id,erid,ordProvider,ordCreativeId||null]);
    await client.query(`UPDATE public.ad_orders SET scheduled_from=$2,scheduled_to=$3,status=$4 WHERE id=$1::uuid AND status='approved'`,[orderId,from.toISOString(),to.toISOString(),targetStatus]);
    await client.query(`UPDATE public.ad_campaigns SET status='active',updated_at=now() WHERE id=$1::uuid`,[order.campaign_id]);
    await client.query(`INSERT INTO public.ad_moderation_events(order_id,actor_id,action,note,metadata) VALUES($1::uuid,$2::uuid,'erid_recorded','ERID и ОРД зафиксированы',$3::jsonb)`,[orderId,user.id,JSON.stringify({erid,ord_provider:ordProvider,ord_creative_id:ordCreativeId||null})]);
    await client.query(`INSERT INTO public.ad_moderation_events(order_id,actor_id,action,note) VALUES($1::uuid,$2::uuid,$3,$4)`,[orderId,user.id,targetStatus==="active"?"activated":"scheduled",targetStatus==="active"?"Показ активирован":"Показ запланирован"]);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");console.error("Ошибка регистрации ERID/расписания:",error);redirect("/admin/ads?error=erid");}finally{client.release();}
  redirect(`/admin/ads?published=${targetStatus}`);
}

export async function activateScheduledAd(formData:FormData):Promise<never>{
  const {user}=await requireStaffUser();
  const orderId=clean(formData.get("orderId"));
  if(!validUuid(orderId))redirect("/admin/ads?error=order");
  const result=await db.query(`UPDATE public.ad_orders SET status='active' WHERE id=$1::uuid AND status='scheduled' AND scheduled_from<=now() AND scheduled_to>now() RETURNING id`,[orderId]);
  if(!result.rowCount)redirect("/admin/ads?error=schedule");
  await db.query(`INSERT INTO public.ad_moderation_events(order_id,actor_id,action,note) VALUES($1::uuid,$2::uuid,'activated','Запланированный показ активирован')`,[orderId,user.id]);
  redirect("/admin/ads?published=active");
}

export async function completeAdOrder(formData:FormData):Promise<never>{
  const {user}=await requireStaffUser();
  const orderId=clean(formData.get("orderId"));
  if(!validUuid(orderId))redirect("/admin/ads?error=order");
  const result=await db.query(`UPDATE public.ad_orders SET status='completed' WHERE id=$1::uuid AND status IN ('active','scheduled') AND scheduled_to<=now() RETURNING id`,[orderId]);
  if(!result.rowCount)redirect("/admin/ads?error=schedule");
  await db.query(`INSERT INTO public.ad_moderation_events(order_id,actor_id,action,note) VALUES($1::uuid,$2::uuid,'completed','Период размещения завершён')`,[orderId,user.id]);
  redirect("/admin/ads?completed=1");
}

export async function reconcileAdLevyQuarter(formData:FormData):Promise<never>{
  await requireStaffUser();
  const quarterStart=clean(formData.get("quarterStart"));
  const assessedMinor=parseMinor(clean(formData.get("assessedRub")));
  const status=clean(formData.get("status"));
  const notes=clean(formData.get("notes")).slice(0,3000);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(quarterStart)||assessedMinor===null||!["reconciled","paid"].includes(status))redirect("/admin/ads?error=levy");
  await db.query(`UPDATE public.ad_levy_quarter_estimates SET assessed_levy_minor=$2,status=$3,notes=$4,paid_at=CASE WHEN $3='paid' THEN now() ELSE paid_at END,updated_at=now() WHERE quarter_start=$1::date`,[quarterStart,assessedMinor,status,notes||null]);
  redirect("/admin/ads?saved=levy");
}
