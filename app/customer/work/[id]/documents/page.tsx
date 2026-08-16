import { notFound, redirect } from "next/navigation";

import { getProjectDocuments } from "@/features/documents/queries/get-project-documents";
import { ProjectDocumentCenter } from "@/features/documents/components/project-document-center";

export default async function CustomerProjectDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProjectDocuments(id);
  if (!data) notFound();
  if (data.role !== "customer") redirect("/dashboard");
  return <ProjectDocumentCenter projectId={id} role="customer" documents={data.documents} backHref={`/customer/work/${id}`} />;
}
