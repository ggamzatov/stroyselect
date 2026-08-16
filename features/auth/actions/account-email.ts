"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db/pool";
import { enforceRateLimit,getRequestIp,rateLimitMessage } from "@/lib/security/rate-limit";
import { getAppBaseUrl,sendTransactionalEmail } from "@/lib/email/send-transactional-email";
import { cleanupExpiredAccountTokens,consumeAccountEmailToken,issueAccountEmailToken } from "@/features/auth/server/account-email-token";

type State={success:boolean;message:string};
const emailSchema=z.string().trim().email();
const passwordSchema=z.string().min(8).refine(v=>new TextEncoder().encode(v).length<=72,"Пароль слишком длинный");

export async function requestPasswordReset(_:State|null,formData:FormData):Promise<State>{
 const email=String(formData.get("email")??"").trim().toLowerCase();if(!emailSchema.safeParse(email).success)return{success:false,message:"Введите корректную почту"};
 const ip=await getRequestIp();const limited=await enforceRateLimit({scope:"password-reset:request",identity:`${email}\n${ip}`,limit:3,windowSeconds:3600,blockSeconds:3600});if(!limited.allowed)return{success:false,message:rateLimitMessage(limited)};
 await cleanupExpiredAccountTokens();const r=await db.query<{id:string}>(`SELECT id FROM public.users WHERE lower(email)=$1::text AND is_active=true LIMIT 1`,[email]);const user=r.rows[0];
 if(user){const token=await issueAccountEmailToken(user.id,"reset_password",30);const url=`${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;await sendTransactionalEmail({to:email,subject:"Сброс пароля StroySelect",html:`<p>Для смены пароля откройте ссылку:</p><p><a href="${url}">Сбросить пароль</a></p><p>Ссылка действует 30 минут.</p>`});}
 return{success:true,message:"Если такой аккаунт существует, инструкция отправлена на почту."};
}

export async function resetPassword(_:State|null,formData:FormData):Promise<State>{
 const token=String(formData.get("token")??"");const password=String(formData.get("password")??"");const confirm=String(formData.get("confirmPassword")??"");const parsed=passwordSchema.safeParse(password);if(!token||!parsed.success)return{success:false,message:parsed.success?"Ссылка недействительна":"Пароль должен содержать минимум 8 символов"};if(password!==confirm)return{success:false,message:"Пароли не совпадают"};
 const ip=await getRequestIp();const limited=await enforceRateLimit({scope:"password-reset:consume",identity:ip,limit:10,windowSeconds:3600,blockSeconds:1800});if(!limited.allowed)return{success:false,message:rateLimitMessage(limited)};
 const hash=await bcrypt.hash(password,12);const client=await db.connect();try{await client.query("BEGIN");const userId=await consumeAccountEmailToken(token,"reset_password",client);if(!userId){await client.query("ROLLBACK");return{success:false,message:"Ссылка истекла или уже использована"}}await client.query(`UPDATE public.users SET password_hash=$1::text WHERE id=$2::uuid`,[hash,userId]);await client.query(`UPDATE public.auth_sessions SET revoked_at=now() WHERE user_id=$1::uuid AND revoked_at IS NULL`,[userId]);await client.query("COMMIT");return{success:true,message:"Пароль изменён. Теперь можно войти."}}catch(error){await client.query("ROLLBACK");console.error("Password reset failed",error);return{success:false,message:"Не удалось изменить пароль"}}finally{client.release()}}

export async function confirmEmail(_:State|null,formData:FormData):Promise<State>{
 const token=String(formData.get("token")??"");if(!token)return{success:false,message:"Ссылка подтверждения недействительна"};const client=await db.connect();try{await client.query("BEGIN");const userId=await consumeAccountEmailToken(token,"verify_email",client);if(!userId){await client.query("ROLLBACK");return{success:false,message:"Ссылка истекла или уже использована"}}await client.query(`UPDATE public.users SET email_confirmed_at=COALESCE(email_confirmed_at,now()) WHERE id=$1::uuid`,[userId]);await client.query("COMMIT");return{success:true,message:"Email подтверждён. Теперь можно войти."}}catch(error){await client.query("ROLLBACK");console.error("Email confirmation failed",error);return{success:false,message:"Не удалось подтвердить email"}}finally{client.release()}}

export async function resendVerification(_:State|null,formData:FormData):Promise<State>{
 const email=String(formData.get("email")??"").trim().toLowerCase();if(!emailSchema.safeParse(email).success)return{success:false,message:"Введите корректную почту"};const ip=await getRequestIp();const limited=await enforceRateLimit({scope:"verify-email:resend",identity:`${email}\n${ip}`,limit:3,windowSeconds:3600,blockSeconds:3600});if(!limited.allowed)return{success:false,message:rateLimitMessage(limited)};
 const r=await db.query<{id:string;email_confirmed_at:string|null}>(`SELECT id,email_confirmed_at FROM public.users WHERE lower(email)=$1::text AND is_active=true LIMIT 1`,[email]);const user=r.rows[0];if(user&&!user.email_confirmed_at){const token=await issueAccountEmailToken(user.id,"verify_email",60);const url=`${getAppBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;await sendTransactionalEmail({to:email,subject:"Подтвердите email StroySelect",html:`<p>Подтвердите адрес электронной почты:</p><p><a href="${url}">Подтвердить email</a></p><p>Ссылка действует 60 минут.</p>`});}
 return{success:true,message:"Если подтверждение требуется, новое письмо отправлено."};
}
