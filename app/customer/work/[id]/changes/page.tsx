import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getProjectBudgetControl } from "@/features/workspace/queries/get-project-budget-control";
import { ProjectBudgetControl } from "@/features/workspace/components/project-budget-control";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerProjectChangesPage({ params }: Props) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();
  if (profile.role !== "customer") redirect("/dashboard");

  const data = await getProjectBudgetControl(id);
  if (data.role !== "customer") redirect("/dashboard");

  return <ProjectBudgetControl data={data} backHref={`/customer/work/${id}`} />;
}
