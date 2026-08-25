"use client";

import { Printer } from "lucide-react";

export function PrintContractButton(){return <button type="button" onClick={()=>window.print()} className="print:hidden inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><Printer className="h-4 w-4"/>Печать / сохранить PDF</button>}
