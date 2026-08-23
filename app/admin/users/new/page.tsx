import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { CreateManagedUserForm } from "@/features/admin/components/create-managed-user-form";

export default function AdminCreateUserPage() {
  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />К пользователям</Link>
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><UserPlus className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-primary">Администрирование</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Создать пользователя</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Создайте учётную запись заказчика или подрядчика. Временный пароль не отображается администратору после создания — он отправляется непосредственно пользователю по электронной почте.</p></div></div>
      </section>
      <section className="mx-auto max-w-2xl rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8"><CreateManagedUserForm /></section>
    </div>
  );
}
