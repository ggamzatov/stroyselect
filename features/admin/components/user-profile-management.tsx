"use client";

import { useState, useTransition } from "react";
import { KeyRound, Save, Trash2, UserRoundPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { deactivateUser, sendTemporaryPassword, updateUserProfile } from "@/features/admin/users/actions/manage-user";

type Props = {
  user: { id: string; firstName: string; lastName: string; phone: string; city: string; role: string; email: string };
};

export function UserProfileManagement({ user }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone);
  const [city, setCity] = useState(user.city);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(task: () => Promise<{ success: boolean; message: string }>) {
    setMessage(null); setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.success) { setError(result.message); return; }
      setMessage(result.message); router.refresh();
    });
  }

  function save() {
    run(() => updateUserProfile({ userId: user.id, firstName, lastName, phone, city }));
  }

  function resetPassword() {
    if (!window.confirm(`Отправить временный пароль на ${user.email}? Все текущие сеансы пользователя будут завершены.`)) return;
    run(() => sendTemporaryPassword(user.id));
  }

  function remove() {
    if (!window.confirm("Деактивировать учётную запись? Пользователь потеряет доступ, а история проектов и аудит сохранятся.")) return;
    run(() => deactivateUser(user.id));
  }

  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Управление пользователем</p><h2 className="mt-1 text-lg font-bold">Профиль и доступ</h2></div><UserRoundPen className="h-5 w-5 text-primary" /></div>

      {editing && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="Имя" value={firstName} onChange={setFirstName} />
          <Field label="Фамилия" value={lastName} onChange={setLastName} />
          <Field label="Телефон" value={phone} onChange={setPhone} />
          <Field label="Город" value={city} onChange={setCity} />
        </div>
      )}

      <div className="mt-5 grid gap-2">
        {!editing ? (
          <button disabled={pending} onClick={() => setEditing(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold hover:bg-secondary"><UserRoundPen className="h-4 w-4" />Редактировать профиль</button>
        ) : (
          <div className="flex gap-2"><button disabled={pending} onClick={save} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><Save className="h-4 w-4" />Сохранить</button><button disabled={pending} onClick={() => setEditing(false)} className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold">Отмена</button></div>
        )}
        <button disabled={pending} onClick={resetPassword} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-800"><KeyRound className="h-4 w-4" />Отправить временный пароль</button>
        <button disabled={pending} onClick={remove} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700"><Trash2 className="h-4 w-4" />Удалить учётную запись</button>
      </div>

      {message && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{message}</p>}
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Удаление выполняется как безопасная деактивация: доступ и сеансы отключаются, но история проектов, договоров и административный аудит сохраняются.</p>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-semibold text-muted-foreground">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="stroy-input mt-1 min-h-10" /></label>;
}
