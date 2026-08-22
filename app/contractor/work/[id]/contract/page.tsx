import { notFound, redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { ProjectContractCenter } from "@/features/workspace/components/project-contract-center";
import { getProjectContract } from "@/features/workspace/queries/get-project-contract";

type Props = { params: Promise<{ id: string }> };

export default async function ContractorProjectContractPage({ params }: Props) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();
  if (profile.role !== "contractor") redirect("/dashboard");
  const contract = await getProjectContract(id);
  if (!contract || contract.viewerRole !== "contractor") notFound();
  return <main className="min-h-screen bg-background"><ProjectContractCenter contract={contract} /></main>;
}
