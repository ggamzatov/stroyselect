import { notFound, redirect } from "next/navigation";

import { getProjectDocuments } from "@/features/documents/queries/get-project-documents";
import { ProjectDocumentCenter } from "@/features/documents/components/project-document-center";

export default async function ContractorProjectDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProjectDocuments(id);
  if (!data) notFound();
  if (data.role !== "contractor") redirect("/dashboard");
  return <ProjectDocumentCenter projectId={id} role="contractor" documents={data.documents} backHref={`/contractor/work/${id}`} />;
}
