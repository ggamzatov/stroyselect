import Link from "next/link";
import { ResendVerificationForm } from "@/features/auth/components/account-email-forms";

type Props={searchParams:Promise<{email?:string}>};
export default async function RegistrationSuccessPage({searchParams}:Props){const {email}=await searchParams;return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"><div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm"><h1 className="text-3xl font-bold text-slate-950">Проверьте электронную почту</h1><p className="mt-4 text-slate-600">Аккаунт создан, но вход станет доступен после подтверждения email. Ссылка действует 60 минут.</p><ResendVerificationForm defaultEmail={email}/><Link href="/login" className="mt-6 inline-flex rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white">Перейти ко входу</Link></div></main>}
