import Link from "next/link";
import { ArrowRight, Ban, Search, Settings2, UserPlus, UserRound } from "lucide-react";
import { db } from "@/lib/db/pool";

type Props = { searchParams: Promise<{ role?: string; search?: string; blocked?: string }> };
type UserRow = { id:string;role:string;first_name:string|null;last_name:string|null;email:string|null;phone:string|null;city:string|null;is_blocked:boolean;created_at:Date|string };

export default async function AdminUsersPage({ searchParams }: Props) {
  const params=await searchParams;
  const role=params.role?.trim()??"all";
  const search=params.search?.trim()??"";
  const blocked=params.blocked?.trim()??"all";
  const values:unknown[]=[];const conditions:string[]=[];
  if(role!=="all"){values.push(role);conditions.push(`p.role::text = $${values.length}`)}
  if(blocked==="yes"||blocked==="no"){values.push(blocked==="yes");conditions.push(`p.is_blocked = $${values.length}`)}
  if(search){values.push(`%${search}%`);conditions.push(`(p.first_name ILIKE $${values.length} OR p.last_name ILIKE $${values.length} OR p.email ILIKE $${values.length} OR p.phone ILIKE $${values.length})`)}
  const where=conditions.length?`WHERE ${conditions.join(" AND ")}`:"";

  const [usersResult,countsResult]=await Promise.all([
    db.query<UserRow>(`SELECT p.id,p.role::text AS role,p.first_name,p.last_name,p.email,p.phone,p.city,p.is_blocked,p.created_at FROM public.profiles p ${where} ORDER BY p.created_at DESC LIMIT 300`,values),
    db.query<{total:string|number;customers:string|number;contractors:string|number;blocked:string|number}>(`SELECT COUNT(*) AS total,COUNT(*) FILTER (WHERE role::text='customer') AS customers,COUNT(*) FILTER (WHERE role::text='contractor') AS contractors,COUNT(*) FILTER (WHERE is_blocked=true) AS blocked FROM public.profiles`),
  ]);
  const counts=countsResult.rows[0];

  return <div className="space-y-6">
    <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-primary">Пользователи</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground">Управление аккаунтами</h1><p className="mt-2 text-sm text-muted-foreground">Всего: {Number(counts?.total??0)} · заказчиков: {Number(counts?.customers??0)} · подрядчиков: {Number(counts?.contractors??0)} · заблокировано: {Number(counts?.blocked??0)}</p></div>
        <Link href="/admin/users/new" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"><UserPlus className="h-4 w-4"/>Добавить пользователя</Link>
      </div>
    </section>

    <form className="grid gap-3 rounded-[1.5rem] border border-border bg-card p-4 md:grid-cols-[1fr_180px_180px_auto]">
      <label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"/><input name="search" defaultValue={search} placeholder="Имя, email или телефон" className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm"/></label>
      <select name="role" defaultValue={role} className="h-11 rounded-xl border border-border bg-background px-3 text-sm"><option value="all">Все роли</option><option value="customer">Заказчики</option><option value="contractor">Подрядчики</option><option value="manager">Менеджеры</option><option value="moderator">Модераторы</option><option value="admin">Администраторы</option></select>
      <select name="blocked" defaultValue={blocked} className="h-11 rounded-xl border border-border bg-background px-3 text-sm"><option value="all">Все состояния</option><option value="no">Активные</option><option value="yes">Заблокированные</option></select>
      <button className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Найти</button>
    </form>

    <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-soft)]">
      {usersResult.rows.length===0?<div className="p-10 text-center text-sm text-muted-foreground">Пользователи не найдены.</div>:<div className="divide-y divide-border">{usersResult.rows.map(user=>{const name=[user.first_name,user.last_name].filter(Boolean).join(" ")||user.email||"Пользователь";const manageable=["customer","contractor"].includes(user.role);return <div key={user.id} className="flex min-w-0 items-center gap-3 p-5 transition hover:bg-secondary/40">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">{user.is_blocked?<Ban className="h-5 w-5"/>:<UserRound className="h-5 w-5"/>}</span>
        <Link href={`/admin/users/${user.id}`} className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="break-words font-bold text-foreground">{name}</span><span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">{formatRole(user.role)}</span>{user.is_blocked&&<span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Заблокирован</span>}</span><span className="mt-1 block break-all text-sm text-muted-foreground">{user.email??"Электронная почта не указана"}{user.city?` · ${user.city}`:""}</span></Link>
        {manageable&&<Link href={`/admin/users/${user.id}/manage`} title="Управление пользователем" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary hover:bg-secondary"><Settings2 className="h-4 w-4"/></Link>}
        <Link href={`/admin/users/${user.id}`} aria-label="Открыть пользователя" className="shrink-0"><ArrowRight className="h-4 w-4 text-muted-foreground"/></Link>
      </div>})}</div>}
    </section>
  </div>;
}

function formatRole(role:string){const labels:Record<string,string>={customer:"Заказчик",contractor:"Подрядчик",admin:"Администратор",moderator:"Модератор",manager:"Менеджер"};return labels[role]??role}
