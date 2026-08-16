"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { createUserSession } from "@/lib/auth/session";
import { getRequestIp } from "@/lib/security/rate-limit";
import { loginSchema,type LoginInput } from "@/features/auth/schemas/login-schema";

const LOGIN_WINDOW_MINUTES=15;
const LOGIN_COMPOSITE_MAX_FAILURES=8;
const LOGIN_EMAIL_MAX_FAILURES=20;
const LOGIN_LOCK_MINUTES=15;
const LOGIN_ATTEMPT_RETENTION_HOURS=48;

type UserRow={id:string;password_hash:string|null;is_active:boolean;email_confirmed_at:Date|string|null};
type LoginAttemptRow={attempt_key:string;locked_until:Date|string|null};
type LoginAttemptKeys={composite:string;email:string};

export async function loginUser(input:LoginInput){
 const parsed=loginSchema.safeParse(input);if(!parsed.success)return{success:false,message:"Проверьте введенные данные"};
 const email=parsed.data.email.trim().toLowerCase();const password=parsed.data.password;const attemptKeys=await getLoginAttemptKeys(email);
 await cleanupStaleLoginAttempts();if(await isLoginLocked(attemptKeys))return{success:false,message:"Слишком много попыток входа. Попробуйте позже."};
 const result=await db.query<UserRow>(`SELECT id,password_hash,is_active,email_confirmed_at FROM public.users WHERE lower(email)=$1::text LIMIT 1`,[email]);const user=result.rows[0];
 if(!user||!user.password_hash){await registerLoginFailure(attemptKeys);return{success:false,message:"Неверная электронная почта или пароль"}}
 let matches=false;try{matches=await bcrypt.compare(password,user.password_hash)}catch(error){console.error("Ошибка проверки пароля:",error);return{success:false,message:"Не удалось выполнить вход"}}
 if(!matches){await registerLoginFailure(attemptKeys);return{success:false,message:"Неверная электронная почта или пароль"}}
 if(!user.is_active){await registerLoginFailure(attemptKeys);return{success:false,message:"Учетная запись отключена"}}
 if(!user.email_confirmed_at){await clearLoginFailures(attemptKeys);return{success:false,message:"Подтвердите email перед входом. Можно запросить новое письмо на странице подтверждения."}}
 await clearLoginFailures(attemptKeys);await createUserSession(user.id);redirect("/dashboard");
}

async function getLoginAttemptKeys(email:string):Promise<LoginAttemptKeys>{const ip=await getRequestIp();return{composite:hashAttemptKey(`email-ip\n${email}\n${ip}`),email:hashAttemptKey(`email\n${email}`)}}
function hashAttemptKey(value:string){return crypto.createHash("sha256").update(value).digest("hex")}
async function isLoginLocked(keys:LoginAttemptKeys){const r=await db.query<LoginAttemptRow>(`SELECT attempt_key,locked_until FROM public.auth_login_attempts WHERE attempt_key=ANY($1::text[]) AND locked_until>now()`,[[keys.composite,keys.email]]);return r.rows.length>0}
async function registerLoginFailure(keys:LoginAttemptKeys){await Promise.all([upsertLoginFailure(keys.composite,LOGIN_COMPOSITE_MAX_FAILURES),upsertLoginFailure(keys.email,LOGIN_EMAIL_MAX_FAILURES)])}
async function upsertLoginFailure(key:string,maxFailures:number){await db.query(`INSERT INTO public.auth_login_attempts(attempt_key,failed_count,window_started_at,locked_until,updated_at) VALUES($1::text,1,now(),NULL,now()) ON CONFLICT(attempt_key) DO UPDATE SET failed_count=CASE WHEN auth_login_attempts.window_started_at<=now()-($2::text||' minutes')::interval THEN 1 ELSE auth_login_attempts.failed_count+1 END,window_started_at=CASE WHEN auth_login_attempts.window_started_at<=now()-($2::text||' minutes')::interval THEN now() ELSE auth_login_attempts.window_started_at END,locked_until=CASE WHEN auth_login_attempts.window_started_at<=now()-($2::text||' minutes')::interval THEN NULL WHEN auth_login_attempts.failed_count+1 >= $3::integer THEN now()+($4::text||' minutes')::interval ELSE auth_login_attempts.locked_until END,updated_at=now()`,[key,LOGIN_WINDOW_MINUTES,maxFailures,LOGIN_LOCK_MINUTES])}
async function clearLoginFailures(keys:LoginAttemptKeys){await db.query(`DELETE FROM public.auth_login_attempts WHERE attempt_key=ANY($1::text[])`,[[keys.composite,keys.email]])}
async function cleanupStaleLoginAttempts(){await db.query(`DELETE FROM public.auth_login_attempts WHERE updated_at<now()-($1::text||' hours')::interval`,[LOGIN_ATTEMPT_RETENTION_HOURS])}
