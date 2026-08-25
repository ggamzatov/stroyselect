import { NextResponse } from "next/server";

import { db } from "@/lib/db/pool";

type Body={orderId?:string;eventType?:string;eventKey?:string;pagePath?:string};

export async function POST(request:Request){
  const origin=request.headers.get("origin");
  if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({ok:false},{status:403});
  let body:Body;try{body=await request.json() as Body;}catch{return NextResponse.json({ok:false},{status:400});}
  const orderId=String(body.orderId??"").trim();
  const eventType=String(body.eventType??"").trim();
  const eventKey=String(body.eventKey??"").trim().slice(0,128);
  const pagePath=String(body.pagePath??"").trim().slice(0,1000);
  if(!/^[0-9a-f-]{36}$/i.test(orderId)||!["impression","click"].includes(eventType)||!eventKey)return NextResponse.json({ok:false},{status:400});
  try{
    await db.query(`
      INSERT INTO public.ad_events(order_id,creative_id,event_type,event_key,page_path)
      SELECT o.id,o.creative_id,$2,$3,$4
      FROM public.ad_orders o
      JOIN public.ad_creatives cr ON cr.id=o.creative_id AND cr.status='approved' AND cr.erid IS NOT NULL
      JOIN public.ad_advertisers a ON a.id=o.advertiser_id AND a.status='verified'
      WHERE o.id=$1::uuid AND o.status='active' AND o.scheduled_from<=now() AND o.scheduled_to>now()
      ON CONFLICT DO NOTHING
    `,[orderId,eventType,eventKey,pagePath||null]);
    return new NextResponse(null,{status:204,headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("Ошибка записи события рекламы:",error);return NextResponse.json({ok:false},{status:500});}
}
