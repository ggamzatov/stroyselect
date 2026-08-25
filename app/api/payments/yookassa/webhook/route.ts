import { NextResponse } from "next/server";

import { processVerifiedYooKassaPayment } from "@/lib/payments/yookassa-payment-events";
import { processVerifiedYooKassaPayout, processVerifiedYooKassaRefund } from "@/lib/payments/yookassa-finance-events";
import { getYooKassaObject, isYooKassaConfigured } from "@/lib/payments/yookassa";

type WebhookBody={event?:string;object?:{id?:string}};
type Money={value:string;currency:string};
type PaymentObject={id:string;status:string;paid?:boolean;amount:Money;metadata?:Record<string,string>;payment_method?:{id?:string;saved?:boolean}};
type RefundObject={id:string;status:string;amount:Money;payment_id?:string;metadata?:Record<string,string>};
type PayoutObject={id:string;status:string;amount:Money;metadata?:Record<string,string>;deal?:{id?:string};cancellation_details?:{party?:string;reason?:string}};

const PAYMENT_EVENTS=new Set(["payment.waiting_for_capture","payment.succeeded","payment.canceled"]);
const PAYOUT_EVENTS=new Set(["payout.succeeded","payout.canceled"]);

export async function POST(request:Request){
  if(!isYooKassaConfigured())return NextResponse.json({ok:false,error:"provider_not_configured"},{status:503});

  let incoming:WebhookBody;
  try{incoming=await request.json() as WebhookBody;}catch{return NextResponse.json({ok:false,error:"invalid_json"},{status:400});}
  const event=String(incoming.event??"").trim();
  const objectId=String(incoming.object?.id??"").trim();
  if(!event||!objectId)return NextResponse.json({ok:false,error:"invalid_notification"},{status:400});

  if(event==="deal.closed")return NextResponse.json({ok:true,ignored:"deal_closed"});
  if(!PAYMENT_EVENTS.has(event)&&event!=="refund.succeeded"&&!PAYOUT_EVENTS.has(event)){
    return NextResponse.json({ok:true,ignored:"unsupported_event"});
  }

  const objectType=PAYMENT_EVENTS.has(event)?"payment":event==="refund.succeeded"?"refund":"payout";
  let loaded:Record<string,unknown>&{id?:string;status?:string};
  try{
    loaded=await getYooKassaObject(objectType,objectId);
  }catch(error){
    console.error("Не удалось перепроверить объект YooKassa webhook",{event,objectId,error:error instanceof Error?error.message:"provider_error"});
    return NextResponse.json({ok:false,error:"provider_verification_failed"},{status:502});
  }
  if(loaded.id!==objectId||typeof loaded.status!=="string")return NextResponse.json({ok:false,error:"provider_payload"},{status:502});

  if(objectType==="payment"){
    if(!hasMoney(loaded))return NextResponse.json({ok:false,error:"provider_payload"},{status:502});
    return processVerifiedYooKassaPayment(loaded as unknown as PaymentObject,objectId);
  }
  if(objectType==="refund"){
    if(!hasMoney(loaded)||loaded.status!=="succeeded")return NextResponse.json({ok:false,error:"provider_payload"},{status:502});
    return processVerifiedYooKassaRefund(loaded as unknown as RefundObject,objectId);
  }
  if(!hasMoney(loaded)||!['succeeded','canceled'].includes(loaded.status))return NextResponse.json({ok:false,error:"provider_payload"},{status:502});
  return processVerifiedYooKassaPayout(loaded as unknown as PayoutObject,objectId);
}

function hasMoney(value:Record<string,unknown>):value is Record<string,unknown>&{amount:Money}{
  const amount=value.amount;
  if(!amount||typeof amount!=="object")return false;
  const candidate=amount as Record<string,unknown>;
  return typeof candidate.value==="string"&&typeof candidate.currency==="string";
}
