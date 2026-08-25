"use server";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveUser } from "@/lib/auth/require-active-user";
import { db } from "@/lib/db/pool";
import { getMaterialProjectParticipant } from "@/lib/materials/get-material-project-participant";
import {
  acceptYandexClaim,
  calculateYandexOffers,
  createYandexClaim,
  getYandexClaimInfo,
  mapYandexStatus,
  type DeliveryDraft,
  type YandexClaimInfo,
  type YandexOffer,
  yandexDeliveryConfigured,
} from "@/lib/materials/yandex-delivery";

type CargoType="van"|"lcv_m"|"lcv_l"|"lcv_xl";
type MaterialRole="customer"|"contractor";
type SetupRow={
  order_id:string;project_id:string;supplier_id:string;order_status:string;goods_subtotal_minor:string|number;currency:string;supplier_name_snapshot:string;
  project_region:string|null;project_city:string|null;project_address:string|null;
  supplier_name:string;supplier_phone:string|null;supplier_email:string|null;
  location_id:string;location_name:string;location_address:string;location_latitude:string|number;location_longitude:string|number;location_phone:string|null;
  first_name:string;last_name:string|null;profile_phone:string|null;user_phone:string|null;user_email:string|null;
};
type RequestRow={
  id:string;order_id:string;project_id:string;status:string;selected_offer_id:string|null;provider_claim_id:string|null;provider_request_id:string|null;provider_version:string|number|null;
  pickup_address_snapshot:string;pickup_latitude:string|number;pickup_longitude:string|number;pickup_contact_name:string;pickup_contact_phone:string;pickup_contact_email:string|null;
  destination_address:string;destination_latitude:string|number;destination_longitude:string|number;recipient_name:string;recipient_phone:string;recipient_email:string|null;
  shipment_weight_kg:string|number;shipment_length_m:string|number;shipment_width_m:string|number;shipment_height_m:string|number;cargo_type:CargoType;cargo_loaders:0|1|2;
  goods_subtotal_minor:string|number;currency:string;supplier_name_snapshot:string;customer_id:string;
};
type OfferRow={id:string;provider_payload:string;expires_at:Date|string};
type PgError=Error&{code?:string};
type DeliveryState=ReturnType<typeof mapYandexStatus>;
type ClaimCreationState="claim_created"|"failed"|"cancelled";

