import { ProjectRiskHoldBanner } from "@/features/workspace/components/project-risk-hold-banner";
import { ProjectWorkspaceNav } from "@/features/workspace/components/project-workspace-nav";
import { getProjectRiskHoldForParticipant } from "@/features/workspace/queries/get-project-risk-hold";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ContractorWorkLayout({
  children,
  params,
}: Props) {
  const { id } = await params;
  const riskHold = await getProjectRiskHoldForParticipant(id);

  return (
    <>
      <ProjectWorkspaceNav projectId={id} role="contractor" />
      <ProjectRiskHoldBanner state={riskHold} />
      {children}
    </>
  );
}
