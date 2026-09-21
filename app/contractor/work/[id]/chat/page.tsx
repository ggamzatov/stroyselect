import { redirect } from "next/navigation";

import { ProjectChatPage } from "@/features/chat/components/project-chat-page";
import { getProjectWorkspace } from "@/features/workspace/queries/get-project-workspace";

export default async function ContractorProjectChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getProjectWorkspace(id);
  if (workspace.currentUser.role !== "contractor") redirect("/dashboard");
  return <ProjectChatPage projectId={id} role="contractor" />;
}
