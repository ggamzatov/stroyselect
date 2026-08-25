"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireActiveUser } from "@/lib/auth/require-active-user";
import { db } from "@/lib/db/pool";

type CompanyRow={id:string;public_name:string;legal_name:string|null;inn:string|null;ogrn:string|null;website:string|null;contact_email:string|null;contact_phone:string|null;verification_status:string};
type AdvertiserRow={id:string;status:string};
type PlacementRow={id:string;code:string;name:string;unit_price_minor:string|number;currency:string;min_days:number;max_days:number;is_active:boolean};
type OrderRow={id:string;advertiser_id:string;status:string;amount_minor:string|number;currency:string};
type YooPayment={id:string;confirmation?:{confirmation_url?:string}};

function clean(value:FormDataEntryValue|null){return String(value??"").trim();}
function validUuid(value:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function validUrl(value:string){try{const url=new URL(value);return url.protocol==="https:"||url.protocol==="http:";}catch{return false;}}
function cleanDigits(value:string){return value.replace(/\D/g,"");}

async function requireContractor(){
  const activeUser=await requireActiveUser();
  if(!activeUser.success) redirect("/login");
  if(activeUser.profile.role!=="contractor") redirect("/dashboard");
  const companyResult=await db.query<CompanyRow>(`SELECT id,public_name,legal_name,inn,ogrn,website,contact_email,contact_phone,verification_status FROM public.contractor_companies WHERE owner_id=$1::uuid LIMIT 1`,[activeUser.user.id]);
  const company=companyResult.rows[0];
  if(!company) redirect("/contractor/company");
  return {activeUser,company};
}

export async function saveAdAdvertiser(formData:FormData):Promise<never>{
  const {activeUser,company}=await requireContractor();
  const displayName=clean(formData.get("displayName")).slice(0,200);
  const legalName=clean(formData.get("legalName")).slice(0,240);
  const inn=cleanDigits(clean(formData.get("inn")));
  const ogrn=cleanDigits(clean(formData.get("ogrn")));
  const websiteUrl=clean(formData.get("websiteUrl"));
  const contactEmail=clean(formData.get("contactEmail"));
  const contactPhone=clean(formData.get("contactPhone"));
  const legalConfirmed=formData.get("legalConfirmed")==="on";
  if(!displayName||!legalName||![10,12].includes(inn.length)||!legalConfirmed)redirect("/contractor/advertising?error=advertiser");
  if(ogrn&&![13,15].includes(ogrn.length))redirect("/contractor/advertising?error=advertiser");
  if(websiteUrl&&!validUrl(websiteUrl))redirect("/contractor/advertising?error=url");
  if(contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))redirect("/contractor/advertising?error=email");

  const companyInn=cleanDigits(company.inn??"");
  const companyOgrn=cleanDigits(company.ogrn??"");
  const identityMatches=company.verification_status==="verified"&&Boolean(company.legal_name)&&legalName===company.legal_name&&inn===companyInn&&(!companyOgrn||ogrn===companyOgrn);
  const status=identityMatches?"verified":"pending";

  await db.query(`
    INSERT INTO public.ad_advertisers(owner_user_id,display_name,legal_name,inn,ogrn,website_url,contact_email,contact_phone,status,verified_at,legal_confirmation_at,updated_at)
    VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $9='verified' THEN now() ELSE NULL END,now(),now())
    ON CONFLICT(owner_user_id) WHERE owner_user_id IS NOT NULL DO UPDATE SET
      display_name=EXCLUDED.display_name,legal_name=EXCLUDED.legal_name,inn=EXCLUDED.inn,ogrn=EXCLUDED.ogrn,website_url=EXCLUDED.website_url,
      contact_email=EXCLUDED.contact_email,contact_phone=EXCLUDED.contact_phone,status=CASE WHEN public.ad_advertisers.status='suspended' THEN 'suspended' ELSE EXCLUDED.status END,
      verified_at=CASE WHEN EXCLUDED.status='verified' THEN now() ELSE NULL END,legal_confirmation_at=now(),updated_at=now()
  `,[activeUser.user.id,displayName,legalName,inn,ogrn||null,websiteUrl||null,contactEmail||null,contactPhone||null,status]);
  redirect(`/contractor/advertising?saved=advertiser${status==="verified"?"&verified=1":""}`);
}

