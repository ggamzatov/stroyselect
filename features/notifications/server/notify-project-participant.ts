import "server-only";

import { db } from "@/lib/db/pool";
import { createNotification } from "@/features/notifications/server/create-notification";

export type ProjectNotificationType =
  | "new_message" | "chat_file_uploaded"
  | "stage_created" | "stage_updated" | "stage_deleted" | "stage_started"
  | "stage_submitted" | "stage_approved" | "stage_revision_requested"
  | "file_uploaded" | "file_deleted"
  | "project_started" | "project_completed"
  | "review_created" | "review_updated"
  | "change_order_created" | "change_order_approved" | "change_order_rejected"
  | "payment_recorded"
  | "dispute_opened" | "dispute_message_added" | "dispute_status_changed";

type Input={projectId:string;actorUserId:string;notificationType:ProjectNotificationType;title:string;body?:string|null;customerUrl?:string|null;contractorUrl?:string|null;deduplicationKey?:string|null;metadata?:Record<string,unknown>};
type ProjectRow={customer_id:string;selected_contractor_id:string|null;contractor_owner_id:string|null};

export async function notifyProjectParticipant(input:Input){
 let project:ProjectRow|undefined;
 try{const result=await db.query<ProjectRow>(`SELECT p.customer_id,p.selected_contractor_id,cc.owner_id AS contractor_owner_id FROM public.projects p LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id WHERE p.id=$1::uuid LIMIT 1`,[input.projectId]);project=result.rows[0]}catch(error){console.error("Ошибка определения проекта для уведомления:",{projectId:input.projectId,actorUserId:input.actorUserId,notificationType:input.notificationType,error});return{success:false}}
 if(!project)return{success:false};
 const customerUserId=project.customer_id;const contractorUserId=project.contractor_owner_id;let recipientId:string|null=null;let destinationUrl:string|null=null;
 if(input.actorUserId===customerUserId){recipientId=contractorUserId;destinationUrl=input.contractorUrl??`/contractor/work/${input.projectId}`}
 if(contractorUserId&&input.actorUserId===contractorUserId){recipientId=customerUserId;destinationUrl=input.customerUrl??`/customer/work/${input.projectId}`}
 if(!recipientId||recipientId===input.actorUserId)return{success:true};
 const result=await createNotification({userId:recipientId,actorId:input.actorUserId,notificationType:input.notificationType,title:input.title.trim(),body:normalize(input.body),projectId:input.projectId,url:destinationUrl,deduplicationKey:input.deduplicationKey??null,metadata:{project_id:input.projectId,...(input.metadata??{})}});
 if(!result.success){console.error("Ошибка создания уведомления участнику проекта:",{projectId:input.projectId,recipientId,notificationType:input.notificationType,message:result.message});return{success:false}}
 return{success:true};
}
function normalize(value:string|null|undefined){if(value==null)return null;const v=value.trim();return v||null}