export async function calculateMaterialDeliveryOffers(formData:FormData):Promise<never>{
  const orderId=uuid(formData.get("orderId"));
  const supplierLocationId=uuid(formData.get("supplierLocationId"));
  if(!orderId||!supplierLocationId)redirect("/dashboard");

  const activeUser=await requireCustomer();
  const latitude=finite(formData.get("destinationLatitude"));
  const longitude=finite(formData.get("destinationLongitude"));
  const weightKg=positive(formData.get("weightKg"));
  const lengthM=positive(formData.get("lengthM"));
  const widthM=positive(formData.get("widthM"));
  const heightM=positive(formData.get("heightM"));
  const cargoType=cargo(formData.get("cargoType"));
  const loaders=loaderCount(formData.get("loaders"));

  const orderLookup=await db.query<{project_id:string}>(`SELECT project_id FROM public.material_orders WHERE id=$1::uuid LIMIT 1`,[orderId]);
  const projectId=orderLookup.rows[0]?.project_id;
  if(!projectId)redirect("/dashboard");
  const url=(query:string)=>materialUrl(projectId,query,"customer");

  if(latitude===null||longitude===null||latitude<-90||latitude>90||longitude<-180||longitude>180||!weightKg||!lengthM||!widthM||!heightM||!cargoType||loaders===null)redirect(url("delivery_error=cargo"));
  if(!yandexDeliveryConfigured())redirect(url("delivery_error=provider"));

  const setupResult=await db.query<SetupRow>(`
    SELECT
      mo.id AS order_id,mo.project_id,mo.supplier_id,mo.status AS order_status,mo.goods_subtotal_minor,mo.currency,mo.supplier_name_snapshot,
      p.region AS project_region,p.city AS project_city,p.address AS project_address,
      s.public_name AS supplier_name,s.contact_phone AS supplier_phone,s.contact_email AS supplier_email,
      sl.id AS location_id,sl.name AS location_name,sl.address AS location_address,sl.latitude AS location_latitude,sl.longitude AS location_longitude,sl.phone AS location_phone,
      pr.first_name,pr.last_name,pr.phone AS profile_phone,u.phone AS user_phone,u.email AS user_email
    FROM public.material_orders mo
    JOIN public.projects p ON p.id=mo.project_id
    JOIN public.material_suppliers s ON s.id=mo.supplier_id
    JOIN public.material_supplier_locations sl ON sl.id=$2::uuid AND sl.supplier_id=mo.supplier_id AND sl.is_active=true AND sl.latitude IS NOT NULL AND sl.longitude IS NOT NULL
    JOIN public.profiles pr ON pr.id=p.customer_id
    JOIN public.users u ON u.id=p.customer_id
    WHERE mo.id=$1::uuid AND p.customer_id=$3::uuid AND p.is_admin_blocked=false
    LIMIT 1
  `,[orderId,supplierLocationId,activeUser.user.id]);
  const setup=setupResult.rows[0];
  if(!setup)redirect(url("delivery_error=access"));
  if(!["paid","supplier_confirmed","delivery_pending"].includes(setup.order_status))redirect(url("delivery_error=status"));
  const ctx=await getMaterialProjectParticipant(projectId,activeUser.user.id,activeUser.profile.role);
  if(!ctx.success)redirect("/dashboard");

  const exactAddress=setup.project_address?.trim();
  if(!exactAddress)redirect(url("delivery_error=address"));
  const destinationAddress=[setup.project_region,setup.project_city,exactAddress].filter(Boolean).join(", ");
  const recipientPhone=(setup.profile_phone||setup.user_phone||"").trim();
  if(!recipientPhone)redirect(url("delivery_error=contact"));
  const pickupPhone=(setup.location_phone||setup.supplier_phone||"").trim();
  if(!pickupPhone)redirect(url("delivery_error=pickup_contact"));

  const draft:DeliveryDraft={
    pickup:{address:setup.location_address,latitude:Number(setup.location_latitude),longitude:Number(setup.location_longitude),contactName:setup.location_name||setup.supplier_name,contactPhone:pickupPhone,contactEmail:setup.supplier_email},
    destination:{address:destinationAddress,latitude,longitude,contactName:[setup.first_name,setup.last_name].filter(Boolean).join(" "),contactPhone:recipientPhone,contactEmail:setup.user_email},
    shipment:{weightKg,lengthM,widthM,heightM,cargoType,loaders,title:`Материалы ${setup.supplier_name_snapshot}`.slice(0,200),costRub:(Number(setup.goods_subtotal_minor)/100).toFixed(2),currency:setup.currency,externalOrderId:setup.order_id},
  };

  let offers:YandexOffer[];
  try{offers=await calculateYandexOffers(draft);}catch(error){console.error("Ошибка расчёта Яндекс Доставки:",error);redirect(url("delivery_error=provider"));}
  const usable=offers.filter(offer=>offer.payload&&Number.isFinite(Number(offer.price.total_price_with_vat))&&validFutureDate(offer.offer_ttl));
  if(usable.length===0)redirect(url("delivery_error=no_offers"));

  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const active=await client.query<{id:string;status:string;provider_claim_id:string|null}>(`SELECT id,status,provider_claim_id FROM public.material_delivery_requests WHERE order_id=$1::uuid AND status NOT IN ('cancelled','failed') LIMIT 1 FOR UPDATE`,[orderId]);
    const existing=active.rows[0];
    if(existing){
      if(["draft","offers_ready"].includes(existing.status)&&!existing.provider_claim_id)await client.query(`DELETE FROM public.material_delivery_requests WHERE id=$1::uuid`,[existing.id]);
      else{await client.query("COMMIT");revalidateMaterials(projectId);redirect(url("delivery=existing"));}
    }

    const requestResult=await client.query<{id:string}>(`
      INSERT INTO public.material_delivery_requests(
        order_id,supplier_location_id,created_by,status,pickup_name_snapshot,pickup_address_snapshot,pickup_latitude,pickup_longitude,
        pickup_contact_name,pickup_contact_phone,pickup_contact_email,destination_address,destination_latitude,destination_longitude,
        recipient_name,recipient_phone,recipient_email,shipment_weight_kg,shipment_length_m,shipment_width_m,shipment_height_m,cargo_type,cargo_loaders
      ) VALUES($1::uuid,$2::uuid,$3::uuid,'offers_ready',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING id
    `,[orderId,supplierLocationId,activeUser.user.id,setup.location_name,setup.location_address,Number(setup.location_latitude),Number(setup.location_longitude),setup.location_name||setup.supplier_name,pickupPhone,setup.supplier_email,destinationAddress,latitude,longitude,draft.destination.contactName,recipientPhone,setup.user_email,weightKg,lengthM,widthM,heightM,cargoType,loaders]);
    const requestId=requestResult.rows[0]?.id;if(!requestId)throw new Error("Delivery request was not created");
    for(const offer of usable){await client.query(`
      INSERT INTO public.material_delivery_offers(delivery_request_id,taxi_class,description,total_price_minor,total_price_with_vat_minor,base_price_minor,currency,pickup_from,pickup_to,delivery_from,delivery_to,provider_payload,expires_at)
      VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    `,[requestId,offer.taxi_class,offer.description??null,toMinor(offer.price.total_price),toMinor(offer.price.total_price_with_vat),toMinor(offer.price.base_price),offer.price.currency,asDateOrNull(offer.pickup_interval?.from),asDateOrNull(offer.pickup_interval?.to),asDateOrNull(offer.delivery_interval?.from),asDateOrNull(offer.delivery_interval?.to),offer.payload,new Date(offer.offer_ttl)]);}
    await client.query("COMMIT");
  }catch(error){
    if(isRedirect(error))throw error;
    await client.query("ROLLBACK");
    if((error as PgError).code==="23505")redirect(url("delivery=existing"));
    console.error("Ошибка сохранения вариантов доставки:",error);redirect(url("delivery_error=save"));
  }finally{client.release();}

  revalidateMaterials(projectId);redirect(url("delivery=offers"));
}

