import "server-only";

import { db } from "@/lib/db/pool";

export type ActiveContractGuard =
  | { success: true; contractId: string; versionNo: number }
  | { success: false; message: string };

export async function requireActiveContract(projectId: string): Promise<ActiveContractGuard> {
  const result = await db.query<{
    contract_id: string | null;
    status: string | null;
    current_version: number | null;
    customer_approved_at: Date | null;
    contractor_approved_at: Date | null;
  }>(`
    SELECT pc.id AS contract_id,pc.status,pc.current_version,
           v.customer_approved_at,v.contractor_approved_at
    FROM public.projects p
    LEFT JOIN public.project_contracts pc ON pc.project_id=p.id
    LEFT JOIN public.project_contract_versions v
      ON v.contract_id=pc.id AND v.version_no=pc.current_version
    WHERE p.id=$1::uuid
    LIMIT 1
  `,[projectId]);

  const row=result.rows[0];
  if(!row?.contract_id){
    return {success:false,message:"Сначала заказчик должен сформировать договор, а обе стороны — согласовать его."};
  }
  if(row.status!=="active" || !row.customer_approved_at || !row.contractor_approved_at){
    return {success:false,message:"Работы и расчёты станут доступны только после подписания текущей версии договора обеими сторонами."};
  }
  return {success:true,contractId:row.contract_id,versionNo:Number(row.current_version??1)};
}
