"use server";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { createProjectContract } from "@/features/workspace/actions/project-contracts";

export type ContractGenerationState = { success: boolean; message: string } | null;

export async function createProjectContractWithState(_: ContractGenerationState, formData: FormData): Promise<ContractGenerationState> {
  const projectId = String(formData.get("projectId") ?? "");
  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  if (auth.profile.role !== "customer") return { success: false, message: "Сформировать договор может только заказчик" };

  const project = await db.query<{ selected_contractor_id: string | null; selected_bid_id: string | null; current_version: number | null }>(`
    SELECT p.selected_contractor_id,p.selected_bid_id,pc.current_version
    FROM public.projects p
    LEFT JOIN public.project_contracts pc ON pc.project_id=p.id
    WHERE p.id=$1::uuid AND p.customer_id=$2::uuid
    LIMIT 1
  `,[projectId,auth.user.id]);
  const row=project.rows[0];
  if(!row) return { success:false,message:"Проект не найден" };
  if(!row.selected_contractor_id) return { success:false,message:"Сначала выберите подрядчика по проекту" };
  if(!row.selected_bid_id) return { success:false,message:"У проекта не найдено принятое предложение. Обновите страницу после применения миграций или повторно выберите предложение подрядчика." };

  const before=Number(row.current_version??0);
  await createProjectContract(formData);

  const afterResult=await db.query<{current_version:number}>(`
    SELECT pc.current_version
    FROM public.project_contracts pc
    JOIN public.projects p ON p.id=pc.project_id
    WHERE pc.project_id=$1::uuid AND p.customer_id=$2::uuid
    LIMIT 1
  `,[projectId,auth.user.id]);
  const after=Number(afterResult.rows[0]?.current_version??0);
  if(after<=before) return { success:false,message:"Договор не был сформирован. Проверьте данные проекта и принятого предложения." };
  return { success:true,message:before>0?`Создана новая версия договора №${after}`:`Договор сформирован. Версия №${after}` };
}
