import { ProjectAppointmentsPanel } from "@/features/workspace/components/project-appointments-panel";
import { getProjectAppointmentsForParticipant } from "@/features/workspace/queries/get-project-appointments";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerProjectAppointmentsPage({ params }: Props) {
  const { id } = await params;
  const appointments = await getProjectAppointmentsForParticipant(id);
  return <ProjectAppointmentsPanel projectId={id} role="customer" appointments={appointments} />;
}
