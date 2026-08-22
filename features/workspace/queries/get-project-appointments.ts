import { requireActiveUser } from "@/lib/auth/require-active-user";
import { db } from "@/lib/db/pool";

export type ProjectAppointment = {
  id: string;
  projectId: string;
  appointmentType: "site_visit" | "meeting" | "call" | "video_call";
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  location: string | null;
  notes: string | null;
  reminderAt: string | null;
  status: "proposed" | "confirmed" | "completed" | "cancelled";
  customerResponse: "pending" | "accepted" | "declined";
  contractorResponse: "pending" | "accepted" | "declined";
  createdBy: string;
};

export async function getProjectAppointmentsForParticipant(projectId: string): Promise<ProjectAppointment[]> {
  const auth = await requireActiveUser();
  if (!auth.success) return [];

  const access = await db.query<{ allowed: boolean }>(
    `SELECT EXISTS(
       SELECT 1
       FROM public.projects p
       LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id
       WHERE p.id=$1::uuid
         AND (p.customer_id=$2::uuid OR cc.owner_id=$2::uuid)
     ) AS allowed`,
    [projectId, auth.user.id]
  );
  if (!access.rows[0]?.allowed) return [];

  const result = await db.query<{
    id: string;
    project_id: string;
    appointment_type: ProjectAppointment["appointmentType"];
    title: string;
    scheduled_start: Date | string;
    scheduled_end: Date | string;
    location: string | null;
    notes: string | null;
    reminder_at: Date | string | null;
    status: ProjectAppointment["status"];
    customer_response: ProjectAppointment["customerResponse"];
    contractor_response: ProjectAppointment["contractorResponse"];
    created_by: string;
  }>(
    `SELECT id,project_id,appointment_type,title,scheduled_start,scheduled_end,
            location,notes,reminder_at,status,customer_response,contractor_response,created_by
     FROM public.project_appointments
     WHERE project_id=$1::uuid
     ORDER BY CASE WHEN scheduled_start >= now() THEN 0 ELSE 1 END,
              scheduled_start ASC`,
    [projectId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    appointmentType: row.appointment_type,
    title: row.title,
    scheduledStart: new Date(row.scheduled_start).toISOString(),
    scheduledEnd: new Date(row.scheduled_end).toISOString(),
    location: row.location,
    notes: row.notes,
    reminderAt: row.reminder_at ? new Date(row.reminder_at).toISOString() : null,
    status: row.status,
    customerResponse: row.customer_response,
    contractorResponse: row.contractor_response,
    createdBy: row.created_by,
  }));
}
