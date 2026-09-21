import { redirect } from "next/navigation";

import { getProjectContractorReview } from "@/features/reviews/queries/get-project-contractor-review";
import { WorkspaceOverview } from "@/features/workspace/components/workspace-overview";
import { getProjectWorkspace } from "@/features/workspace/queries/get-project-workspace";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerWorkspacePage({ params }: Props) {
  const { id } = await params;
  const [workspace, contractorReview] = await Promise.all([
    getProjectWorkspace(id),
    getProjectContractorReview(id),
  ]);

  if (workspace.currentUser.role !== "customer") redirect("/dashboard");

  return <WorkspaceOverview workspace={workspace} role="customer" contractorReview={contractorReview} />;
}
