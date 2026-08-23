import Link from "next/link";
import { CheckCircle2, FileSignature, LockKeyhole } from "lucide-react";

type Props={projectId:string;role:"customer"|"contractor";unlocked:boolean;message?:string};

export function ProjectExecutionGateBanner({projectId,role,unlocked,message}:Props){
  if(unlocked){
    return <div className="border-b border-emerald-200 bg-emerald-50/80"><div className="app-container flex items-center gap-3 py-3 text-sm text-emerald-900"><CheckCircle2 className="h-4 w-4 shrink-0"/><span><strong>Договор подписан.</strong> Этапы работ и расчёты по проекту открыты.</span></div></div>;
  }
  const href=`/${role}/work/${projectId}/contract`;
  return <div className="border-b border-amber-200 bg-amber-50/90"><div className="app-container flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3 text-sm text-amber-950"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/><p className="min-w-0"><strong>Рабочая часть проекта пока закрыта.</strong> {message??"Сначала сформируйте и подпишите договор обеими сторонами. После этого откроются этапы, документы, замечания, споры и расчёты."}</p></div><Link href={href} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 text-xs font-bold text-white"><FileSignature className="h-4 w-4"/>Перейти к договору</Link></div></div>;
}
