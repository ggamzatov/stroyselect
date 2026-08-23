"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";

const schema=z.object({alertKey:z.string().trim().min(3).max(300),status:z.enum(["open","in_progress","resolved","ignored"]),note:z.string().trim().max(1200).optional()});

export async function updateOperationalAlert(input:{alertKey:string;status:"open"|"in_progress"|"resolved"|"ignored";note?:string}){
 const parsed=schema.safeParse(input);if(!parsed.success)return{success:false,message:"Некорректные данные"};
 const {user}=await requireStaffUser();
 await db.query(`
   INSERT INTO public.marketplace_operational_alert_states(alert_key,status,assigned_to,note,updated_by,updated_at)
   VALUES($1,$2,CASE WHEN $2='in_progress' THEN $3::uuid ELSE NULL END,NULLIF(trim($4),''),$3::uuid,now())
   ON CONFLICT(alert_key) DO UPDATE SET status=EXCLUDED.status,assigned_to=CASE WHEN EXCLUDED.status='in_progress' THEN COALESCE(marketplace_operational_alert_states.assigned_to,EXCLUDED.updated_by) ELSE marketplace_operational_alert_states.assigned_to END,note=EXCLUDED.note,updated_by=EXCLUDED.updated_by,updated_at=now()
 `,[parsed.data.alertKey,parsed.data.status,user.id,parsed.data.note??""]);
 revalidatePath("/admin/operations");
 return{success:true,message:parsed.data.status==="resolved"?"Предупреждение закрыто":parsed.data.status==="ignored"?"Предупреждение скрыто":parsed.data.status==="in_progress"?"Взято в работу":"Предупреждение открыто"};
}
