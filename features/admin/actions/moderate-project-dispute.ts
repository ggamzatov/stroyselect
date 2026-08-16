"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";

const prioritySchema=z.enum(["low","normal","high","critical"]);
const statusSchema=z.enum(["open","under_review","resolved","closed"]);

export async function moderateProjectDispute(formData: FormData) {
  const { user } = await requireStaffUser();
  const disputeId=String(formData.get("disputeId")??"");
  const projectId=String(formData.get("projectId")??"");
  const priority=prioritySchema.parse(formData.get("priority"));
  const status=statusSchema.parse(formData.get("status"));
  const adminNote=String(formData.get("adminNote")??"").trim()||null;
  const resolution=String(formData.get("resolution")??"").trim()||null;

  if(status==="resolved"&&!resolution) throw new Error("Для разрешения спора нужен итог");

  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const result=await client.query(`
      UPDATE public.project_disputes
      SET priority=$1::varchar(16),
          status=$2::varchar(32),
          admin_note=$3::text,
          resolution=CASE WHEN $2::text='resolved' THEN $4::text ELSE resolution END,
          admin_resolved_by=CASE WHEN $2::text='resolved' THEN $5::uuid ELSE admin_resolved_by END,
          admin_resolved_at=CASE WHEN $2::text='resolved' THEN now() ELSE admin_resolved_at END,
          resolved_by=CASE WHEN $2::text='resolved' THEN $5::uuid ELSE resolved_by END,
          resolved_at=CASE WHEN $2::text='resolved' THEN now() ELSE resolved_at END,
          updated_at=now()
      WHERE id=$6::uuid AND project_id=$7::uuid
      RETURNING id
    `,[priority,status,adminNote,resolution,user.id,disputeId,projectId]);
    if(!result.rowCount) throw new Error("Спор не найден");
    await client.query(`
      INSERT INTO public.project_audit_log(project_id,actor_id,action,entity_type,entity_id,payload)
      VALUES($1,$2,'admin_dispute_moderated','dispute',$3,$4::jsonb)
    `,[projectId,user.id,disputeId,JSON.stringify({priority,status,admin_note:adminNote,resolution})]);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}

  revalidatePath("/admin/disputes");
  revalidatePath(`/admin/disputes/${disputeId}`);
  revalidatePath(`/customer/work/${projectId}/disputes`);
  revalidatePath(`/contractor/work/${projectId}/disputes`);
}

export async function setProjectRiskHold(formData: FormData) {
  const { user }=await requireStaffUser();
  const projectId=String(formData.get("projectId")??"");
  const disputeId=String(formData.get("disputeId")??"");
  const hold=String(formData.get("hold")??"")==="true";
  const reason=String(formData.get("reason")??"").trim();

  if(hold&&reason.length<5){
    redirect(`/admin/disputes/${disputeId}?holdError=reason`);
  }

  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const result=await client.query(`
      UPDATE public.projects
      SET risk_hold=$1,
          risk_hold_reason=CASE WHEN $1 THEN $2::text ELSE NULL END,
          risk_hold_by=CASE WHEN $1 THEN $3::uuid ELSE NULL END,
          risk_hold_at=CASE WHEN $1 THEN now() ELSE NULL END
      WHERE id=$4::uuid
      RETURNING id
    `,[hold,reason||null,user.id,projectId]);
    if(!result.rowCount) throw new Error("Проект не найден");
    await client.query(`
      INSERT INTO public.project_audit_log(project_id,actor_id,action,entity_type,entity_id,payload)
      VALUES($1,$2,$3,'project',$1,$4::jsonb)
    `,[projectId,user.id,hold?"project_risk_hold_enabled":"project_risk_hold_disabled",JSON.stringify({reason:reason||null,dispute_id:disputeId||null})]);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}

  revalidatePath("/admin/disputes");
  if(disputeId) revalidatePath(`/admin/disputes/${disputeId}`);
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
  redirect(disputeId?`/admin/disputes/${disputeId}`:"/admin/disputes");
}
