import "server-only";

import { z } from "zod";
import { db } from "@/lib/db/pool";

const notificationSchema = z.object({
  userId: z.string().uuid("Некорректный идентификатор получателя"),
  actorId: z.string().uuid("Некорректный идентификатор инициатора").nullable().optional(),
  notificationType: z.string().trim().min(1,"Тип уведомления обязателен").max(100,"Тип уведомления слишком длинный"),
  title: z.string().trim().min(1,"Заголовок уведомления обязателен").max(200,"Заголовок уведомления слишком длинный"),
  body: z.string().trim().max(2000,"Текст уведомления слишком длинный").nullable().optional(),
  projectId: z.string().uuid("Некорректный идентификатор проекта").nullable().optional(),
  messageId: z.string().uuid("Некорректный идентификатор сообщения").nullable().optional(),
  url: z.string().trim().max(1000,"Ссылка уведомления слишком длинная").nullable().optional(),
  metadata: z.record(z.string(),z.unknown()).optional(),
  deduplicationKey: z.string().trim().min(1,"Ключ дедупликации не может быть пустым").max(300,"Ключ дедупликации слишком длинный").nullable().optional(),
});

export type CreateNotificationInput=z.infer<typeof notificationSchema>;
export type CreateNotificationResult={success:boolean;message:string;notificationId?:string;duplicated?:boolean;skipped?:boolean};
type NotificationRow={id:string};
type PostgresError=Error&{code?:string};
type PreferenceRow={in_app_enabled:boolean;project_updates:boolean;bid_updates:boolean;chat_updates:boolean;dispute_updates:boolean};

export async function createNotification(input:CreateNotificationInput):Promise<CreateNotificationResult>{
 const parsed=notificationSchema.safeParse(input);
 if(!parsed.success){console.error("Некорректные данные уведомления:",parsed.error.flatten());return{success:false,message:parsed.error.issues[0]?.message??"Некорректные данные уведомления"}}
 const values=parsed.data;
 if(values.actorId&&values.actorId===values.userId)return{success:true,message:"Уведомление самому себе не требуется",skipped:true};

 try{
  const pref=await db.query<PreferenceRow>(`SELECT in_app_enabled,project_updates,bid_updates,chat_updates,dispute_updates FROM public.notification_preferences WHERE user_id=$1::uuid LIMIT 1`,[values.userId]);
  const settings=pref.rows[0];
  if(settings&&!isNotificationAllowed(values.notificationType,settings))return{success:true,message:"Уведомление отключено пользователем",skipped:true};

  const result=await db.query<NotificationRow>(`
    INSERT INTO public.notifications(user_id,actor_id,notification_type,title,body,project_id,message_id,url,metadata,deduplication_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
    RETURNING id
  `,[values.userId,values.actorId??null,values.notificationType,values.title,normalizeNullableText(values.body),values.projectId??null,values.messageId??null,normalizeNullableText(values.url),JSON.stringify(values.metadata??{}),normalizeNullableText(values.deduplicationKey)]);
  const notification=result.rows[0];if(!notification)return{success:false,message:"Не удалось создать уведомление"};
  return{success:true,message:"Уведомление создано",notificationId:notification.id,duplicated:false};
 }catch(error){
  const postgresError=error as PostgresError;if(postgresError.code==="23505")return{success:true,message:"Такое уведомление уже существует",duplicated:true};
  console.error("Ошибка создания уведомления:",{userId:values.userId,actorId:values.actorId??null,notificationType:values.notificationType,projectId:values.projectId??null,messageId:values.messageId??null,deduplicationKey:values.deduplicationKey??null,error});
  return{success:false,message:error instanceof Error?error.message:"Не удалось создать уведомление"};
 }
}

function isNotificationAllowed(type:string,p:PreferenceRow){
 if(!p.in_app_enabled)return false;
 const value=type.toLowerCase();
 if(value.includes("chat")||value.includes("message"))return p.chat_updates;
 if(value.includes("bid")||value.includes("invitation")||value.includes("proposal"))return p.bid_updates;
 if(value.includes("dispute")||value.includes("risk")||value.includes("hold"))return p.dispute_updates;
 return p.project_updates;
}
function normalizeNullableText(value:string|null|undefined){if(value===null||value===undefined)return null;const normalized=value.trim();return normalized?normalized:null}
