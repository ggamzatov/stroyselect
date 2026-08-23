"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";

import { createStagePayment } from "@/features/payments/actions/create-stage-payment";

export function StagePaymentButton({projectId,stageId,disabled=false}:{projectId:string;stageId:string;disabled?:boolean}){
  const [message,setMessage]=useState("");
  const [pending,startTransition]=useTransition();
  const pay=()=>{
    setMessage("");
    startTransition(async()=>{
      const result=await createStagePayment(projectId,stageId);
      if(!result.success){setMessage(result.message);return;}
      if(result.confirmationUrl){window.location.assign(result.confirmationUrl);return;}
      setMessage(result.message);
    });
  };
  return <div className="mt-3">
    <button type="button" onClick={pay} disabled={disabled||pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
      <CreditCard className="h-4 w-4"/>{pending?"Создаём платёж…":"Оплатить этап через ЮKassa"}
    </button>
    {message&&<p className="mt-2 break-words text-xs font-semibold text-muted-foreground">{message}</p>}
  </div>;
}
