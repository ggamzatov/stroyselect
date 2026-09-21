import { notFound, redirect } from "next/navigation";

import { getProjectDocuments } from "@/features/documents/queries/get-project-documents";
import { ProjectDocumentCenter } from "@/features/documents/components/project-document-center";
import { getProjectWorkspace } from "@/features/workspace/queries/get-project-workspace";

export default async function CustomerProjectDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, workspace] = await Promise.all([getProjectDocuments(id), getProjectWorkspace(id)]);
  if (!data) notFound();
  if (data.role !== "customer") redirect("/dashboard");
  return <ProjectDocumentCenter projectId={id} role="customer" documents={data.documents} backHref={`/customer/work/${id}`} currentUserId={workspace.currentUser.id} stageGroups={workspace.stages.map((stage) => ({ stageId: stage.id, stageTitle: stage.title, files: workspace.files.filter((file) => file.stage_id === stage.id) }))} />;
}
