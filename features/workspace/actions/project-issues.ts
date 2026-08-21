"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { createNotification } from "@/features/notifications/server/create-notification";

const createSchema=z.object({projectId:z.string().uuid(),stageId:z.string().uuid().optional(),title:z.string().trim().min(3).max(240),description:z.string().trim().max(3000).optional(),priority:z.enum(["low","normal","high","critical"]),dueAt:z.string().date().optional()});
const statusSchema=z.object({projectId:z.string().uuid(),issueId:z.string().uuid(),status:z.enum(["open","in_progress","resolved","cancelled"])});

export async function createProjectIssue(formData:FormData):Promise<void>{
 const parsed=createSchema.safeParse({projectId:formData.get("projectId"),stageId:String(formData.get("stageId")??"").trim()||undefined,title:formData.get("title"),description:String(formData.get("description")??"").trim()||undefined,priority:formData.get("priority"),dueAt:String(formData.get("dueAt")??"").trim()||undefined});
 if(!parsed.success)return;
 const auth=await requireActiveUser();if(!auth.success)return;
 const access=await getAccess(parsed.data.projectId,auth.user.id);if(!access)return;
 const assignedTo=access.role==="customer"?access.contractorOwnerId:access.customerId;
 const result=await db.query<{id:string}>(`
   INSERT INTO public.project_issues(project_id,stage_id,created_by,assigned_to,title,description,priority,due_at)
   VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8::date)
   RETURNING id
 `,[parsed.data.projectId,parsed.data.stageId??null,auth.user.id,assignedTo,parsed.data.title,parsed.data.description??null,parsed.data.priority,parsed.data.dueAt??null]);
 const issueId=result.rows[0]?.id;if(!issueId)return;
 if(assignedTo){await createNotification({userId:assignedTo,actorId:auth.user.id,notificationType:"project_issue_created",title:"Новое замечание по проекту",body:parsed.data.title,projectId:parsed.data.projectId,url:access.role==="customer"?`/contractor/work/${parsed.data.projectId}/issues`:`/customer/work/${parsed.data.projectId}/issues`,deduplicationKey:`project-issue:${issueId}`,metadata:{issue_id:issueId,priority:parsed.data.priority}})}
 revalidate(parsed.data.projectId);
}

export async function updateProjectIssueStatus(formData:FormData):Promise<void>{
 const parsed=statusSchema.safeParse({projectId:formData.get("projectId"),issueId:formData.get("issueId"),status:formData.get("status")});if(!parsed.success)return;
 const auth=await requireActiveUser();if(!auth.success)return;
 const access=await getAccess(parsed.data.projectId,auth.user.id);if(!access)return;
 const result=await db.query<{title:string;created_by:string;assigned_to:string|null}>(`
   UPDATE public.project_issues SET status=$3,resolved_at=CASE WHEN $3='resolved' THEN now() ELSE NULL END,updated_at=now()
   WHERE id=$1::uuid AND project_id=$2::uuid AND status <> 'cancelled'
   RETURNING title,created_by,assigned_to
 `,[parsed.data.issueId,parsed.data.projectId,parsed.data.status]);
 const issue=result.rows[0];if(!issue)return;
 const recipient=issue.created_by===auth.user.id?issue.assigned_to:issue.created_by;
 if(recipient){await createNotification({userId:recipient,actorId:auth.user.id,notificationType:"project_issue_updated",title:"Статус замечания изменён",body:`${issue.title}: ${statusLabel(parsed.data.status)}`,projectId:parsed.data.projectId,url:access.role==="customer"?`/contractor/work/${parsed.data.projectId}/issues`:`/customer/work/${parsed.data.projectId}/issues`,deduplicationKey:`project-issue-status:${parsed.data.issueId}:${parsed.data.status}`,metadata:{issue_id:parsed.data.issueId,status:parsed.data.status}})}
 revalidate(parsed.data.projectId);
}

async function getAccess(projectId:string,userId:string){const r=await db.query<{customer_id:string;contractor_owner_id:string|null}>(`SELECT p.customer_id,cc.owner_id AS contractor_owner_id FROM public.projects p LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id WHERE p.id=$1::uuid LIMIT 1`,[projectId]);const row=r.rows[0];if(!row)return null;if(row.customer_id===userId)return{role:"customer" as const,customerId:row.customer_id,contractorOwnerId:row.contractor_owner_id};if(row.contractor_owner_id===userId)return{role:"contractor" as const,customerId:row.customer_id,contractorOwnerId:row.contractor_owner_id};return null}
function revalidate(id:string){revalidatePath(`/customer/work/${id}/issues`);revalidatePath(`/contractor/work/${id}/issues`);revalidatePath(`/customer/work/${id}`);revalidatePath(`/contractor/work/${id}`)}
function statusLabel(v:string){return v==="resolved"?"решено":v==="in_progress"?"в работе":v==="cancelled"?"отменено":"открыто"}
