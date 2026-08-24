import "server-only";

import { db } from "@/lib/db/pool";
import { requireActiveProject } from "@/lib/projects/require-active-project";
import { requireActiveContract } from "@/lib/projects/require-active-contract";

export type MaterialParticipantResult =
  | { success:true; role:"customer"|"contractor"; userId:string; contractorId:string|null; project:{id:string;title:string;status:string;customerId:string;selectedContractorId:string|null}; contractId:string; contractVersion:number }
  | { success:false; message:string };

export async function getMaterialProjectParticipant(projectId:string,userId:string,role:string):Promise<MaterialParticipantResult>{
  if(role!=="customer"&&role!=="contractor")return{success:false,message:"Раздел материалов доступен только участникам проекта"};
  const activeProject=await requireActiveProject(projectId);
  if(!activeProject.success)return{success:false,message:activeProject.message};
  let contractorId:string|null=null;
  if(role==="customer"){
    if(activeProject.project.customer_id!==userId)return{success:false,message:"У вас нет доступа к материалам этого проекта"};
  }else{
    const companyResult=await db.query<{id:string}>(`SELECT id FROM public.contractor_companies WHERE owner_id=$1::uuid LIMIT 1`,[userId]);
    contractorId=companyResult.rows[0]?.id??null;
    if(!contractorId||activeProject.project.selected_contractor_id!==contractorId)return{success:false,message:"Проект не назначен вашей компании"};
  }
  const contract=await requireActiveContract(projectId);
  if(!contract.success)return{success:false,message:contract.message};
  return{success:true,role,userId,contractorId,project:{id:activeProject.project.id,title:activeProject.project.title,status:activeProject.project.status,customerId:activeProject.project.customer_id,selectedContractorId:activeProject.project.selected_contractor_id},contractId:contract.contractId,contractVersion:contract.versionNo};
}
