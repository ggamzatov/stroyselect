"use client";

import Link from "next/link";
import { useState } from "react";
import { loginUser } from "@/features/auth/actions/login";

export function LoginForm(){
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [message,setMessage]=useState("");const [isLoading,setIsLoading]=useState(false);
 async function handleSubmit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setMessage("");setIsLoading(true);try{const result=await loginUser({email:email.trim(),password});if(result&&!result.success){setMessage(result.message??"Не удалось выполнить вход");setIsLoading(false)}}catch(error){if(isNextRedirectError(error))throw error;console.error("Ошибка входа:",error);setMessage("Не удалось выполнить вход");setIsLoading(false)}}
 return <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl border bg-white p-6">
  <div className="space-y-2"><label htmlFor="email" className="text-sm font-medium">Электронная почта</label><input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" className="h-11 w-full rounded-md border px-3"/></div>
  <div className="mt-4 space-y-2"><div className="flex items-center justify-between gap-3"><label htmlFor="password" className="text-sm font-medium">Пароль</label><Link href="/forgot-password" className="text-xs font-semibold text-blue-700 hover:underline">Забыли пароль?</Link></div><input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" className="h-11 w-full rounded-md border px-3"/></div>
  <button type="submit" disabled={isLoading} className="mt-5 h-11 w-full rounded-md bg-black text-white disabled:cursor-not-allowed disabled:opacity-60">{isLoading?"Выполняется вход...":"Войти"}</button>
  {message&&<p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</p>}
  <div className="mt-4 flex flex-wrap justify-between gap-3 text-xs"><Link href={`/verify-email${email?`?email=${encodeURIComponent(email.trim())}`:""}`} className="font-semibold text-slate-600 hover:underline">Не пришло подтверждение?</Link><Link href="/register" className="font-semibold text-blue-700 hover:underline">Создать аккаунт</Link></div>
 </form>;
}

function isNextRedirectError(error:unknown){if(typeof error!=="object"||error===null||!("digest" in error))return false;const digest=(error as{digest?:unknown}).digest;return typeof digest==="string"&&digest.startsWith("NEXT_REDIRECT")}
