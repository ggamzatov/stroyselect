import "server-only";
import crypto from "node:crypto";
import type { PoolClient } from "pg";
import { db } from "@/lib/db/pool";

export type AccountTokenPurpose="verify_email"|"reset_password";

export async function issueAccountEmailToken(userId:string,purpose:AccountTokenPurpose,ttlMinutes:number,client?:PoolClient){
  const raw=crypto.randomBytes(32).toString("base64url");
  const hash=hashToken(raw);
  const runner=client??db;
  await runner.query(`DELETE FROM public.auth_email_tokens WHERE user_id=$1::uuid AND purpose=$2::varchar(32) AND used_at IS NULL`,[userId,purpose]);
  await runner.query(`INSERT INTO public.auth_email_tokens(user_id,purpose,token_hash,expires_at) VALUES($1::uuid,$2::varchar(32),$3::char(64),now()+($4::text||' minutes')::interval)`,[userId,purpose,hash,Math.max(1,Math.trunc(ttlMinutes))]);
  return raw;
}

export async function consumeAccountEmailToken(raw:string,purpose:AccountTokenPurpose,client:PoolClient){
  const result=await client.query<{id:string;user_id:string}>(`SELECT id,user_id FROM public.auth_email_tokens WHERE token_hash=$1::char(64) AND purpose=$2::varchar(32) AND used_at IS NULL AND expires_at>now() LIMIT 1 FOR UPDATE`,[hashToken(raw),purpose]);
  const row=result.rows[0];
  if(!row)return null;
  await client.query(`UPDATE public.auth_email_tokens SET used_at=now() WHERE id=$1::uuid`,[row.id]);
  return row.user_id;
}

export async function cleanupExpiredAccountTokens(){
  await db.query(`DELETE FROM public.auth_email_tokens WHERE expires_at<now()-interval '24 hours' OR used_at<now()-interval '24 hours'`);
}

function hashToken(value:string){return crypto.createHash("sha256").update(value).digest("hex")}
