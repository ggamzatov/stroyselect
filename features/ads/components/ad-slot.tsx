import "server-only";

import { connection } from "next/server";

import { db } from "@/lib/db/pool";
import { SponsoredAd } from "@/features/ads/components/sponsored-ad";

type Row={id:string;title_snapshot:string;body_snapshot:string;destination_url_snapshot:string;advertiser_name_snapshot:string;advertiser_inn_snapshot:string;placement_name_snapshot:string;erid:string};

type Props={placement:string;city?:string|null;categorySlug?:string|null;className?:string};

export async function AdSlot({placement,city=null,categorySlug=null,className}:Props){
  await connection();
  const result=await db.query<Row>(`
    SELECT o.id,o.title_snapshot,o.body_snapshot,o.destination_url_snapshot,o.advertiser_name_snapshot,o.advertiser_inn_snapshot,o.placement_name_snapshot,cr.erid
    FROM public.ad_orders o
    JOIN public.ad_creatives cr ON cr.id=o.creative_id AND cr.status='approved'
    JOIN public.ad_advertisers a ON a.id=o.advertiser_id AND a.status='verified'
    WHERE o.status='active'
      AND o.placement_code_snapshot=$1
      AND o.scheduled_from<=now() AND o.scheduled_to>now()
      AND cr.erid IS NOT NULL AND btrim(cr.erid)<>''
      AND (o.target_city_snapshot IS NULL OR ($2::text IS NOT NULL AND lower(o.target_city_snapshot)=lower($2)))
      AND (o.target_category_slug_snapshot IS NULL OR ($3::text IS NOT NULL AND lower(o.target_category_slug_snapshot)=lower($3)))
    ORDER BY o.activated_at ASC NULLS LAST,o.id
    LIMIT 1
  `,[placement,city,categorySlug]);
  const ad=result.rows[0];if(!ad)return null;
  return <div className={className}><SponsoredAd orderId={ad.id} title={ad.title_snapshot} body={ad.body_snapshot} destinationUrl={ad.destination_url_snapshot} advertiserName={ad.advertiser_name_snapshot} advertiserInn={ad.advertiser_inn_snapshot} erid={ad.erid} placementName={ad.placement_name_snapshot}/></div>;
}
