import "server-only";

const BASE="https://b2b.taxi.yandex.net/b2b/cargo/integration/v2";

type MockClaim={status:string;version:number};
type MockGlobal=typeof globalThis&{__stroyselectYandexClaims?:Map<string,MockClaim>};

export type DeliveryDraft={
  pickup:{address:string;latitude:number;longitude:number;contactName:string;contactPhone:string;contactEmail:string|null};
  destination:{address:string;latitude:number;longitude:number;contactName:string;contactPhone:string;contactEmail:string|null};
  shipment:{weightKg:number;lengthM:number;widthM:number;heightM:number;cargoType:"van"|"lcv_m"|"lcv_l"|"lcv_xl";loaders:0|1|2;title:string;costRub:string;currency:string;externalOrderId:string};
};
export type YandexOffer={price:{total_price:string;total_price_with_vat:string;base_price:string;currency:string};taxi_class:string;pickup_interval?:{from?:string;to?:string};delivery_interval?:{from?:string;to?:string};description?:string;payload:string;offer_ttl:string};
export type YandexClaimInfo={id:string;status:string;version?:number;revision?:number};

export function yandexDeliveryConfigured(){return Boolean(process.env.YANDEX_DELIVERY_TOKEN?.trim())||mockEnabled();}

export async function calculateYandexOffers(draft:DeliveryDraft):Promise<YandexOffer[]>{
  if(mockEnabled())return mockOffers();
  const body={
    items:[{size:{length:draft.shipment.lengthM,width:draft.shipment.widthM,height:draft.shipment.heightM},weight:draft.shipment.weightKg,quantity:1,pickup_point:1,dropoff_point:2,age_restricted:false}],
    route_points:[
      {id:1,coordinates:[draft.pickup.longitude,draft.pickup.latitude],fullname:draft.pickup.address,country:"Россия"},
      {id:2,coordinates:[draft.destination.longitude,draft.destination.latitude],fullname:draft.destination.address,country:"Россия"},
    ],
    requirements:{taxi_classes:["cargo"],cargo_type:draft.shipment.cargoType,cargo_loaders:draft.shipment.loaders,pro_courier:false,skip_door_to_door:false,rental_duration:0},
  };
  const response=await yandexFetch("/offers/calculate",{method:"POST",body:JSON.stringify(body)});
  const json=await response.json() as {offers?:YandexOffer[]};
  return Array.isArray(json.offers)?json.offers:[];
}

export async function createYandexClaim(draft:DeliveryDraft,offerPayload:string,requestId:string):Promise<YandexClaimInfo>{
  if(mockEnabled()){
    const id=`e2e-${requestId.replace(/-/g,"")}`;mockClaims().set(id,{status:"ready_for_approval",version:1});return{id,status:"ready_for_approval",version:1};
  }
  const body={
    items:[{
      extra_id:draft.shipment.externalOrderId,pickup_point:1,dropoff_point:2,title:draft.shipment.title,
      size:{length:draft.shipment.lengthM,width:draft.shipment.widthM,height:draft.shipment.heightM},weight:draft.shipment.weightKg,
      cost_value:draft.shipment.costRub,cost_currency:draft.shipment.currency,quantity:1,age_restricted:false,
    }],
    route_points:[
      {point_id:1,visit_order:1,type:"source",contact:{name:draft.pickup.contactName,phone:normalizePhone(draft.pickup.contactPhone),...(draft.pickup.contactEmail?{email:draft.pickup.contactEmail}:{})},address:{fullname:draft.pickup.address,coordinates:[draft.pickup.longitude,draft.pickup.latitude],country:"Россия"},external_order_id:draft.shipment.externalOrderId,external_order_cost:{value:draft.shipment.costRub,currency:draft.shipment.currency}},
      {point_id:2,visit_order:2,type:"destination",contact:{name:draft.destination.contactName,phone:normalizePhone(draft.destination.contactPhone),...(draft.destination.contactEmail?{email:draft.destination.contactEmail}:{})},address:{fullname:draft.destination.address,coordinates:[draft.destination.longitude,draft.destination.latitude],country:"Россия"},external_order_id:draft.shipment.externalOrderId,external_order_cost:{value:draft.shipment.costRub,currency:draft.shipment.currency}},
    ],
    client_requirements:{taxi_class:"cargo",cargo_type:draft.shipment.cargoType,cargo_loaders:draft.shipment.loaders,pro_courier:false,rental_duration:0},
    skip_door_to_door:false,comment:"Доставка стройматериалов StroySelect",referral_source:"stroyselect",optional_return:false,offer_payload:offerPayload,
  };
  const response=await yandexFetch(`/claims/create?request_id=${encodeURIComponent(requestId)}`,{method:"POST",body:JSON.stringify(body)});
  return response.json() as Promise<YandexClaimInfo>;
}

