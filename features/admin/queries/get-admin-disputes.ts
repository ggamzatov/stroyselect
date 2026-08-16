import "server-only";

import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";

type Row = {
  id: string;
  project_id: string;
  project_title: string;
  status: string;
  priority: string;
  subject: string;
  opened_by: string;
  created_at: Date | string;
  updated_at: Date | string;
  risk_hold: boolean;
  risk_hold_reason: string | null;
  computed_risk_level: string;
  open_disputes: string | number;
  total_disputes: string | number;
  approved_change_increase: string | number;
  overdue_stages: string | number;
  original_contract: string | number;
};

export async function getAdminDisputes() {
  await requireStaffUser();

  const result = await db.query<Row>(`
    SELECT
      d.id,
      d.project_id,
      p.title AS project_title,
      d.status,
      d.priority,
      d.subject,
      d.opened_by,
      d.created_at,
      d.updated_at,
      p.risk_hold,
      p.risk_hold_reason,
      rs.computed_risk_level,
      rs.open_disputes,
      rs.total_disputes,
      rs.approved_change_increase,
      rs.overdue_stages,
      rs.original_contract
    FROM public.project_disputes d
    JOIN public.projects p ON p.id=d.project_id
    LEFT JOIN public.project_risk_signals rs ON rs.project_id=p.id
    ORDER BY
      CASE d.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
      CASE d.status WHEN 'open' THEN 1 WHEN 'under_review' THEN 2 WHEN 'resolved' THEN 3 ELSE 4 END,
      d.updated_at DESC
  `);

  return result.rows.map((row) => ({
    ...row,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    open_disputes: Number(row.open_disputes ?? 0),
    total_disputes: Number(row.total_disputes ?? 0),
    approved_change_increase: Number(row.approved_change_increase ?? 0),
    overdue_stages: Number(row.overdue_stages ?? 0),
    original_contract: Number(row.original_contract ?? 0),
  }));
}

export async function getAdminDispute(disputeId: string) {
  await requireStaffUser();

  const dispute = await db.query<{
    id:string; project_id:string; project_title:string; status:string; priority:string; subject:string; description:string;
    resolution:string|null; admin_note:string|null; created_at:Date|string; updated_at:Date|string;
    risk_hold:boolean; risk_hold_reason:string|null; computed_risk_level:string; open_disputes:string|number;
    total_disputes:string|number; approved_change_increase:string|number; overdue_stages:string|number; original_contract:string|number;
  }>(`
    SELECT d.id,d.project_id,p.title AS project_title,d.status,d.priority,d.subject,d.description,
           d.resolution,d.admin_note,d.created_at,d.updated_at,p.risk_hold,p.risk_hold_reason,
           rs.computed_risk_level,rs.open_disputes,rs.total_disputes,rs.approved_change_increase,
           rs.overdue_stages,rs.original_contract
    FROM public.project_disputes d
    JOIN public.projects p ON p.id=d.project_id
    LEFT JOIN public.project_risk_signals rs ON rs.project_id=p.id
    WHERE d.id=$1
    LIMIT 1
  `,[disputeId]);

  const row=dispute.rows[0];
  if(!row) return null;

  const [messages,audit]=await Promise.all([
    db.query<{id:string;author_id:string;body:string;created_at:Date|string}>(`
      SELECT id,author_id,body,created_at FROM public.project_dispute_messages WHERE dispute_id=$1 ORDER BY created_at ASC
    `,[disputeId]),
    db.query<{id:string|number;actor_id:string|null;action:string;entity_type:string;entity_id:string|null;payload:Record<string,unknown>;created_at:Date|string}>(`
      SELECT id,actor_id,action,entity_type,entity_id,payload,created_at
      FROM public.project_audit_log WHERE project_id=$1 ORDER BY created_at DESC LIMIT 100
    `,[row.project_id]),
  ]);

  return {
    dispute:{...row,created_at:toIso(row.created_at),updated_at:toIso(row.updated_at),open_disputes:Number(row.open_disputes??0),total_disputes:Number(row.total_disputes??0),approved_change_increase:Number(row.approved_change_increase??0),overdue_stages:Number(row.overdue_stages??0),original_contract:Number(row.original_contract??0)},
    messages:messages.rows.map(x=>({...x,created_at:toIso(x.created_at)})),
    audit:audit.rows.map(x=>({...x,id:String(x.id),created_at:toIso(x.created_at)})),
  };
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}