export async function createAdDraft(formData:FormData):Promise<never>{
  const {activeUser,company}=await requireContractor();
  const advertiserResult=await db.query<AdvertiserRow>(`SELECT id,status FROM public.ad_advertisers WHERE owner_user_id=$1::uuid LIMIT 1`,[activeUser.user.id]);
  const advertiser=advertiserResult.rows[0];
  if(!advertiser||advertiser.status!=="verified")redirect("/contractor/advertising?error=verification");

  const placementId=clean(formData.get("placementId"));
  const durationDays=Number(clean(formData.get("durationDays")));
  const campaignName=clean(formData.get("campaignName")).slice(0,200);
  const title=clean(formData.get("title")).slice(0,180);
  const body=clean(formData.get("body")).slice(0,1200);
  const destinationUrl=clean(formData.get("destinationUrl"));
  const targetCity=clean(formData.get("targetCity")).slice(0,160);
  const targetCategory=clean(formData.get("targetCategory")).slice(0,160);
  if(!validUuid(placementId)||!Number.isInteger(durationDays)||!campaignName||!title||!body||!validUrl(destinationUrl))redirect("/contractor/advertising?error=campaign");

  const placementResult=await db.query<PlacementRow>(`SELECT id,code,name,unit_price_minor,currency,min_days,max_days,is_active FROM public.ad_placements WHERE id=$1::uuid LIMIT 1`,[placementId]);
  const placement=placementResult.rows[0];
  if(!placement||!placement.is_active||durationDays<placement.min_days||durationDays>placement.max_days||placement.code==="supplier_boost")redirect("/contractor/advertising?error=placement");

  const campaignId=randomUUID();
  const creativeId=randomUUID();
  const orderId=randomUUID();
  const amountMinor=Number(placement.unit_price_minor)*durationDays;
  const levyEstimate=Math.round(amountMinor*0.03);
  const targetContractorId=placement.code==="contractor_boost"?company.id:null;
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    await client.query(`INSERT INTO public.ad_campaigns(id,advertiser_id,created_by,name,target_city,target_category_slug,target_contractor_id) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7::uuid)`,[campaignId,advertiser.id,activeUser.user.id,campaignName,targetCity||null,targetCategory||null,targetContractorId]);
    await client.query(`INSERT INTO public.ad_creatives(id,campaign_id,title,body,destination_url,status) VALUES($1::uuid,$2::uuid,$3,$4,$5,'draft')`,[creativeId,campaignId,title,body,destinationUrl]);
    const advertiserSnapshot=await client.query<{display_name:string;inn:string}>(`SELECT display_name,inn FROM public.ad_advertisers WHERE id=$1::uuid`,[advertiser.id]);
    const ad=advertiserSnapshot.rows[0];
    await client.query(`
      INSERT INTO public.ad_orders(id,advertiser_id,campaign_id,creative_id,placement_id,created_by,status,duration_days_snapshot,unit_price_minor,amount_minor,currency,levy_rate_bps,levy_estimate_minor,placement_code_snapshot,placement_name_snapshot,advertiser_name_snapshot,advertiser_inn_snapshot,title_snapshot,body_snapshot,destination_url_snapshot,target_city_snapshot,target_category_slug_snapshot,target_contractor_id)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,'draft',$7,$8,$9,$10,300,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::uuid)
    `,[orderId,advertiser.id,campaignId,creativeId,placement.id,activeUser.user.id,durationDays,Number(placement.unit_price_minor),amountMinor,placement.currency,levyEstimate,placement.code,placement.name,ad.display_name,ad.inn,title,body,destinationUrl,targetCity||null,targetCategory||null,targetContractorId]);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");console.error("Ошибка создания рекламного заказа:",error);redirect("/contractor/advertising?error=create");}finally{client.release();}
  redirect("/contractor/advertising?created=1");
}