export async function createMaterialDeliveryClaim(formData:FormData):Promise<never>{
  const requestId=uuid(formData.get("requestId"));const offerId=uuid(formData.get("offerId"));
  if(!requestId||!offerId)redirect("/dashboard");
  const activeUser=await requireCustomer();
  const request=await loadCustomerRequest(requestId,activeUser.user.id);
  if(!request)redirect("/dashboard");
  const url=(query:string)=>materialUrl(request.project_id,query,"customer");
  if(request.provider_claim_id)redirect(url("delivery=claim_created"));
  if(request.status!=="offers_ready")redirect(url("delivery_error=status"));
  if(request.selected_offer_id&&request.selected_offer_id!==offerId)redirect(url("delivery_error=offer"));

  const offerResult=await db.query<OfferRow>(`SELECT id,provider_payload,expires_at FROM public.material_delivery_offers WHERE id=$1::uuid AND delivery_request_id=$2::uuid LIMIT 1`,[offerId,requestId]);
  const offer=offerResult.rows[0];
  if(!offer||new Date(offer.expires_at).getTime()<=Date.now())redirect(url("delivery_error=offer_expired"));
  const providerRequestId=request.provider_request_id||randomUUID();

  const locked=await db.query<{id:string}>(`
    UPDATE public.material_delivery_requests SET provider_request_id=COALESCE(provider_request_id,$3::uuid),selected_offer_id=COALESCE(selected_offer_id,$2::uuid),updated_at=now()
    WHERE id=$1::uuid AND status='offers_ready' AND (selected_offer_id IS NULL OR selected_offer_id=$2::uuid)
    RETURNING id
  `,[requestId,offerId,providerRequestId]);
  if(!locked.rows[0])redirect(url("delivery_error=offer"));
  await db.query(`UPDATE public.material_delivery_offers SET selected_at=COALESCE(selected_at,now()) WHERE id=$1::uuid`,[offerId]);

  let claim:YandexClaimInfo;
  try{claim=await createYandexClaim(toDraft(request),offer.provider_payload,providerRequestId);}catch(error){console.error("Ошибка создания заявки Яндекс Доставки:",error);redirect(url("delivery_error=claim"));}
  const version=claim.version??claim.revision??null;
  const mapped=mapYandexStatus(claim.status);
  const localStatus:ClaimCreationState=mapped==="failed"||mapped==="cancelled"?mapped:"claim_created";
  await db.query(`UPDATE public.material_delivery_requests SET status=$2::varchar,provider_claim_id=$3,provider_status=$4,provider_version=$5,provider_error=NULL,claim_created_at=COALESCE(claim_created_at,now()),updated_at=now() WHERE id=$1::uuid`,[requestId,localStatus,claim.id,claim.status,version]);
  revalidateMaterials(request.project_id);redirect(url(mapped==="failed"||mapped==="cancelled"?"delivery_error=claim_status":"delivery=claim_created"));
}

