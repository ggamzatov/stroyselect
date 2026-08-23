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
type PreferenceRow={in_app_enabled:boolean;email_enabled:boolean;project_updates:boolean;bid_updates:boolean;chat_updates:boolean;dispute_updates:boolean;email:string|null};

export async function createNotification(input:CreateNotificationInput):Promise<CreateNotificationResult>{
 const parsed=notificationSchema.safeParse(input);
 if(!parsed.success){console.error("Некорректные данные уведомления:",parsed.error.flatten());return{success:false,message:parsed.error.issues[0]?.message??"Некорректные данные уведомления"}}
 const values=parsed.data;
 if(values.actorId&&values.actorId===values.userId)return{success:true,message:"Уведомление самому себе не требуется",skipped:true};

 const client=await db.connect();
 try{
  await client.query("BEGIN");
  const pref=await client.query<PreferenceRow>(`
    SELECT COALESCE(np.in_app_enabled,true) AS in_app_enabled,
           COALESCE(np.email_enabled,true) AS email_enabled,
           COALESCE(np.project_updates,true) AS project_updates,
           COALESCE(np.bid_updates,true) AS bid_updates,
           COALESCE(np.chat_updates,true) AS chat_updates,
           COALESCE(np.dispute_updates,true) AS dispute_updates,
           p.email
    FROM public.profiles p
    LEFT JOIN public.notification_preferences np ON np.user_id=p.id
    WHERE p.id=$1::uuid LIMIT 1
  `,[values.userId]);
  const settings=pref.rows[0];
  if(settings&&!isCategoryAllowed(values.notificationType,settings)){
    await client.query("ROLLBACK");
    return{success:true,message:"Уведомление этой категории отключено пользователем",skipped:true};
  }
  const inAppAllowed=settings?.in_app_enabled??true;
  const emailAllowed=(settings?.email_enabled??true)&&Boolean(settings?.email);
  if(!inAppAllowed&&!emailAllowed){await client.query("ROLLBACK");return{success:true,message:"Уведомления отключены пользователем",skipped:true};}

  const result=await client.query<NotificationRow>(`
    INSERT INTO public.notifications(user_id,actor_id,notification_type,title,body,project_id,message_id,url,metadata,deduplication_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
    RETURNING id
  `,[values.userId,values.actorId??null,values.notificationType,values.title,normalizeNullableText(values.body),values.projectId??null,values.messageId??null,normalizeNullableText(values.url),JSON.stringify({...values.metadata??{},in_app_visible:inAppAllowed}),normalizeNullableText(values.deduplicationKey)]);
  const notification=result.rows[0];if(!notification){await client.query("ROLLBACK");return{success:false,message:"Не удалось создать уведомление"};}

  if(emailAllowed&&settings?.email){
    await client.query(`
      INSERT INTO public.notification_delivery_queue(notification_id,channel,recipient,status,next_attempt_at)
      VALUES($1::uuid,'email',$2,'pending',now())
      ON CONFLICT(notification_id,channel) DO NOTHING
    `,[notification.id,settings.email]);
  }
  await client.query("COMMIT");
  return{success:true,message:"Уведомление создано",notificationId:notification.id,duplicated:false};
 }catch(error){
  await client.query("ROLLBACK");
  const postgresError=error as PostgresError;if(postgresError.code==="23505")return{success:true,message:"Такое уведомление уже существует",duplicated:true};
  console.error("Ошибка создания уведомления:",{userId:values.userId,actorId:values.actorId??null,notificationType:values.notificationType,projectId:values.projectId??null,messageId:values.messageId??null,deduplicationKey:values.deduplicationKey??null,error});
  return{success:false,message:error instanceof Error?error.message:"Не удалось создать уведомление"};
 }finally{client.release();}
}

function isCategoryAllowed(type:string,p:PreferenceRow){
 const value=type.toLowerCase();
 if(value.includes("chat")||value.includes("message"))return p.chat_updates;
 if(value.includes("bid")||value.includes("invitation")||value.includes("proposal"))return p.bid_updates;
 if(value.includes("dispute")||value.includes("risk")||value.includes("hold"))return p.dispute_updates;
 return p.project_updates;
}
function normalizeNullableText(value:string|null|undefined){if(value===null||value===undefined)return null;const normalized=value.trim();return normalized?normalized:null}