export async function createAdCheckout(formData:FormData):Promise<never>{
  const {activeUser}=await requireContractor();
  const orderId=clean(formData.get("orderId"));
  if(!validUuid(orderId))redirect("/contractor/advertising?error=order");
  const result=await db.query<OrderRow>(`
    SELECT o.id,o.advertiser_id,o.status,o.amount_minor,o.currency
    FROM public.ad_orders o JOIN public.ad_advertisers a ON a.id=o.advertiser_id
    WHERE o.id=$1::uuid AND a.owner_user_id=$2::uuid AND a.status='verified' LIMIT 1
  `,[orderId,activeUser.user.id]);
  const order=result.rows[0];
  if(!order||!["draft","awaiting_payment"].includes(order.status))redirect("/contractor/advertising?error=order");

  const existing=await db.query<{confirmation_url:string|null}>(`SELECT confirmation_url FROM public.ad_order_payments WHERE order_id=$1::uuid AND status='pending' ORDER BY created_at DESC LIMIT 1`,[orderId]);
  const existingUrl=existing.rows[0]?.confirmation_url;
  if(existingUrl)redirect(existingUrl);

  const shopId=process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey=process.env.YOOKASSA_SECRET_KEY?.trim();
  if(!shopId||!secretKey)redirect("/contractor/advertising?error=provider");
  const requestHeaders=await headers();
  const host=requestHeaders.get("x-forwarded-host")??requestHeaders.get("host");
  const proto=requestHeaders.get("x-forwarded-proto")??(process.env.NODE_ENV==="production"?"https":"http");
  const configuredOrigin=process.env.APP_URL?.trim().replace(/\/$/,"")||process.env.APP_BASE_URL?.trim().replace(/\/$/,"");
  const origin=configuredOrigin||(host?`${proto}://${host}`:null);
  if(!origin)redirect("/contractor/advertising?error=origin");

  const paymentId=randomUUID();
  const idempotencyKey=randomUUID();
  await db.query(`INSERT INTO public.ad_order_payments(id,order_id,payer_id,provider,idempotency_key,status,amount_minor,currency,metadata) VALUES($1::uuid,$2::uuid,$3::uuid,'yookassa',$4::uuid,'pending',$5,$6,$7::jsonb)`,[paymentId,orderId,activeUser.user.id,idempotencyKey,Number(order.amount_minor),order.currency,JSON.stringify({payment_scope:"ad_order"})]);
  let provider:YooPayment;
  try{
    const response=await fetch("https://api.yookassa.ru/v3/payments",{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,"Idempotence-Key":idempotencyKey,"Content-Type":"application/json"},body:JSON.stringify({amount:{value:(Number(order.amount_minor)/100).toFixed(2),currency:order.currency},capture:true,confirmation:{type:"redirect",return_url:`${origin}/contractor/advertising?payment=return`},description:"Реклама в StroySelect",metadata:{payment_scope:"ad_order",local_ad_payment_id:paymentId,ad_order_id:orderId}}),cache:"no-store"});
    if(!response.ok)throw new Error(`YooKassa create ad payment failed: ${response.status}`);
    provider=await response.json() as YooPayment;
  }catch(error){console.error("Ошибка создания платежа рекламы:",error);await db.query(`UPDATE public.ad_order_payments SET status='failed',updated_at=now() WHERE id=$1::uuid AND status='pending'`,[paymentId]);redirect("/contractor/advertising?error=payment");}
  const confirmationUrl=provider.confirmation?.confirmation_url;
  if(!confirmationUrl){await db.query(`UPDATE public.ad_order_payments SET status='failed',provider_payment_id=$2,updated_at=now() WHERE id=$1::uuid`,[paymentId,provider.id]);redirect("/contractor/advertising?error=confirmation");}
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    await client.query(`UPDATE public.ad_order_payments SET provider_payment_id=$2,confirmation_url=$3,updated_at=now() WHERE id=$1::uuid`,[paymentId,provider.id,confirmationUrl]);
    if(order.status==="draft")await client.query(`UPDATE public.ad_orders SET status='awaiting_payment' WHERE id=$1::uuid AND status='draft'`,[orderId]);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");console.error("Ошибка фиксации платежа рекламы:",error);redirect("/contractor/advertising?error=payment");}finally{client.release();}
  redirect(confirmationUrl);
}

export async function submitAdForModeration(formData:FormData):Promise<never>{
  const {activeUser}=await requireContractor();
  const orderId=clean(formData.get("orderId"));
  if(!validUuid(orderId))redirect("/contractor/advertising?error=order");
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const order=await client.query<{id:string;creative_id:string}>(`SELECT o.id,o.creative_id FROM public.ad_orders o JOIN public.ad_advertisers a ON a.id=o.advertiser_id WHERE o.id=$1::uuid AND a.owner_user_id=$2::uuid AND o.status IN ('paid','rejected') LIMIT 1 FOR UPDATE OF o`,[orderId,activeUser.user.id]);
    const row=order.rows[0];if(!row){await client.query("ROLLBACK");redirect("/contractor/advertising?error=moderation");}
    await client.query(`UPDATE public.ad_creatives SET status='pending',moderation_notes=NULL,updated_at=now() WHERE id=$1::uuid`,[row.creative_id]);
    await client.query(`UPDATE public.ad_orders SET status='moderation',rejection_reason=NULL WHERE id=$1::uuid`,[orderId]);
    await client.query(`INSERT INTO public.ad_moderation_events(order_id,actor_id,action,note) VALUES($1::uuid,$2::uuid,'submitted','Рекламодатель отправил оплаченный креатив на модерацию')`,[orderId,activeUser.user.id]);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");console.error("Ошибка отправки рекламы на модерацию:",error);redirect("/contractor/advertising?error=moderation");}finally{client.release();}
  redirect("/contractor/advertising?moderation=1");
}