export async function getYandexClaimInfo(claimId:string):Promise<YandexClaimInfo>{
  if(mockEnabled()){
    const stored=mockClaims().get(claimId);
    if(!stored)return{id:claimId,status:"pickuped",version:2};
    if(stored.status==="accepted"){stored.status="pickuped";stored.version+=1;mockClaims().set(claimId,stored);}
    return{id:claimId,status:stored.status,version:stored.version};
  }
  const response=await yandexFetch(`/claims/info?claim_id=${encodeURIComponent(claimId)}`,{method:"POST"});
  return response.json() as Promise<YandexClaimInfo>;
}

export async function acceptYandexClaim(claimId:string,version:number):Promise<YandexClaimInfo>{
  if(mockEnabled()){const next={status:"accepted",version:version+1};mockClaims().set(claimId,next);return{id:claimId,...next};}
  const response=await yandexFetch(`/claims/accept?claim_id=${encodeURIComponent(claimId)}`,{method:"POST",body:JSON.stringify({version})});
  return response.json() as Promise<YandexClaimInfo>;
}

export function mapYandexStatus(status:string){
  if(["cancelled","cancelled_with_payment","cancelled_by_taxi","cancelled_with_items_on_hands"].includes(status))return"cancelled" as const;
  if(["failed","performer_not_found","estimating_failed"].includes(status))return"failed" as const;
  if(["delivered","delivered_finish"].includes(status))return"delivered" as const;
  if(["pickuped","delivery_arrived","ready_for_delivery_confirmation"].includes(status))return"in_delivery" as const;
  if(["accepted","performer_lookup","performer_draft","performer_found","pickup_arrived","ready_for_pickup_confirmation"].includes(status))return"accepted" as const;
  return"claim_created" as const;
}

async function yandexFetch(path:string,init:RequestInit){
  const token=process.env.YANDEX_DELIVERY_TOKEN?.trim();
  if(!token)throw new Error("YANDEX_DELIVERY_TOKEN is not configured");
  const response=await fetch(`${BASE}${path}`,{...init,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json","Accept-Language":"ru",...(init.headers??{})},cache:"no-store"});
  if(!response.ok){const text=await response.text().catch(()=>"");throw new Error(`Yandex Delivery ${path} failed: ${response.status} ${text.slice(0,500)}`)}
  return response;
}

function normalizePhone(value:string){const digits=value.replace(/[^\d]/g,"");return digits?`+${digits}`:value;}
function mockEnabled(){return process.env.YANDEX_DELIVERY_E2E_MOCK==="1"&&process.env.E2E_ALLOW_INSECURE_SESSION==="1";}
function mockClaims(){const scope=globalThis as MockGlobal;scope.__stroyselectYandexClaims??=new Map<string,MockClaim>();return scope.__stroyselectYandexClaims;}
function mockOffers():YandexOffer[]{const now=Date.now();const iso=(minutes:number)=>new Date(now+minutes*60_000).toISOString();return[
  {price:{total_price:"1208.33",total_price_with_vat:"1450.00",base_price:"1208.33",currency:"RUB"},taxi_class:"cargo",pickup_interval:{from:iso(10),to:iso(40)},delivery_interval:{from:iso(40),to:iso(100)},description:"E2E грузовой тариф",payload:"e2e-yandex-cargo-base",offer_ttl:iso(10)},
  {price:{total_price:"1500.00",total_price_with_vat:"1800.00",base_price:"1500.00",currency:"RUB"},taxi_class:"cargo",pickup_interval:{from:iso(10),to:iso(40)},delivery_interval:{from:iso(40),to:iso(90)},description:"E2E грузовой тариф с грузчиком",payload:"e2e-yandex-cargo-loader",offer_ttl:iso(10)},
];}
