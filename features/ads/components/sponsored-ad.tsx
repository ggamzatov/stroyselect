"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

type Props={orderId:string;title:string;body:string;destinationUrl:string;advertiserName:string;advertiserInn:string;erid:string;placementName:string};

export function SponsoredAd({orderId,title,body,destinationUrl,advertiserName,advertiserInn,erid,placementName}:Props){
  const ref=useRef<HTMLElement|null>(null);
  const pathname=usePathname();

  useEffect(()=>{
    const node=ref.current;if(!node)return;
    const keyName=`stroyselect:ad:impression:${orderId}:${pathname}`;
    const observer=new IntersectionObserver((entries)=>{
      if(!entries.some((entry)=>entry.isIntersecting&&entry.intersectionRatio>=0.5))return;
      observer.disconnect();
      if(sessionStorage.getItem(keyName))return;
      const eventKey=crypto.randomUUID();
      sessionStorage.setItem(keyName,eventKey);
      void fetch("/api/ads/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId,eventType:"impression",eventKey,pagePath:pathname}),keepalive:true});
    },{threshold:[0.5]});
    observer.observe(node);return()=>observer.disconnect();
  },[orderId,pathname]);

  function trackClick(){
    const payload=JSON.stringify({orderId,eventType:"click",eventKey:crypto.randomUUID(),pagePath:pathname});
    if(navigator.sendBeacon){navigator.sendBeacon("/api/ads/events",new Blob([payload],{type:"application/json"}));return;}
    void fetch("/api/ads/events",{method:"POST",headers:{"Content-Type":"application/json"},body:payload,keepalive:true});
  }

  return <aside ref={ref} className="rounded-[1.5rem] border border-primary/20 bg-card p-5 shadow-[var(--shadow-soft)]" aria-label={`Реклама: ${title}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-primary-foreground">Реклама</span><span className="text-xs font-semibold text-muted-foreground">{placementName}</span></div>
      <span className="break-all text-[11px] text-muted-foreground">erid: {erid}</span>
    </div>
    <h2 className="mt-4 text-xl font-black tracking-tight text-foreground">{title}</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0"><p className="text-xs font-semibold text-foreground">Рекламодатель: {advertiserName}</p><p className="mt-1 text-[11px] text-muted-foreground">ИНН {advertiserInn}</p></div>
      <a href={destinationUrl} target="_blank" rel="nofollow sponsored noopener noreferrer" onClick={trackClick} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Подробнее <ExternalLink className="h-4 w-4" /></a>
    </div>
  </aside>;
}
