import "server-only";
import { db } from "@/lib/db/pool";

export async function getPublicMarketplaceContractor(contractorId:string){
 const companyResult=await db.query<{id:string;public_name:string;legal_name:string|null;company_type:string;inn:string|null;ogrn:string|null;description:string|null;founded_year:number|null;employee_count:number|null;rating:number|string;rating_count:number;completed_projects_count:number;recommendation_score:number|string;raw_score:number|string;confidence_percent:number|string;confidence_level:"low"|"medium"|"high";confidence_explanation:string;verified_at:string|Date|null;insurance_provider:string|null;insurance_expires_at:string|null;license_summary:string|null;minimum_project_budget:number|string|null;maximum_project_budget:number|string|null}>(`
   SELECT cc.id,cc.public_name,cc.legal_name,cc.company_type,cc.inn,cc.ogrn,cc.description,cc.founded_year,cc.employee_count,
     cc.rating,cc.rating_count,cc.completed_projects_count,
     score.stroyselect_score AS recommendation_score,score.raw_score,score.confidence_percent,score.confidence_level,score.confidence_explanation,
     cc.verified_at,cc.insurance_provider,cc.insurance_expires_at::text,cc.license_summary,cc.minimum_project_budget,cc.maximum_project_budget
   FROM public.contractor_companies cc
   JOIN public.contractor_score_maturity score ON score.contractor_id=cc.id
   WHERE cc.id=$1::uuid AND cc.verification_status::text='verified'
   LIMIT 1
 `,[contractorId]);
 const company=companyResult.rows[0];if(!company)return null;
 const [servicesResult,areasResult,portfolioResult,trustResult]=await Promise.all([
 db.query<{category_id:number;name:string;slug:string}>(`SELECT sc.id category_id,sc.name,sc.slug FROM public.contractor_services cs JOIN public.service_categories sc ON sc.id=cs.category_id WHERE cs.contractor_id=$1::uuid AND sc.is_active=true ORDER BY cs.is_primary DESC,sc.name`,[contractorId]),
 db.query<{city:string;region:string|null;is_primary:boolean}>(`SELECT city,region,is_primary FROM public.contractor_service_areas WHERE contractor_id=$1::uuid ORDER BY is_primary DESC,city`,[contractorId]),
 db.query<{id:string;title:string;description:string|null;city:string|null;completed_year:number|null}>(`SELECT id,title,description,city,completed_year FROM public.contractor_portfolio_projects WHERE contractor_id=$1::uuid ORDER BY completed_year DESC NULLS LAST,created_at DESC LIMIT 12`,[contractorId]),
 db.query<{verified_documents:string|number;active_credentials:string|number}>(`SELECT COUNT(*) FILTER(WHERE status='verified') verified_documents,COUNT(*) FILTER(WHERE status='verified' AND (expires_at IS NULL OR expires_at>=current_date)) active_credentials FROM public.contractor_verification_documents WHERE contractor_id=$1::uuid`,[contractorId])]);
 const trust=trustResult.rows[0];
 return {id:company.id,publicName:company.public_name,legalName:company.legal_name,companyType:company.company_type,inn:company.inn,ogrn:company.ogrn,description:company.description,foundedYear:company.founded_year,employeeCount:company.employee_count,rating:number(company.rating),ratingCount:Math.max(0,Number(company.rating_count)||0),completedProjectsCount:Math.max(0,Number(company.completed_projects_count)||0),recommendationScore:number(company.recommendation_score),rawScore:number(company.raw_score),scoreConfidencePercent:Math.max(0,Math.min(100,Number(company.confidence_percent)||0)),scoreConfidenceLevel:company.confidence_level,scoreConfidenceExplanation:company.confidence_explanation,verifiedAt:company.verified_at,insuranceProvider:company.insurance_provider,insuranceExpiresAt:company.insurance_expires_at,licenseSummary:company.license_summary,minimumProjectBudget:nullableNumber(company.minimum_project_budget),maximumProjectBudget:nullableNumber(company.maximum_project_budget),verifiedDocuments:Math.max(0,Number(trust?.verified_documents)||0),activeCredentials:Math.max(0,Number(trust?.active_credentials)||0),services:servicesResult.rows,areas:areasResult.rows,portfolio:portfolioResult.rows};
}
function number(value:unknown){const n=Number(value);return Number.isFinite(n)?n:0}
function nullableNumber(value:unknown){if(value===null||value===undefined||value==="")return null;const n=Number(value);return Number.isFinite(n)?n:null}
