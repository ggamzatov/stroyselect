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

  const counterpart =
    role === "customer"
      ? workspace.contractor?.public_name ?? "Подрядчик"
      : [workspace.customer?.first_name, workspace.customer?.last_name]
          .filter(Boolean)
          .join(" ") || "Заказчик";

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container max-w-[1120px] pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:pt-5 md:pt-7 lg:pb-8 lg:pt-8">
        <ProjectChat
          projectId={projectId}
          projectTitle={workspace.project.title}
          counterpartName={counterpart}
          backHref={`/${role}/work/${projectId}`}
          currentUserId={workspace.currentUser.id}
          initialMessages={chatData.messages}
          initialUnreadCount={chatData.unreadCount}
          otherUserLastReadAt={chatData.otherUserReadState?.last_read_at ?? null}
        />
      </div>
    </main>
  );
}
