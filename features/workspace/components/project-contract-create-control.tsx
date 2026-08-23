"use client";

import { useActionState } from "react";
import { FileSignature, Loader2, RefreshCw } from "lucide-react";
import { createProjectContractWithState, type ContractGenerationState } from "@/features/workspace/actions/create-project-contract-state";

export function ProjectContractCreateControl({ projectId, regenerate = false }: { projectId: string; regenerate?: boolean }) {
  const [state, action, pending] = useActionState<ContractGenerationState, FormData>(createProjectContractWithState, null);
  return (
    <div>
      <form action={action}>
        <input type="hidden" name="projectId" value={projectId} />
        <button disabled={pending} className={regenerate
          ? "inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
          : "inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"}>
          {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Формируем договор...</> : regenerate ? <><RefreshCw className="h-4 w-4" />Сформировать новую версию</> : <><FileSignature className="h-4 w-4" />Сформировать договор</>}
        </button>
      </form>
      {state && <p className={`mt-3 rounded-xl p-3 text-sm font-medium ${state.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{state.message}</p>}
    </div>
  );
}
