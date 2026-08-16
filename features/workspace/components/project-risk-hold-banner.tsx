import { ShieldAlert } from "lucide-react";

import type { ProjectRiskHoldState } from "@/features/workspace/queries/get-project-risk-hold";

export function ProjectRiskHoldBanner({
  state,
}: {
  state: ProjectRiskHoldState | null;
}) {
  if (!state?.isOnHold) {
    return null;
  }

  return (
    <div className="border-b border-red-200 bg-red-50">
      <div className="app-container py-4">
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-white/70 p-4 text-red-950 shadow-sm">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

          <div>
            <p className="font-bold">
              Проект временно приостановлен администрацией
            </p>

            <p className="mt-1 text-sm leading-6 text-red-900/80">
              Пока действует Project Hold, нельзя проводить платежи,
              согласовывать изменения бюджета или менять статусы этапов.
              Чат, документы и раздел споров остаются доступными.
            </p>

            {state.reason && (
              <p className="mt-2 text-sm font-semibold">
                Причина: {state.reason}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