export async function acceptMaterialDeliveryClaim(formData:FormData):Promise<never>{
  const requestId=uuid(formData.get("requestId"));if(!requestId)redirect("/dashboard");
  const activeUser=await requireCustomer();
  const request=await loadCustomerRequest(requestId,activeUser.user.id);if(!request)redirect("/dashboard");
  const url=(query:string)=>materialUrl(request.project_id,query,"customer");
  if(["accepted","in_delivery","delivered"].includes(request.status))redirect(url("delivery=accepted"));
  if(request.status!=="claim_created"||!request.provider_claim_id)redirect(url("delivery_error=status"));

  let info:YandexClaimInfo;
  try{info=await getYandexClaimInfo(request.provider_claim_id);}catch(error){console.error("Ошибка проверки заявки Яндекс Доставки:",error);redirect(url("delivery_error=provider"));}
  const current=mapYandexStatus(info.status);
  if(current==="failed"||current==="cancelled"){await persistProviderState(request.id,request.order_id,info);revalidateMaterials(request.project_id);redirect(url("delivery_error=claim_status"));}
  if(current==="accepted"||current==="in_delivery"||current==="delivered"){await persistProviderState(request.id,request.order_id,info);revalidateMaterials(request.project_id);redirect(url("delivery=accepted"));}
  if(info.status!=="ready_for_approval")redirect(url("delivery_error=not_ready"));
  const version=Number(info.version??request.provider_version);if(!Number.isFinite(version))redirect(url("delivery_error=version"));

  let accepted:YandexClaimInfo;
  try{accepted=await acceptYandexClaim(request.provider_claim_id,version);}catch(error){console.error("Ошибка подтверждения Яндекс Доставки:",error);redirect(url("delivery_error=accept"));}
  await persistProviderState(request.id,request.order_id,{...accepted,status:"accepted"});
  revalidateMaterials(request.project_id);redirect(url("delivery=accepted"));
}

