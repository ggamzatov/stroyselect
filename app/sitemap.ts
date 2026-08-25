import type { MetadataRoute } from "next";
import { db } from "@/lib/db/pool";

export const dynamic="force-dynamic";

type ContractorRow={id:string;updated_at:Date|string;review_count:string|number};
type LandingRow={category_slug:string;city:string};

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=(process.env.APP_BASE_URL||process.env.NEXT_PUBLIC_APP_URL||"https://stroyselect.ru").replace(/\/$/,"");
  const staticPages=["","/contractors","/legal/terms","/legal/privacy","/legal/personal-data-consent"].map(path=>({url:`${base}${path}`,lastModified:new Date(),changeFrequency:path==="/contractors"?"daily" as const:"monthly" as const,priority:path===""?1:path==="/contractors"?0.9:0.4}));
  try{
    const [contractors,landings]=await Promise.all([
      db.query<ContractorRow>(`
        SELECT cc.id,cc.updated_at,
          (SELECT COUNT(*) FROM public.contractor_reviews cr WHERE cr.contractor_id=cc.id AND COALESCE(cr.moderation_status,'published')='published') AS review_count
        FROM public.contractor_companies cc
        WHERE cc.verification_status='verified'
        ORDER BY cc.updated_at DESC
        LIMIT 5000
      `),
      db.query<LandingRow>(`
        SELECT DISTINCT sc.slug AS category_slug,csa.city
        FROM public.contractor_services cs
        JOIN public.service_categories sc ON sc.id=cs.category_id
        JOIN public.contractor_companies cc ON cc.id=cs.contractor_id AND cc.verification_status='verified'
        JOIN public.contractor_service_areas csa ON csa.contractor_id=cc.id
        WHERE COALESCE(sc.is_active,true)=true AND sc.slug IS NOT NULL AND csa.city IS NOT NULL
        LIMIT 5000
      `),
    ]);
    return [
      ...staticPages,
      ...contractors.rows.map(row=>({url:`${base}/contractors/${row.id}`,lastModified:new Date(row.updated_at),changeFrequency:"weekly" as const,priority:0.7})),
      ...contractors.rows.filter(row=>Number(row.review_count)>0).map(row=>({url:`${base}/contractors/${row.id}/reviews`,lastModified:new Date(row.updated_at),changeFrequency:"weekly" as const,priority:0.6})),
      ...landings.rows.map(row=>({url:`${base}/services/${encodeURIComponent(row.category_slug)}/${encodeURIComponent(row.city)}`,changeFrequency:"weekly" as const,priority:0.65})),
    ];
  }catch(error){console.error("Не удалось построить динамическую часть sitemap:",error);return staticPages;}
}
