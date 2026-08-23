import {redirect} from "next/navigation";
import {CheckCircle2,ShieldCheck,TriangleAlert} from "lucide-react";
import {db} from "@/lib/db/pool";
import {requireStaffUser} from "@/lib/auth/require-staff-user";
import {ReleaseChecklistControl} from "@/features/admin/components/release-checklist-control";

type Row={key:string;label:string;required:boolean;category:string;completed_at:Date|string|null;note:string|null};
const categoryOrder=["legal","infrastructure","operations","product","payments"] as const;
const categoryLabels:Record<string,string>={legal:"Право и персональные данные",infrastructure:"Инфраструктура и безопасность",operations:"Эксплуатация и мониторинг",product:"Продукт и пользовательские сценарии",payments:"Онлайн-платежи (отложено)"};

export default async function AdminReleasePage(){
 const{profile}=await requireStaffUser();if(profile.role!=="admin")redirect("/admin/dashboard");
 const result=await db.query<Row>(`SELECT key,label,required,category,completed_at,note FROM public.release_checklist ORDER BY required DESC,label ASC`);
 const items=result.rows.map(r=>({key:r.key,label:r.label,required:r.required,category:r.category,completedAt:r.completed_at?r.completed_at instanceof Date?r.completed_at.toISOString():String(r.completed_at):null,note:r.note}));
 const required=items.filter(i=>i.required);const done=required.filter(i=>i.completedAt).length;const ready=required.length>0&&done===required.length;
 return <div className="space-y-6">
  <section className="rounded-[2rem] border border-border bg-card p-6 md:p-8"><p className="text-sm font-semibold text-primary">Контроль публичного запуска</p><div className="mt-2 flex min-w-0 flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h1 className="break-words text-3xl font-black">Готовность к запуску</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Запуск разрешён только после подтверждения обязательных юридических, инфраструктурных, операционных и продуктовых проверок. Платежный контур не блокирует релиз, пока онлайн-платежи отключены.</p></div><div className={`shrink-0 rounded-2xl px-4 py-3 ${ready?"bg-emerald-50 text-emerald-800":"bg-amber-50 text-amber-900"}`}>{ready?<CheckCircle2 className="mx-auto h-6 w-6"/>:<TriangleAlert className="mx-auto h-6 w-6"/>}<p className="mt-1 text-center text-xs font-bold">{ready?"Готово":"Есть блокеры"}</p></div></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{width:`${required.length?Math.round(done/required.length*100):0}%`}}/></div><p className="mt-2 text-xs text-muted-foreground">Подтверждено {done} из {required.length} обязательных пунктов.</p></section>
  {categoryOrder.map(category=>{const group=items.filter(item=>item.category===category);if(!group.length)return null;const groupRequired=group.filter(item=>item.required);const groupDone=groupRequired.filter(item=>item.completedAt).length;return <section key={category} className="space-y-4"><div className="flex min-w-0 flex-wrap items-end justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-xl font-black">{categoryLabels[category]}</h2><p className="mt-1 text-xs text-muted-foreground">{groupRequired.length?`${groupDone} из ${groupRequired.length} обязательных проверок подтверждено`:"Не блокирует текущий запуск"}</p></div></div><div className="grid gap-4 xl:grid-cols-2">{group.map(item=><ReleaseChecklistControl key={item.key} item={item}/>)}</div></section>})}
  <section className="rounded-2xl border border-border bg-secondary/35 p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-primary"/><p className="text-sm leading-6 text-muted-foreground">Отметка администратора — операционное подтверждение. Для технических пунктов прикладывайте в комментарии дату проверки, среду и результат; для юридических — реквизиты документа или заключения. Чек-лист не заменяет обязательные юридические действия.</p></div></section>
 </div>;
}
