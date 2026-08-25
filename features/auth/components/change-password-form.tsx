"use client";

import { useActionState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { changePassword, type ChangePasswordState } from "@/features/auth/actions/change-password";

const initialState: ChangePasswordState = { success: false, message: "" };

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialState);
  return (
    <form action={action} className="space-y-5">
      <label className="block"><span className="text-sm font-semibold text-foreground">Новый пароль</span><input name="password" type="password" required minLength={10} autoComplete="new-password" className="stroy-input mt-2" placeholder="Не менее 10 символов" /></label>
      <label className="block"><span className="text-sm font-semibold text-foreground">Повторите пароль</span><input name="confirmPassword" type="password" required minLength={10} autoComplete="new-password" className="stroy-input mt-2" /></label>
      {state.message && !state.success && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.message}</p>}
      <button disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60">
        {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Сохраняем...</> : <><KeyRound className="h-4 w-4" />Установить новый пароль</>}
      </button>
    </form>
  );
}
