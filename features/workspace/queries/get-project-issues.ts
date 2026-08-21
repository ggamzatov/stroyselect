import "server-only";

import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";

export async function getProjectIssues(projectId: string) {
  const userId = await getCurrentSessionUserId();
  if (!userId) redirect("/login");

  const projectResult = await db.query<{
    id: string;
    title: string;
    status: string;
    customer_id: string;
    contractor_owner_id: string | null;
  }>(
    `
      SELECT p.id,p.title,p.status,p.customer_id,cc.owner_id AS contractor_owner_id
      FROM public.projects p
      LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id
      WHERE p.id=$1::uuid
      LIMIT 1
    `,
    [projectId]
  );
  const project = projectResult.rows[0];
  if (!project) notFound();
  const role = project.customer_id === userId ? "customer" : project.contractor_owner_id === userId ? "contractor" : null;
  if (!role) notFound();

  const [issues, stages] = await Promise.all([
    db.query<{
      id:string;stage_id:string|null;created_by:string;assigned_to:string|null;title:string;description:string|null;status:string;priority:string;due_at:Date|string|null;resolved_at:Date|string|null;created_at:Date|string;updated_at:Date|string;stage_title:string|null;creator_name:string|null;assignee_name:string|null;
    }>(
      `
        SELECT i.id,i.stage_id,i.created_by,i.assigned_to,i.title,i.description,i.status,i.priority,i.due_at,i.resolved_at,i.created_at,i.updated_at,
               ps.title AS stage_title,
               trim(coalesce(cp.first_name,'') || ' ' || coalesce(cp.last_name,'')) AS creator_name,
               trim(coalesce(ap.first_name,'') || ' ' || coalesce(ap.last_name,'')) AS assignee_name
        FROM public.project_issues i
        LEFT JOIN public.project_stages ps ON ps.id=i.stage_id
        LEFT JOIN public.profiles cp ON cp.id=i.created_by
        LEFT JOIN public.profiles ap ON ap.id=i.assigned_to
        WHERE i.project_id=$1::uuid
        ORDER BY CASE i.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
                 (i.status IN ('resolved','cancelled')) ASC,i.created_at DESC
      `,
      [projectId]
    ),
    db.query<{id:string;title:string}>(`SELECT id,title FROM public.project_stages WHERE project_id=$1::uuid ORDER BY sort_order,created_at`,[projectId]),
  ]);

  return {
    role: role as "customer"|"contractor",
    currentUserId:userId,
    project:{id:project.id,title:project.title,status:project.status,customerId:project.customer_id,contractorOwnerId:project.contractor_owner_id},
    stages:stages.rows,
    issues:issues.rows.map(row=>({
      id:row.id,stageId:row.stage_id,stageTitle:row.stage_title,createdBy:row.created_by,creatorName:row.creator_name||"Пользователь",assignedTo:row.assigned_to,assigneeName:row.assignee_name||null,title:row.title,description:row.description,status:row.status,priority:row.priority,dueAt:toNullableDate(row.due_at),resolvedAt:toNullableIso(row.resolved_at),createdAt:toIso(row.created_at),updatedAt:toIso(row.updated_at),
    })),
  };
}
function toIso(v:Date|string){return v instanceof Date?v.toISOString():String(v)}
function toNullableIso(v:Date|string|null){return v?toIso(v):null}
function toNullableDate(v:Date|string|null){return v?(v instanceof Date?v.toISOString().slice(0,10):String(v).slice(0,10)):null}
