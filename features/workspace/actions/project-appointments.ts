"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveUser } from "@/lib/auth/require-active-user";
import { db } from "@/lib/db/pool";

const projectIdSchema = z.string().uuid();
const appointmentIdSchema = z.string().uuid();
const createSchema = z.object({
  projectId: z.string().uuid(),
  appointmentType: z.enum(["site_visit", "meeting", "call", "video_call"]),
  title: z.string().trim().min(2).max(160),
  scheduledStart: z.coerce.date(),
  scheduledEnd: z.coerce.date(),
  location: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
  reminderMinutes: z.coerce.number().int().min(0).max(10080).default(60),
}).refine((v) => v.scheduledEnd > v.scheduledStart, {
  message: "Окончание должно быть позже начала",
  path: ["scheduledEnd"],
});

async function getProjectAccess(projectId: string, userId: string) {
  const result = await db.query<{
    customer_id: string;
    contractor_owner_id: string | null;
  }>(
    `SELECT p.customer_id,cc.owner_id AS contractor_owner_id
     FROM public.projects p
     LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id
     WHERE p.id=$1::uuid LIMIT 1`,
    [projectId]
  );
  const row = result.rows[0];
  if (!row) return null;
  const role = row.customer_id === userId
    ? "customer"
    : row.contractor_owner_id === userId
      ? "contractor"
      : null;
  return role ? { ...row, role } : null;
}

export async function createProjectAppointment(formData: FormData) {
  const parsed = createSchema.safeParse({
    projectId: formData.get("projectId"),
    appointmentType: formData.get("appointmentType"),
    title: formData.get("title"),
    scheduledStart: formData.get("scheduledStart"),
    scheduledEnd: formData.get("scheduledEnd"),
    location: formData.get("location") || undefined,
    notes: formData.get("notes") || undefined,
    reminderMinutes: formData.get("reminderMinutes") || 60,
  });
  if (!parsed.success) return;

  const auth = await requireActiveUser();
  if (!auth.success) return;
  const access = await getProjectAccess(parsed.data.projectId, auth.user.id);
  if (!access) return;

  const reminderAt = parsed.data.reminderMinutes > 0
    ? new Date(parsed.data.scheduledStart.getTime() - parsed.data.reminderMinutes * 60_000)
    : null;

  await db.query(
    `INSERT INTO public.project_appointments(
       project_id,created_by,appointment_type,title,scheduled_start,scheduled_end,
       location,notes,reminder_at,customer_response,contractor_response,status
     ) VALUES(
       $1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,
       $10,$11,'proposed'
     )`,
    [
      parsed.data.projectId,
      auth.user.id,
      parsed.data.appointmentType,
      parsed.data.title,
      parsed.data.scheduledStart,
      parsed.data.scheduledEnd,
      parsed.data.location || null,
      parsed.data.notes || null,
      reminderAt,
      access.role === "customer" ? "accepted" : "pending",
      access.role === "contractor" ? "accepted" : "pending",
    ]
  );

  revalidateAppointmentPages(parsed.data.projectId);
}

export async function respondProjectAppointment(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const response = String(formData.get("response") ?? "");
  if (!projectIdSchema.safeParse(projectId).success ||
      !appointmentIdSchema.safeParse(appointmentId).success ||
      !["accepted", "declined"].includes(response)) return;

  const auth = await requireActiveUser();
  if (!auth.success) return;
  const access = await getProjectAccess(projectId, auth.user.id);
  if (!access) return;

  const column = access.role === "customer" ? "customer_response" : "contractor_response";
  await db.query(
    `UPDATE public.project_appointments
     SET ${column}=$3,
         status=CASE
           WHEN $3='declined' THEN 'cancelled'
           WHEN (CASE WHEN $4='customer' THEN $3 ELSE customer_response END)='accepted'
            AND (CASE WHEN $4='contractor' THEN $3 ELSE contractor_response END)='accepted'
           THEN 'confirmed'
           ELSE 'proposed'
         END,
         cancelled_by=CASE WHEN $3='declined' THEN $2::uuid ELSE cancelled_by END,
         cancelled_at=CASE WHEN $3='declined' THEN now() ELSE cancelled_at END,
         updated_at=now()
     WHERE id=$1::uuid AND project_id=$5::uuid AND status IN ('proposed','confirmed')`,
    [appointmentId, auth.user.id, response, access.role, projectId]
  );
  revalidateAppointmentPages(projectId);
}

export async function cancelProjectAppointment(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const appointmentId = String(formData.get("appointmentId") ?? "");
  if (!projectIdSchema.safeParse(projectId).success || !appointmentIdSchema.safeParse(appointmentId).success) return;

  const auth = await requireActiveUser();
  if (!auth.success || !(await getProjectAccess(projectId, auth.user.id))) return;

  await db.query(
    `UPDATE public.project_appointments
     SET status='cancelled',cancelled_by=$2::uuid,cancelled_at=now(),updated_at=now()
     WHERE id=$1::uuid AND project_id=$3::uuid AND status IN ('proposed','confirmed')`,
    [appointmentId, auth.user.id, projectId]
  );
  revalidateAppointmentPages(projectId);
}

export async function completeProjectAppointment(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const appointmentId = String(formData.get("appointmentId") ?? "");
  if (!projectIdSchema.safeParse(projectId).success || !appointmentIdSchema.safeParse(appointmentId).success) return;

  const auth = await requireActiveUser();
  if (!auth.success || !(await getProjectAccess(projectId, auth.user.id))) return;

  await db.query(
    `UPDATE public.project_appointments
     SET status='completed',completed_at=now(),updated_at=now()
     WHERE id=$1::uuid AND project_id=$2::uuid AND status='confirmed'`,
    [appointmentId, projectId]
  );
  revalidateAppointmentPages(projectId);
}

function revalidateAppointmentPages(projectId: string) {
  revalidatePath(`/customer/work/${projectId}/appointments`);
  revalidatePath(`/contractor/work/${projectId}/appointments`);
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
}
