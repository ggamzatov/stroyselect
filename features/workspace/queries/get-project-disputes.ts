import "server-only";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";

type ProjectRow={id:string;title:string;customer_id:string;contractor_owner_id:string|null};
type DisputeRow={id:string;opened_by:string;stage_id:string|null;change_order_id:string|null;payment_id:string|null;subject:string;description:string;status:string;resolution:string|null;resolved_at:Date|string|null;created_at:Date|string};
type MessageRow={id:string;dispute_id:string;author_id:string;body:string;created_at:Date|string};
type AuditRow={id:string;actor_id:string|null;action:string;entity_type:string;entity_id:string|null;payload:Record<string,unknown>;created_at:Date|string};

export async function getProjectDisputes(projectId:string){
 const userId=await getCurrentSessionUserId(); if(!userId) redirect("/login");
 const p=await db.query<ProjectRow>(`SELECT p.id,p.title,p.customer_id,cc.owner_id AS contractor_owner_id FROM public.projects p LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id WHERE p.id=$1 LIMIT 1`,[projectId]);
 const project=p.rows[0]; if(!project) notFound();
 const role=project.customer_id===userId?"customer":project.contractor_owner_id===userId?"contractor":null; if(!role) notFound();
 const [d,m,a,s,c,pay]=await Promise.all([
  db.query<DisputeRow>(`SELECT id,opened_by,stage_id,change_order_id,payment_id,subject,description,status,resolution,resolved_at,created_at FROM public.project_disputes WHERE project_id=$1 ORDER BY created_at DESC`,[projectId]),
  db.query<MessageRow>(`SELECT m.id,m.dispute_id,m.author_id,m.body,m.created_at FROM public.project_dispute_messages m JOIN public.project_disputes d ON d.id=m.dispute_id WHERE d.project_id=$1 ORDER BY m.created_at ASC`,[projectId]),
  db.query<AuditRow>(`SELECT id::text,actor_id,action,entity_type,entity_id,payload,created_at FROM public.project_audit_log WHERE project_id=$1 ORDER BY created_at DESC LIMIT 100`,[projectId]),
  db.query<{id:string;title:string}>(`SELECT id,title FROM public.project_stages WHERE project_id=$1 ORDER BY sort_order,created_at`,[projectId]),
  db.query<{id:string;title:string}>(`SELECT id,title FROM public.project_change_orders WHERE project_id=$1 ORDER BY created_at DESC`,[projectId]),
  db.query<{id:string;amount:string|number;paid_at:Date|string}>(`SELECT id,amount,paid_at FROM public.project_payments WHERE project_id=$1 ORDER BY paid_at DESC`,[projectId]),
 ]);
 const messages=new Map<string,Array<{id:string;authorId:string;own:boolean;body:string;createdAt:string}>>(); for(const row of m.rows){const list=messages.get(row.dispute_id)??[];list.push({id:row.id,authorId:row.author_id,own:row.author_id===userId,body:row.body,createdAt:iso(row.created_at)});messages.set(row.dispute_id,list)}
 return {role,project:{id:project.id,title:project.title},stages:s.rows,changeOrders:c.rows,payments:pay.rows.map(x=>({id:x.id,amount:Number(x.amount),paidAt:iso(x.paid_at).slice(0,10)})),disputes:d.rows.map(x=>({...x,openedByCurrentUser:x.opened_by===userId,resolvedAt:x.resolved_at?iso(x.resolved_at):null,createdAt:iso(x.created_at),messages:messages.get(x.id)??[]})),audit:a.rows.map(x=>({...x,createdAt:iso(x.created_at),own:x.actor_id===userId}))};
}
function iso(v:Date|string){return v instanceof Date?v.toISOString():String(v)}
