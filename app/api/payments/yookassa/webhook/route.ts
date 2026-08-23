import { db } from "@/lib/db/pool";
import { getYooKassaObject } from "@/lib/payments/yookassa";

export const dynamic = "force-dynamic";

type Notification = { type?: string; event?: string; object?: Record<string,unknown>&{id?:string;status?:string;metadata?:Record<string,unknown>} };

export async function POST(request: Request) {
  let payload: Notification;
  try { payload = await request.json() as Notification; } catch { return Response.json({ ok:false },{status:400}); }
  const event=payload.event?.trim();
  const object=payload.object;
  const objectId=object?.id?.trim();
  if(payload.type!=="notification"||!event||!objectId)return Response.json({ok:false},{status:400});

  const [kind] = event.split(".");
  if(!["payment","refund","payout","deal"].includes(kind))return Response.json({ok:true});

  try{
    const verified=await getYooKassaObject(kind as "payment"|"refund"|"payout"|"deal",objectId);
    const incomingStatus=typeof object?.status==="string"?object.status:null;
    if(incomingStatus&&verified.status&&incomingStatus!==verified.status){
      console.warn("YooKassa webhook status differs from current API object",{event,objectId,incomingStatus,currentStatus:verified.status});
    }

    const eventId=`${event}:${objectId}:${incomingStatus??verified.status??"unknown"}`;
    const inserted=await db.query<{id:string}>(`
      INSERT INTO public.payment_provider_events(provider,provider_event_id,event_type,object_type,object_id,payload)
      VALUES('yookassa',$1,$2,$3,$4,$5::jsonb)
      ON CONFLICT(provider,provider_event_id) DO NOTHING RETURNING id
    `,[eventId,event,kind,objectId,JSON.stringify(payload)]);
    if(!inserted.rows[0])return Response.json({ok:true});

    await db.query(`SELECT set_config('stroyselect.payment_source','yookassa',true)`);
    if(kind==="payment"){
      const metadata=(verified.metadata??object?.metadata??{}) as Record<string,unknown>;
      const intentId=typeof metadata.payment_intent_id==="string"?metadata.payment_intent_id:null;
      if(intentId){
        const next=verified.status==="succeeded"?"funded":verified.status==="canceled"?"cancelled":null;
        await db.query(`UPDATE public.project_payment_intents SET provider_status=$2,last_provider_event_at=now(),status=COALESCE($3,status),funded_at=CASE WHEN $3='funded' THEN COALESCE(funded_at,now()) ELSE funded_at END,updated_at=now() WHERE id=$1::uuid`,[intentId,verified.status??incomingStatus,next]);
      }else{
        await db.query(`UPDATE public.project_payment_intents SET provider_status=$2,last_provider_event_at=now(),status=CASE WHEN $2='succeeded' THEN 'funded' WHEN $2='canceled' THEN 'cancelled' ELSE status END,funded_at=CASE WHEN $2='succeeded' THEN COALESCE(funded_at,now()) ELSE funded_at END,updated_at=now() WHERE provider_payment_id=$1`,[objectId,verified.status??incomingStatus]);
      }
    }else if(kind==="payout"){
      const status=verified.status??incomingStatus;
      await db.query(`UPDATE public.project_payment_intents SET provider_status=$2,last_provider_event_at=now(),status=CASE WHEN $2='succeeded' THEN 'paid' WHEN $2='canceled' THEN 'release_ready' ELSE status END,failure_reason=CASE WHEN $2='canceled' THEN 'Выплата отменена платёжным провайдером' ELSE failure_reason END,updated_at=now() WHERE provider_payout_id=$1`,[objectId,status]);
    }else if(kind==="refund"){
      const status=verified.status??incomingStatus;
      await db.query(`UPDATE public.project_payment_intents SET provider_status=$2,last_provider_event_at=now(),status=CASE WHEN $2='succeeded' THEN 'refunded' ELSE status END,provider_refund_id=$1,updated_at=now() WHERE provider_payment_id=(SELECT payment_id FROM public.project_payment_intents WHERE provider_refund_id=$1 LIMIT 1) OR provider_refund_id=$1`,[objectId,status]);
    }else if(kind==="deal"){
      await db.query(`UPDATE public.project_payment_intents SET provider_status=$2,last_provider_event_at=now(),updated_at=now() WHERE provider_deal_id=$1`,[objectId,verified.status??incomingStatus]);
    }

    await db.query(`UPDATE public.payment_provider_events SET processed_at=now() WHERE provider='yookassa' AND provider_event_id=$1`,[eventId]);
    return Response.json({ok:true});
  }catch(error){
    console.error("YooKassa webhook processing failed",error);
    return Response.json({ok:false},{status:500});
  }
}
