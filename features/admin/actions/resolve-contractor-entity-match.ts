"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";

const schema=z.object({id:z.string().uuid(),decision:z.enum(["same_entity","not_duplicate"]),note:z.string().trim().max(1000).optional()});

export async function resolveContractorEntityMatch(input:{id:string;decision:"same_entity"|"not_duplicate";note?:string}){
 const parsed=schema.safeParse(input);if(!parsed.success)return{success:false,message:"Некорректные данные"};
 const {user,profile}=await requireStaffUser();
 if(profile.role!=="admin")return{success:false,message:"Действие доступно только администратору"};
 const result=await db.query<{id:string}>(`
   UPDATE public.contractor_entity_matches
   SET status=$2,resolved_by=$3::uuid,resolved_at=now(),resolution_note=NULLIF(trim($4),'')
   WHERE id=$1::uuid AND status='open'
   RETURNING id
 `,[parsed.data.id,parsed.data.decision,user.id,parsed.data.note??""]);
 if(!result.rows[0])return{success:false,message:"Совпадение уже обработано или не найдено"};
 await db.query(`INSERT INTO public.admin_audit_log(actor_id,action,entity_type,entity_id,reason,metadata) VALUES($1::uuid,'resolve_contractor_entity_match','contractor_entity_match',$2,$3,jsonb_build_object('decision',$4))`,[user.id,parsed.data.id,parsed.data.note??null,parsed.data.decision]);
 revalidatePath("/admin/data-quality");
 return{success:true,message:parsed.data.decision==="same_entity"?"Компании отмечены как одна сущность":"Совпадение отмечено как не являющееся дублем"};
}
