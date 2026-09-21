import { MessageCircle } from "lucide-react";

import { ProjectChat } from "@/features/chat/components/project-chat";
import { getProjectMessages } from "@/features/chat/queries/get-project-messages";
import { getProjectWorkspace } from "@/features/workspace/queries/get-project-workspace";
import type { WorkspaceRole } from "@/features/workspace/utils/workspace-presentation";

type Props = {
  projectId: string;
  role: WorkspaceRole;
};

export async function ProjectChatPage({ projectId, role }: Props) {
  const [workspace, chatData] = await Promise.all([
    getProjectWorkspace(projectId),
    getProjectMessages(projectId),
  ]);

  if (workspace.currentUser.role !== role) {
    return null;
  }

  const counterpart = role === "customer"
    ? workspace.contractor?.public_name ?? "подрядчиком"
    : [workspace.customer?.first_name, workspace.customer?.last_name].filter(Boolean).join(" ") || "заказчиком";

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container max-w-[1120px] pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 md:pt-7 lg:pb-8 lg:pt-8">
        <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6" aria-labelledby="project-chat-title">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Общение по проекту</p>
              <h2 id="project-chat-title" className="mt-1 break-words text-xl font-black tracking-tight text-foreground sm:text-2xl">Диалог с {counterpart}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Обсуждайте работу, отвечайте на сообщения и прикладывайте файлы — вся переписка остаётся в проекте.</p>
            </div>
          </div>
          <div className="mt-5">
            <ProjectChat
              projectId={projectId}
              currentUserId={workspace.currentUser.id}
              initialMessages={chatData.messages}
              initialUnreadCount={chatData.unreadCount}
              otherUserLastReadAt={chatData.otherUserReadState?.last_read_at ?? null}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
