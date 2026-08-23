import { ProjectExecutionGateBanner } from "@/features/workspace/components/project-execution-gate-banner";
import { ProjectRiskHoldBanner } from "@/features/workspace/components/project-risk-hold-banner";
import { ProjectWorkspaceNav } from "@/features/workspace/components/project-workspace-nav";
import { WorkspacePageNavigator } from "@/features/workspace/components/workspace-page-navigator";
import { getProjectRiskHoldForParticipant } from "@/features/workspace/queries/get-project-risk-hold";
import { requireActiveContract } from "@/lib/projects/require-active-contract";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ContractorWorkLayout({
  children,
  params,
}: Props) {
  const { id } = await params;
  const [riskHold,contract] = await Promise.all([
    getProjectRiskHoldForParticipant(id),
    requireActiveContract(id),
  ]);
  const executionUnlocked=contract.success;

  return (
    <>
      <ProjectWorkspaceNav projectId={id} role="contractor" executionUnlocked={executionUnlocked} />
      <ProjectExecutionGateBanner projectId={id} role="contractor" unlocked={executionUnlocked} message={contract.success?undefined:contract.message} />
      <ProjectRiskHoldBanner state={riskHold} />
      {children}
      <WorkspacePageNavigator />
    </>
  );
}
