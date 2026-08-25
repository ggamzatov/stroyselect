import "server-only";

import { notFound } from "next/navigation";
import { db } from "@/lib/db/pool";

type CompanyRow = {
  id: string; owner_id: string; public_name: string; legal_name: string | null; company_type: string | null; inn: string | null; ogrn: string | null;
  founded_year: number | null; employee_count: number | null; description: string | null; minimum_project_budget: number | string | null;
  maximum_project_budget: number | string | null; accepts_new_projects: boolean; contact_phone: string | null; contact_email: string | null;
  website: string | null; telegram: string | null; verification_status: string;
  contractor_services: Array<{category_id:number;years_experience:number|null;is_primary:boolean;service_categories:{id:number;name:string;slug:string}|null}>;
  contractor_service_areas: Array<{id:string;city:string;region:string|null;travel_radius_km:number|null;is_primary:boolean}>;
};

type ScoreRow = {
  raw_score: number;
  stroyselect_score: number;
  confidence_percent: number;
  confidence_level: string;
  confidence_explanation: string;
  score_cap: number;
  verification_points: number;
  reviews_points: number;
  projects_points: number;
  profile_points: number;
  services_points: number;
  geography_points: number;
  portfolio_points: number;
  proposal_points: number;
  review_count: number;
  completed_projects_count: number;
  bid_count: number;
};

type ScoreHistoryRow = {
  id: string;
  raw_score: number;
  stroyselect_score: number;
  confidence_percent: number;
  confidence_level: string;
  components: Record<string, number>;
  evidence: Record<string, unknown>;
  created_at: Date | string;
};

export async function getContractorReview(contractorId: string) {
  try {
    const companyResult = await db.query<CompanyRow>(`
      SELECT cc.*,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('category_id',cs.category_id::int,'years_experience',cs.years_experience,'is_primary',cs.is_primary,'service_categories',jsonb_build_object('id',sc.id::int,'name',sc.name,'slug',sc.slug)) ORDER BY cs.is_primary DESC,sc.name) FROM public.contractor_services cs LEFT JOIN public.service_categories sc ON sc.id=cs.category_id WHERE cs.contractor_id=cc.id),'[]'::jsonb) AS contractor_services,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id',csa.id::text,'city',csa.city,'region',csa.region,'travel_radius_km',csa.travel_radius_km,'is_primary',csa.is_primary) ORDER BY csa.is_primary DESC,csa.city) FROM public.contractor_service_areas csa WHERE csa.contractor_id=cc.id),'[]'::jsonb) AS contractor_service_areas
      FROM public.contractor_companies cc WHERE cc.id=$1::uuid LIMIT 1
    `,[contractorId]);
    const company=companyResult.rows[0]; if(!company) notFound();

    const [ownerResult,logsResult,historyResult,registryResult,matchResult,scoreResult,scoreHistoryResult]=await Promise.all([
      db.query<{id:string;first_name:string|null;last_name:string|null;phone:string|null;city:string|null;created_at:Date|string}>(`SELECT id,first_name,last_name,phone,city,created_at FROM public.profiles WHERE id=$1::uuid LIMIT 1`,[company.owner_id]),
      db.query<{id:string;previous_status:string;new_status:string;comment:string|null;created_at:Date|string;admin_id:string}>(`SELECT id,COALESCE(previous_status::text,'') AS previous_status,new_status::text AS new_status,comment,created_at,admin_id FROM public.contractor_verification_logs WHERE contractor_id=$1::uuid ORDER BY created_at DESC`,[contractorId]),
      db.query<{id:string;changed_fields:string[];before_data:Record<string,unknown>;after_data:Record<string,unknown>;created_at:Date|string}>(`SELECT id,changed_fields,before_data,after_data,created_at FROM public.contractor_profile_history WHERE contractor_id=$1::uuid ORDER BY created_at DESC LIMIT 50`,[contractorId]),
      db.query<{id:string;source:string;identifier_type:string;identifier_value:string;status:string;checked_at:Date|string;review_note:string|null}>(`SELECT id,source,identifier_type,identifier_value,status,checked_at,review_note FROM public.contractor_registry_checks WHERE contractor_id=$1::uuid ORDER BY checked_at DESC LIMIT 30`,[contractorId]),
      db.query<{id:string;match_type:string;match_value:string;status:string;other_id:string;other_name:string}>(`SELECT m.id,m.match_type,m.match_value,m.status,CASE WHEN m.contractor_a_id=$1::uuid THEN b.id ELSE a.id END AS other_id,CASE WHEN m.contractor_a_id=$1::uuid THEN b.public_name ELSE a.public_name END AS other_name FROM public.contractor_entity_matches m JOIN public.contractor_companies a ON a.id=m.contractor_a_id JOIN public.contractor_companies b ON b.id=m.contractor_b_id WHERE (m.contractor_a_id=$1::uuid OR m.contractor_b_id=$1::uuid) AND m.status='open' ORDER BY m.created_at DESC`,[contractorId]),
      db.query<ScoreRow>(`SELECT raw_score,stroyselect_score,confidence_percent,confidence_level,confidence_explanation,score_cap,verification_points,reviews_points,projects_points,profile_points,services_points,geography_points,portfolio_points,proposal_points,review_count,completed_projects_count,bid_count FROM public.contractor_score_maturity WHERE contractor_id=$1::uuid LIMIT 1`,[contractorId]),
      db.query<ScoreHistoryRow>(`SELECT id,raw_score,stroyselect_score,confidence_percent,confidence_level,components,evidence,created_at FROM public.contractor_score_history WHERE contractor_id=$1::uuid ORDER BY created_at DESC LIMIT 30`,[contractorId])
    ]);

    const owner=ownerResult.rows[0]?{...ownerResult.rows[0],created_at:toIsoString(ownerResult.rows[0].created_at)}:null;
    const logs=logsResult.rows.map(log=>({...log,created_at:toIsoString(log.created_at)}));
    const profileChanges=historyResult.rows.map(row=>({...row,created_at:toIsoString(row.created_at)}));
    const registryChecks=registryResult.rows.map(row=>({...row,checked_at:toIsoString(row.checked_at)}));
    const scoreHistory=scoreHistoryResult.rows.map(row=>({...row,created_at:toIsoString(row.created_at)}));
    return {company,owner,logs,profileChanges,registryChecks,openMatches:matchResult.rows,score:scoreResult.rows[0]??null,scoreHistory};
  } catch(error){console.error("Ошибка загрузки подрядчика:",error);throw new Error("Не удалось загрузить профиль подрядчика")}
}

function toIsoString(value:Date|string){return value instanceof Date?value.toISOString():String(value)}
