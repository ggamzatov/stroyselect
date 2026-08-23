"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { requireActiveProject } from "@/lib/projects/require-active-project";
import { requireActiveContract } from "@/lib/projects/require-active-contract";

import {
  projectStageSchema,
  type ProjectStageInput,
} from "@/features/workspace/schemas/project-stage-schema";

export type SaveProjectStageResult = {
  success: boolean;
  message: string;
  stageId?: string;
};

type LockedProjectRow = {
  id: string;
  status: string;
};

type ExistingStageRow = {
  id: string;
  status: string;
  title: string;
  description: string | null;
  price: string | number | null;
  progress_weight: number;
};

export async function saveProjectStage(
  input: ProjectStageInput
): Promise<SaveProjectStageResult> {
  const parsed = projectStageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные этапа" };
  }

  const values = parsed.data;
  const activeUser = await requireActiveUser();
  if (!activeUser.success) return { success: false, message: activeUser.message };
  const { user, profile } = activeUser;
  if (profile.role !== "contractor") return { success: false, message: "Управлять этапами может только подрядчик" };

  const activeProject = await requireActiveProject(values.projectId);
  if (!activeProject.success) return { success: false, message: activeProject.message };

  const companyResult = await db.query<{ id: string }>(
    `SELECT id FROM public.contractor_companies WHERE owner_id=$1 LIMIT 1`,
    [user.id]
  );
  const company = companyResult.rows[0];
  if (!company) return { success: false, message: "Компания подрядчика не найдена" };
  if (activeProject.project.selected_contractor_id !== company.id) {
    return { success: false, message: "Проект не найден или не назначен вашей компании" };
  }

  const contract = await requireActiveContract(values.projectId);
  if (!contract.success) return { success: false, message: contract.message };

  if (!["contractor_selected", "in_progress"].includes(activeProject.project.status)) {
    return { success: false, message: "На текущем статусе проекта нельзя менять этапы" };
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const projectResult = await client.query<LockedProjectRow>(
      `
        SELECT id,status::text AS status
        FROM public.projects
        WHERE id=$1::uuid
          AND selected_contractor_id=$2::uuid
          AND status IN ('contractor_selected','in_progress')
          AND is_admin_blocked=false
          AND COALESCE(risk_hold,false)=false
        LIMIT 1
        FOR UPDATE
      `,
      [values.projectId, company.id]
    );

    const lockedProject = projectResult.rows[0];
    if (!lockedProject) {
      await client.query("ROLLBACK");
      return { success: false, message: "Проект недоступен для изменения этапов" };
    }

    const otherWeightResult = await client.query<{ total_weight: string | number }>(
      `
        SELECT COALESCE(SUM(progress_weight),0) AS total_weight
        FROM public.project_stages
        WHERE project_id=$1::uuid
          AND ($2::uuid IS NULL OR id<>$2::uuid)
      `,
      [values.projectId, values.stageId ?? null]
    );
    const otherWeight = Number(otherWeightResult.rows[0]?.total_weight ?? 0);
    if (otherWeight + values.progressWeight > 100) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: `Доли этапов не могут превышать 100%. Уже распределено ${otherWeight}%, для этого этапа доступно максимум ${Math.max(0, 100-otherWeight)}%.`,
      };
    }

    if (values.stageId) {
      const existingResult = await client.query<ExistingStageRow>(
        `
          SELECT id,status::text AS status,title,description,price,progress_weight
          FROM public.project_stages
          WHERE id=$1::uuid AND project_id=$2::uuid
          LIMIT 1
          FOR UPDATE
        `,
        [values.stageId, values.projectId]
      );
      const existing = existingResult.rows[0];
      if (!existing) {
        await client.query("ROLLBACK");
        return { success: false, message: "Этап не найден" };
      }
      if (existing.status !== "planned") {
        await client.query("ROLLBACK");
        return { success: false, message: "После начала этапа его объём, стоимость и долю изменять нельзя" };
      }

      if (lockedProject.status === "in_progress") {
        const structuralChange =
          existing.title !== values.title ||
          (existing.description ?? "") !== (values.description?.trim() ?? "") ||
          nullableNumber(existing.price) !== nullableNumber(values.price) ||
          Number(existing.progress_weight) !== Number(values.progressWeight);
        if (structuralChange) {
          await client.query("ROLLBACK");
          return {
            success: false,
            message: "После начала проекта объём, стоимость и доля этапа меняются только через согласованное изменение проекта. Здесь можно скорректировать только плановые даты.",
          };
        }
      }

      const result = await client.query<{ id: string }>(
        `UPDATE public.project_stages
         SET title=$1,description=$2,price=$3,progress_weight=$4,
             planned_start_date=$5,planned_end_date=$6,updated_at=now()
         WHERE id=$7::uuid AND project_id=$8::uuid AND status='planned'
         RETURNING id`,
        [values.title,values.description?.trim()||null,values.price??null,values.progressWeight,
         values.plannedStartDate||null,values.plannedEndDate||null,values.stageId,values.projectId]
      );
      const updatedStage=result.rows[0];
      if(!updatedStage){await client.query("ROLLBACK");return{success:false,message:"Не удалось обновить этап"};}
      await client.query("COMMIT");
      revalidateWorkspace(values.projectId);
      return {success:true,message:"Этап обновлён",stageId:updatedStage.id};
    }

    const orderResult = await client.query<{ next_sort_order: number }>(
      `SELECT COALESCE(MAX(sort_order),-1)+1 AS next_sort_order FROM public.project_stages WHERE project_id=$1`,
      [values.projectId]
    );
    const nextSortOrder=Number(orderResult.rows[0]?.next_sort_order??0);
    const result=await client.query<{id:string}>(
      `INSERT INTO public.project_stages(
         project_id,created_by,title,description,price,progress_weight,sort_order,status,planned_start_date,planned_end_date
       ) VALUES($1,$2,$3,$4,$5,$6,$7,'planned',$8,$9) RETURNING id`,
      [values.projectId,user.id,values.title,values.description?.trim()||null,values.price??null,
       values.progressWeight,nextSortOrder,values.plannedStartDate||null,values.plannedEndDate||null]
    );
    const createdStage=result.rows[0];
    if(!createdStage)throw new Error("Этап не был создан");

    await client.query(
      `INSERT INTO public.project_events(project_id,author_id,event_type,title,description,metadata)
       VALUES($1,$2,'stage_created',$3,$4,$5::jsonb)`,
      [values.projectId,user.id,"Добавлен этап работ",values.title,
       JSON.stringify({stage_id:createdStage.id,contract_id:contract.contractId,contract_version:contract.versionNo})]
    );

    await client.query("COMMIT");
    revalidateWorkspace(values.projectId);
    return {success:true,message:"Этап добавлен",stageId:createdStage.id};
  } catch(error){
    await client.query("ROLLBACK");
    console.error("Ошибка сохранения этапа:",error);
    return{success:false,message:values.stageId?"Не удалось обновить этап":"Не удалось создать этап"};
  } finally {client.release();}
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function revalidateWorkspace(projectId:string){
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
  revalidatePath(`/customer/projects/${projectId}`);
  revalidatePath("/customer/dashboard");
  revalidatePath("/contractor/dashboard");
}