export async function refreshMaterialDeliveryStatus(formData:FormData):Promise<never>{
  const requestId=uuid(formData.get("requestId"));if(!requestId)redirect("/dashboard");
  const activeUser=await requireActiveUser();if(!activeUser.success)redirect("/login");
  if(activeUser.profile.role!=="customer"&&activeUser.profile.role!=="contractor")redirect("/dashboard");
  const role=activeUser.profile.role as MaterialRole;
  const base=await db.query<{id:string;order_id:string;project_id:string;provider_claim_id:string|null}>(`SELECT mdr.id,mdr.order_id,mo.project_id,mdr.provider_claim_id FROM public.material_delivery_requests mdr JOIN public.material_orders mo ON mo.id=mdr.order_id WHERE mdr.id=$1::uuid LIMIT 1`,[requestId]);
  const request=base.rows[0];if(!request)redirect("/dashboard");
  const ctx=await getMaterialProjectParticipant(request.project_id,activeUser.user.id,activeUser.profile.role);if(!ctx.success)redirect("/dashboard");
  const url=(query:string)=>materialUrl(request.project_id,query,role);
  if(!request.provider_claim_id)redirect(url("delivery_error=status"));
  let info:YandexClaimInfo;
  try{info=await getYandexClaimInfo(request.provider_claim_id);}catch(error){console.error("Ошибка обновления статуса Яндекс Доставки:",error);redirect(url("delivery_error=provider"));}
  await persistProviderState(request.id,request.order_id,info);
  revalidateMaterials(request.project_id);redirect(url("delivery=refreshed"));
}

async function loadCustomerRequest(requestId:string,customerId:string){
  const result=await db.query<RequestRow>(`
    SELECT mdr.*,mo.project_id,mo.goods_subtotal_minor,mo.currency,mo.supplier_name_snapshot,p.customer_id
    FROM public.material_delivery_requests mdr
    JOIN public.material_orders mo ON mo.id=mdr.order_id
    JOIN public.projects p ON p.id=mo.project_id
    WHERE mdr.id=$1::uuid AND p.customer_id=$2::uuid AND p.is_admin_blocked=false
    LIMIT 1
  `,[requestId,customerId]);
  return result.rows[0]??null;
}

function toDraft(request:RequestRow):DeliveryDraft{return{
  pickup:{address:request.pickup_address_snapshot,latitude:Number(request.pickup_latitude),longitude:Number(request.pickup_longitude),contactName:request.pickup_contact_name,contactPhone:request.pickup_contact_phone,contactEmail:request.pickup_contact_email},
  destination:{address:request.destination_address,latitude:Number(request.destination_latitude),longitude:Number(request.destination_longitude),contactName:request.recipient_name,contactPhone:request.recipient_phone,contactEmail:request.recipient_email},
  shipment:{weightKg:Number(request.shipment_weight_kg),lengthM:Number(request.shipment_length_m),widthM:Number(request.shipment_width_m),heightM:Number(request.shipment_height_m),cargoType:request.cargo_type,loaders:Number(request.cargo_loaders) as 0|1|2,title:`Материалы ${request.supplier_name_snapshot}`.slice(0,200),costRub:(Number(request.goods_subtotal_minor)/100).toFixed(2),currency:request.currency,externalOrderId:request.order_id},
};}

async function persistProviderState(requestId:string,orderId:string,info:YandexClaimInfo){
  const mapped=mapYandexStatus(info.status);const version=info.version??info.revision??null;
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const localResult=await client.query<{status:string}>(`SELECT status FROM public.material_delivery_requests WHERE id=$1::uuid FOR UPDATE`,[requestId]);
    const current=localResult.rows[0]?.status;if(!current){await client.query("ROLLBACK");return;}
    const next=nextState(current,mapped);
    await client.query(`
      UPDATE public.material_delivery_requests SET status=$2::varchar,provider_status=$3,provider_version=$4,provider_error=NULL,
        accepted_at=CASE WHEN $2::varchar IN ('accepted','in_delivery','delivered') THEN COALESCE(accepted_at,now()) ELSE accepted_at END,
        picked_up_at=CASE WHEN $2::varchar IN ('in_delivery','delivered') THEN COALESCE(picked_up_at,now()) ELSE picked_up_at END,
        delivered_at=CASE WHEN $2::varchar='delivered' THEN COALESCE(delivered_at,now()) ELSE delivered_at END,
        cancelled_at=CASE WHEN $2::varchar='cancelled' THEN COALESCE(cancelled_at,now()) ELSE cancelled_at END,
        updated_at=now()
      WHERE id=$1::uuid
    `,[requestId,next,info.status,version]);
    if(["accepted","in_delivery","delivered"].includes(next))await advanceOrder(client,orderId,next as "accepted"|"in_delivery"|"delivered");
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}

