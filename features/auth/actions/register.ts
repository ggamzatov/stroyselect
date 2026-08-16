"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { enforceRateLimit,getRequestIp,rateLimitMessage } from "@/lib/security/rate-limit";
import { getAppBaseUrl,sendTransactionalEmail } from "@/lib/email/send-transactional-email";
import { issueAccountEmailToken } from "@/features/auth/server/account-email-token";
import { registerSchema,type RegisterInput } from "@/features/auth/schemas/register-schema";

export type RegisterState={success:boolean;message?:string;fieldErrors?:Partial<Record<keyof RegisterInput,string[]>>};
type ExistingUserRow={id:string};

export async function registerUser(input:RegisterInput):Promise<RegisterState>{
 const parsed=registerSchema.safeParse(input);if(!parsed.success)return{success:false,message:"Проверьте заполнение формы",fieldErrors:parsed.error.flatten().fieldErrors};
 const email=parsed.data.email.trim().toLowerCase();const ip=await getRequestIp();const [ipLimit,emailLimit]=await Promise.all([enforceRateLimit({scope:"register:ip",identity:ip,limit:5,windowSeconds:3600,blockSeconds:3600}),enforceRateLimit({scope:"register:email-ip",identity:`${email}\n${ip}`,limit:3,windowSeconds:3600,blockSeconds:3600})]);const rejected=!ipLimit.allowed?ipLimit:!emailLimit.allowed?emailLimit:null;if(rejected)return{success:false,message:rateLimitMessage(rejected)};
 const existing=await db.query<ExistingUserRow>(`SELECT id FROM public.users WHERE lower(email)=$1::text LIMIT 1`,[email]);if(existing.rows[0])return{success:false,message:"Пользователь с такой почтой уже зарегистрирован."};
 const {role,firstName,lastName,password}=parsed.data;const passwordHash=await bcrypt.hash(password,12);const client=await db.connect();let verificationToken="";
 try{await client.query("BEGIN");const userResult=await client.query<{id:string}>(`INSERT INTO public.users(id,email,password_hash,email_confirmed_at,raw_user_meta_data,is_active) VALUES(gen_random_uuid(),$1::text,$2::text,NULL,$3::jsonb,true) RETURNING id`,[email,passwordHash,JSON.stringify({role,first_name:firstName,last_name:lastName??null})]);const userId=userResult.rows[0]?.id;if(!userId)throw new Error("Не удалось создать пользователя");await client.query(`INSERT INTO public.profiles(id,role,first_name,last_name,email,is_blocked) VALUES($1::uuid,$2,$3,$4,$5::text,false)`,[userId,role,firstName,lastName??null,email]);verificationToken=await issueAccountEmailToken(userId,"verify_email",60,client);await client.query("COMMIT")}catch(error){await client.query("ROLLBACK");console.error("Ошибка локальной регистрации:",error);return{success:false,message:"Не удалось создать учётную запись"}}finally{client.release()}
 try{const url=`${getAppBaseUrl()}/verify-email?token=${encodeURIComponent(verificationToken)}`;await sendTransactionalEmail({to:email,subject:"Подтвердите email StroySelect",html:`<p>Спасибо за регистрацию в StroySelect.</p><p><a href="${url}">Подтвердить email</a></p><p>Ссылка действует 60 минут.</p>`})}catch(error){console.error("Verification email setup failed",error)}
 redirect(`/registration-success?email=${encodeURIComponent(email)}`);
}
