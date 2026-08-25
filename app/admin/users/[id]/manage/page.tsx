import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db/pool";
import { UserProfileManagement } from "@/features/admin/components/user-profile-management";

export default async function AdminManageUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await db.query<{ id:string;role:string;first_name:string|null;last_name:string|null;email:string|null;phone:string|null;city:string|null }>(`
    SELECT id,role::text AS role,first_name,last_name,email,phone,city
    FROM public.profiles
    WHERE id=$1::uuid AND role::text IN ('customer','contractor')
    LIMIT 1
  `,[id]);
  const user=result.rows[0];
  if(!user) notFound();
  const name=[user.first_name,user.last_name].filter(Boolean).join(" ")||user.email||"Пользователь";

  return (
    <div className="space-y-6">
      <Link href={`/admin/users/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />К карточке пользователя</Link>
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><ShieldCheck className="h-5 w-5" /></div><div className="min-w-0"><p className="text-sm font-semibold text-primary">Управление аккаунтом</p><h1 className="mt-1 break-words text-3xl font-bold tracking-tight">{name}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Редактирование основных данных, безопасная деактивация учётной записи и выдача временного пароля с обязательной сменой после входа.</p></div></div>
      </section>
      <div className="mx-auto max-w-2xl"><UserProfileManagement user={{id:user.id,firstName:user.first_name??"",lastName:user.last_name??"",phone:user.phone??"",city:user.city??"",role:user.role,email:user.email??""}} /></div>
    </div>
  );
}