async function advanceOrder(client:PoolClient,orderId:string,target:"accepted"|"in_delivery"|"delivered"){
  const result=await client.query<{status:string}>(`SELECT status FROM public.material_orders WHERE id=$1::uuid FOR UPDATE`,[orderId]);let status=result.rows[0]?.status;if(!status||["completed","cancelled","refunded"].includes(status))return;
  if(["paid","supplier_confirmed"].includes(status)){await client.query(`UPDATE public.material_orders SET status='delivery_pending',updated_at=now() WHERE id=$1::uuid`,[orderId]);status="delivery_pending";}
  if((target==="in_delivery"||target==="delivered")&&status==="delivery_pending"){await client.query(`UPDATE public.material_orders SET status='in_delivery',updated_at=now() WHERE id=$1::uuid`,[orderId]);status="in_delivery";}
  if(target==="delivered"&&status==="in_delivery")await client.query(`UPDATE public.material_orders SET status='delivered',updated_at=now() WHERE id=$1::uuid`,[orderId]);
}

function nextState(current:string,mapped:DeliveryState){
  if(["failed","cancelled","delivered"].includes(current))return current;
  if(mapped==="cancelled"||mapped==="failed")return mapped;
  const rank:Record<string,number>={draft:0,offers_ready:1,claim_created:2,accepted:3,in_delivery:4,delivered:5};
  return (rank[mapped]??0)>(rank[current]??0)?mapped:current;
}

async function requireCustomer(){const activeUser=await requireActiveUser();if(!activeUser.success)redirect("/login");if(activeUser.profile.role!=="customer")redirect("/dashboard");return activeUser;}
function uuid(value:FormDataEntryValue|null){const v=String(value??"").trim();return/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)?v:null;}
function finite(value:FormDataEntryValue|null){const raw=String(value??"").trim();if(!raw)return null;const n=Number(raw);return Number.isFinite(n)?n:null;}
function positive(value:FormDataEntryValue|null){const n=finite(value);return n!==null&&n>0?n:null;}
function cargo(value:FormDataEntryValue|null){const v=String(value??"");return ["van","lcv_m","lcv_l","lcv_xl"].includes(v)?v as CargoType:null;}
function loaderCount(value:FormDataEntryValue|null){const raw=String(value??"").trim();if(!raw&&raw!=="0")return null;const n=Number(raw);return [0,1,2].includes(n)?n as 0|1|2:null;}
function validFutureDate(value:string){const time=new Date(value).getTime();return Number.isFinite(time)&&time>Date.now();}
function asDateOrNull(value?:string){if(!value)return null;const d=new Date(value);return Number.isFinite(d.getTime())?d:null;}
function toMinor(value:string){const amount=Number(value);if(!Number.isFinite(amount)||amount<0)throw new Error("Invalid Yandex delivery price");return Math.round(amount*100);}
function materialUrl(projectId:string,query:string,role:MaterialRole){return`/${role}/work/${projectId}/materials?${query}`;}
function revalidateMaterials(projectId:string){revalidatePath(`/customer/work/${projectId}/materials`);revalidatePath(`/contractor/work/${projectId}/materials`);}
function isRedirect(error:unknown){return typeof error==="object"&&error!==null&&"digest" in error&&String((error as{digest?:unknown}).digest).startsWith("NEXT_REDIRECT");}
