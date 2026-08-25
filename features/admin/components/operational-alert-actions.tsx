"use client";

import { useState, useTransition } from "react";
import { updateOperationalAlert } from "@/features/admin/actions/update-operational-alert";

export function OperationalAlertActions({alertKey,status}:{alertKey:string;status:string}){
 const [message,setMessage]=useState("");const [pending,startTransition]=useTransition();
 const run=(next:"in_progress"|"resolved"|"ignored")=>startTransition(async()=>{const result=await updateOperationalAlert({alertKey,status:next});setMessage(result.message)});
 return <div className="mt-4"><div className="flex flex-wrap gap-2">{status!=="in_progress"&&<button disabled={pending} onClick={()=>run("in_progress")} className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold disabled:opacity-50">В работу</button>}<button disabled={pending} onClick={()=>run("resolved")} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">Закрыть</button><button disabled={pending} onClick={()=>run("ignored")} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground disabled:opacity-50">Игнорировать</button></div>{message&&<p className="mt-2 text-xs text-muted-foreground">{message}</p>}</div>;
}
