"use client";

import Link from "next/link";
import { useActionState } from "react";
import { confirmEmail,requestPasswordReset,resendVerification,resetPassword } from "@/features/auth/actions/account-email";

type State={success:boolean;message:string}|null;

export function ForgotPasswordForm(){
 const [state,action,pending]=useActionState<State,FormData>(requestPasswordReset,null);
 return <AuthCard title="Восстановление пароля" description="Укажите почту аккаунта. Мы отправим одноразовую ссылку для смены пароля.">
  <form action={action} className="space-y-4"><Field label="Электронная почта" name="email" type="email" autoComplete="email" required/><Submit pending={pending} idle="Отправить ссылку" busy="Отправляем..."/><Message state={state}/></form>
  <AuthLinks/>
 </AuthCard>;
}

export function ResetPasswordForm({token}:{token:string}){
 const [state,action,pending]=useActionState<State,FormData>(resetPassword,null);
 return <AuthCard title="Новый пароль" description="Задайте новый пароль. После смены пароля все старые сессии аккаунта будут завершены.">
  {!token?<Message state={{success:false,message:"В ссылке отсутствует токен восстановления."}}/>:<form action={action} className="space-y-4"><input type="hidden" name="token" value={token}/><Field label="Новый пароль" name="password" type="password" autoComplete="new-password" minLength={8} required/><Field label="Повторите пароль" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required/><Submit pending={pending} idle="Изменить пароль" busy="Сохраняем..."/><Message state={state}/></form>}
  <AuthLinks/>
 </AuthCard>;
}

export function VerifyEmailForm({token,defaultEmail}:{token:string;defaultEmail?:string}){
 const [verifyState,verifyAction,verifyPending]=useActionState<State,FormData>(confirmEmail,null);
 const [resendState,resendAction,resendPending]=useActionState<State,FormData>(resendVerification,null);
 return <AuthCard title="Подтверждение email" description="Подтвердите адрес, чтобы активировать вход в StroySelect.">
  {token?<form action={verifyAction} className="space-y-4"><input type="hidden" name="token" value={token}/><Submit pending={verifyPending} idle="Подтвердить email" busy="Подтверждаем..."/><Message state={verifyState}/></form>:<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Ссылка подтверждения отсутствует. Запросите новое письмо ниже.</p>}
  <div className="my-6 border-t"/>
  <form action={resendAction} className="space-y-4"><Field label="Отправить новое письмо" name="email" type="email" defaultValue={defaultEmail} autoComplete="email" required/><Submit pending={resendPending} idle="Отправить повторно" busy="Отправляем..." secondary/><Message state={resendState}/></form>
  <AuthLinks/>
 </AuthCard>;
}

export function ResendVerificationForm({defaultEmail}:{defaultEmail?:string}){
 const [state,action,pending]=useActionState<State,FormData>(resendVerification,null);
 return <form action={action} className="mt-6 space-y-3 text-left"><Field label="Не пришло письмо?" name="email" type="email" defaultValue={defaultEmail} autoComplete="email" required/><Submit pending={pending} idle="Отправить письмо ещё раз" busy="Отправляем..." secondary/><Message state={state}/></form>;
}

function AuthCard({title,description,children}:{title:string;description:string;children:React.ReactNode}){return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"><section className="w-full max-w-md rounded-2xl border bg-white p-7 shadow-sm"><h1 className="text-3xl font-black tracking-tight text-slate-950">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p><div className="mt-6">{children}</div></section></main>}
function Field({label,...props}:React.InputHTMLAttributes<HTMLInputElement>&{label:string}){return <label className="block text-sm font-semibold text-slate-800"><span>{label}</span><input {...props} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal outline-none focus:border-blue-600"/></label>}
function Submit({pending,idle,busy,secondary=false}:{pending:boolean;idle:string;busy:string;secondary?:boolean}){return <button disabled={pending} className={`min-h-11 w-full rounded-xl px-4 font-bold disabled:cursor-not-allowed disabled:opacity-60 ${secondary?"border border-slate-300 bg-white text-slate-900":"bg-blue-700 text-white"}`}>{pending?busy:idle}</button>}
function Message({state}:{state:State}){return state?<p className={`rounded-xl p-3 text-sm ${state.success?"bg-emerald-50 text-emerald-800":"bg-red-50 text-red-800"}`}>{state.message}</p>:null}
function AuthLinks(){return <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm"><Link href="/login" className="font-semibold text-blue-700 hover:underline">Войти</Link><Link href="/register" className="font-semibold text-slate-600 hover:underline">Регистрация</Link></div>}
