"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { registerUser } from "@/features/auth/actions/register";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas/register-schema";

export function RegisterForm() {
  const router=useRouter(); const [pending,startTransition]=useTransition(); const [serverError,setServerError]=useState<string|null>(null);
  const {register,handleSubmit,watch,formState:{errors}}=useForm<RegisterInput>({resolver:zodResolver(registerSchema),defaultValues:{role:"customer",firstName:"",lastName:"",email:"",password:"",confirmPassword:"",termsAccepted:false as never,personalDataConsent:false as never}});
  const role=watch("role");
  function submit(values:RegisterInput){setServerError(null);startTransition(async()=>{const result=await registerUser(values);if(!result.success){setServerError(result.message??"Не удалось выполнить регистрацию");return}router.refresh()})}
  return <form onSubmit={handleSubmit(submit)} className="space-y-5">
    <fieldset><legend className="text-sm font-bold">Как вы будете использовать сервис?</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className={`cursor-pointer rounded-2xl border p-4 ${role==="customer"?"border-primary bg-secondary":"border-border"}`}><input type="radio" value="customer" className="sr-only" {...register("role")}/><strong>Я заказчик</strong><p className="mt-1 text-xs text-muted-foreground">Размещаю проекты и выбираю подрядчиков.</p></label>
      <label className={`cursor-pointer rounded-2xl border p-4 ${role==="contractor"?"border-primary bg-secondary":"border-border"}`}><input type="radio" value="contractor" className="sr-only" {...register("role")}/><strong>Я подрядчик</strong><p className="mt-1 text-xs text-muted-foreground">Получаю заказы и выполняю работы.</p></label>
    </div></fieldset>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Имя" error={errors.firstName?.message}><input className="stroy-input" autoComplete="given-name" {...register("firstName")}/></Field><Field label="Фамилия" error={errors.lastName?.message}><input className="stroy-input" autoComplete="family-name" {...register("lastName")}/></Field></div>
    <Field label="Электронная почта" error={errors.email?.message}><input type="email" className="stroy-input" autoComplete="email" {...register("email")}/></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Пароль" error={errors.password?.message}><input type="password" className="stroy-input" autoComplete="new-password" {...register("password")}/></Field><Field label="Повторите пароль" error={errors.confirmPassword?.message}><input type="password" className="stroy-input" autoComplete="new-password" {...register("confirmPassword")}/></Field></div>
    <div className="space-y-3">
      <Consent error={errors.termsAccepted?.message}><input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--primary)]" {...register("termsAccepted")}/><span>Я принимаю <Link className="font-semibold text-primary underline" href="/legal/terms" target="_blank">Пользовательское соглашение</Link> и ознакомлен с <Link className="font-semibold text-primary underline" href="/legal/privacy" target="_blank">Политикой обработки персональных данных</Link>.</span></Consent>
      <Consent error={errors.personalDataConsent?.message}><input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--primary)]" {...register("personalDataConsent")}/><span>Я отдельно даю <Link className="font-semibold text-primary underline" href="/legal/personal-data-consent" target="_blank">согласие на обработку персональных данных</Link>.</span></Consent>
    </div>
    {serverError&&<div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{serverError}</div>}
    <button type="submit" disabled={pending} className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50">{pending&&<Loader2 className="h-4 w-4 animate-spin"/>}{pending?"Создаём аккаунт...":"Создать аккаунт"}</button>
  </form>;
}
function Field({label,error,children}:{label:string;error?:string;children:React.ReactNode}){return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span>{children}{error&&<span className="mt-2 block text-sm font-medium text-destructive">{error}</span>}</label>}
function Consent({error,children}:{error?:string;children:React.ReactNode}){return <div><label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background/60 p-4 text-sm leading-6 text-muted-foreground">{children}</label>{error&&<p className="mt-2 text-sm font-medium text-destructive">{error}</p>}</div>}
