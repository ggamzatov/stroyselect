"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";

const schema=z.object({key:z.string().trim().min(1).max(100),completed:z.boolean(),note:z.string().trim().max(1000).optional()});

export async function updateReleaseChecklist(input:{key:string;completed:boolean;note?:string}){
 const parsed=schema.safeParse(input);if(!parsed.success)return{success:false,message:parsed.error.issues[0]?.message??"Некорректные данные"};
 const {user,profile}=await requireStaffUser();
 if(profile.role!=="admin")return{success:false,message:"Изменять готовность релиза может только администратор"};
 const result=await db.query<{key:string}>(`
   UPDATE public.release_checklist
   SET completed_at=CASE WHEN $2 THEN now() ELSE NULL END,
       completed_by=CASE WHEN $2 THEN $3::uuid ELSE NULL END,
       note=NULLIF(trim($4),'') ,updated_at=now()
   WHERE key=$1 RETURNING key
 `,[parsed.data.key,parsed.data.completed,user.id,parsed.data.note??""]);
 if(!result.rows[0])return{success:false,message:"Пункт проверки не найден"};
 revalidatePath("/admin/release");
 return{success:true,message:parsed.data.completed?"Пункт отмечен выполненным":"Отметка снята"};
}
