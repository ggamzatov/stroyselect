"use client";

import { useState, useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createManagedUser } from "@/features/admin/users/actions/manage-user";

export function CreateManagedUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"customer" | "contractor">("customer");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await createManagedUser({ email, role, firstName, lastName });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      setEmail("");
      setFirstName("");
      setLastName("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Имя" value={firstName} onChange={setFirstName} required />
        <Field label="Фамилия" value={lastName} onChange={setLastName} />
      </div>
      <Field label="Электронная почта" type="email" value={email} onChange={setEmail} required />
      <label className="block">
        <span className="text-sm font-semibold text-foreground">Тип пользователя</span>
        <select value={role} onChange={(event) => setRole(event.target.value as "customer" | "contractor")} className="stroy-select mt-2">
          <option value="customer">Заказчик</option>
          <option value="contractor">Подрядчик</option>
        </select>
      </label>
      <div className="rounded-xl border border-border bg-secondary/35 p-4 text-sm leading-6 text-muted-foreground">
        Пользователь получит письмо со ссылкой подтверждения и временным паролем. При первом входе система потребует установить новый пароль.
      </div>
      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{message}</p>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
      <button disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60">
        {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Создаём...</> : <><UserPlus className="h-4 w-4" />Создать пользователя</>}
      </button>
    </form>
  );
}

function Field({ label, type = "text", value, onChange, required = false }: { label: string; type?: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="block"><span className="text-sm font-semibold text-foreground">{label}</span><input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="stroy-input mt-2" /></label>;
}
