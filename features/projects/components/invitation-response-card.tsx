"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Loader2, MailCheck, XCircle } from "lucide-react";

import type { ContractorProjectInvitation } from "@/features/projects/queries/get-contractor-project-invitation";
import {
  markProjectInvitationViewed,
  respondToProjectInvitation,
} from "@/features/projects/actions/manage-project-invitation";

export function InvitationResponseCard({
  invitation,
}: {
  invitation: ContractorProjectInvitation;
}) {
  const [status, setStatus] = useState(invitation.status);
  const [note, setNote] = useState(invitation.responseNote ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (invitation.status === "invited") {
      void markProjectInvitationViewed(invitation.projectId);
      setStatus("viewed");
    }
  }, [invitation.projectId, invitation.status]);

  function respond(decision: "accepted" | "declined") {
    setMessage(null);
    startTransition(async () => {
      const result = await respondToProjectInvitation({
        projectId: invitation.projectId,
        decision,
        note,
      });
      setMessage(result.message);
      if (result.success) setStatus(decision);
    });
  }

  if (status === "accepted") {
    return (
      <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
        <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5" /><div><p className="font-bold">Приглашение принято</p><p className="mt-1 text-sm opacity-80">Отправьте заказчику предложение по проекту.</p></div></div>
      </div>
    );
  }

  if (status === "declined" || status === "cancelled") {
    return (
      <div className="rounded-[1.4rem] border border-border bg-secondary/40 p-5">
        <p className="font-bold text-foreground">{status === "declined" ? "Вы отказались от приглашения" : "Заказчик отменил приглашение"}</p>
        {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
      </div>
    );
  }

  return (
    <section className="rounded-[1.5rem] border border-primary/20 bg-secondary/45 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><MailCheck className="h-5 w-5" /></div>
        <div>
          <p className="font-bold text-foreground">Заказчик пригласил вас к проекту</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Подтвердите интерес или откажитесь. Заказчик увидит ваш ответ в pipeline.</p>
        </div>
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={1000}
        placeholder="Комментарий к ответу (необязательно)"
        className="stroy-input mt-4 min-h-24 resize-y"
      />

      {message && <p className="mt-3 text-sm font-medium text-foreground">{message}</p>}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => respond("accepted")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Принять приглашение
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => respond("declined")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground disabled:opacity-60"
        >
          <XCircle className="h-4 w-4" /> Отказаться
        </button>
      </div>
    </section>
  );
}
