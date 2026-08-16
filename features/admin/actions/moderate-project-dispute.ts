"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";
import { notifyProjectParticipantsAsAdmin } from "@/features/notifications/server/notify-project-participants-as-admin";

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
      VALUES($1::uuid,$2::uuid,'admin_dispute_moderated','dispute',$3::text,$4::jsonb)
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

  let changedAt: string | null = null;
  let didChange = false;
  const client=await db.connect();
  try{
    await client.query("BEGIN");

    const currentResult=await client.query<{risk_hold:boolean;risk_hold_reason:string|null}>(`
      SELECT risk_hold,risk_hold_reason
      FROM public.projects
      WHERE id=$1::uuid
      LIMIT 1
      FOR UPDATE
    `,[projectId]);

    const current=currentResult.rows[0];
    if(!current) throw new Error("Проект не найден");

    const nextReason=hold?reason:null;
    const sameState=current.risk_hold===hold && (hold ? (current.risk_hold_reason??"")===reason : true);

    if(!sameState){
      const result=await client.query<{risk_hold_at:Date|string|null}>(`
        UPDATE public.projects
        SET risk_hold=$1::boolean,
            risk_hold_reason=$2::text,
            risk_hold_by=CASE WHEN $1::boolean THEN $3::uuid ELSE NULL END,
            risk_hold_at=CASE WHEN $1::boolean THEN now() ELSE NULL END
        WHERE id=$4::uuid
        RETURNING risk_hold_at
      `,[hold,nextReason,user.id,projectId]);

      const rawChangedAt=result.rows[0]?.risk_hold_at;
      changedAt=rawChangedAt instanceof Date?rawChangedAt.toISOString():rawChangedAt?String(rawChangedAt):new Date().toISOString();
      didChange=true;

      await client.query(`
        INSERT INTO public.project_audit_log(
          project_id,
          actor_id,
          action,
          entity_type,
          entity_id,
          payload
        ) VALUES(
          $1::uuid,
          $2::uuid,
          $3::varchar(100),
          'project',
          $4::text,
          $5::jsonb
        )
      `,[
        projectId,
        user.id,
        hold?"project_risk_hold_enabled":"project_risk_hold_disabled",
        projectId,
        JSON.stringify({reason:nextReason,dispute_id:disputeId||null}),
      ]);
    }

    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}

  if(didChange){
    await notifyProjectParticipantsAsAdmin({
      projectId,
      actorUserId:user.id,
      notificationType:hold?"project_risk_hold_enabled":"project_risk_hold_disabled",
      title:hold?"Проект временно приостановлен":"Project Hold снят",
      body:hold?(reason||"Администрация временно ограничила финансовые и рабочие действия по проекту."):"Финансовые операции, изменения и управление этапами снова доступны.",
      deduplicationKey:`project-hold:${projectId}:${hold?"enabled":"disabled"}:${changedAt??"state-change"}`,
    });
  }

  revalidatePath("/admin/disputes");
  if(disputeId) revalidatePath(`/admin/disputes/${disputeId}`);
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
  revalidatePath("/customer", "layout");
  revalidatePath("/contractor", "layout");
  redirect(disputeId?`/admin/disputes/${disputeId}`:"/admin/disputes");
}
