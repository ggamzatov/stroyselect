"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { s3 } from "@/lib/storage/s3";
import { validateUploadedFile } from "@/lib/storage/validate-upload";

const BUCKET = "project-files";
const trustSchema = z.object({
  insuranceProvider: z.string().trim().max(200).optional().or(z.literal("")),
  insurancePolicyNumber: z.string().trim().max(120).optional().or(z.literal("")),
  insuranceExpiresAt: z.string().trim().optional().or(z.literal("")),
  licenseSummary: z.string().trim().max(2000).optional().or(z.literal("")),
});
const documentSchema = z.object({
  kind: z.enum(["registration","tax","license","sro","insurance","certificate","identity","other"]),
  title: z.string().trim().min(2).max(200),
  expiresAt: z.string().trim().optional().or(z.literal("")),
});
const ALLOWED = new Set(["application/pdf","image/jpeg","image/png","image/webp"]);

export async function saveContractorTrust(formData: FormData) {
  const parsed = trustSchema.safeParse({
    insuranceProvider: formData.get("insuranceProvider"),
    insurancePolicyNumber: formData.get("insurancePolicyNumber"),
    insuranceExpiresAt: formData.get("insuranceExpiresAt"),
    licenseSummary: formData.get("licenseSummary"),
  });
  if (!parsed.success) return;
  const auth = await requireActiveUser();
  if (!auth.success || auth.profile.role !== "contractor") return;

  await db.query(
    `UPDATE public.contractor_companies SET
       insurance_provider=$2,
       insurance_policy_number=$3,
       insurance_expires_at=$4::date,
       license_summary=$5,
       updated_at=now()
     WHERE owner_id=$1::uuid`,
    [
      auth.user.id,
      emptyToNull(parsed.data.insuranceProvider),
      emptyToNull(parsed.data.insurancePolicyNumber),
      emptyToNull(parsed.data.insuranceExpiresAt),
      emptyToNull(parsed.data.licenseSummary),
    ]
  );
  revalidateTrustPages();
}

export async function uploadContractorVerificationDocument(formData: FormData) {
  const parsed = documentSchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title"),
    expiresAt: formData.get("expiresAt"),
  });
  if (!parsed.success) return;
  const file = formData.get("file");
  if (!(file instanceof File)) return;

  const auth = await requireActiveUser();
  if (!auth.success || auth.profile.role !== "contractor") return;
  const companyResult = await db.query<{ id: string }>(
    `SELECT id FROM public.contractor_companies WHERE owner_id=$1::uuid LIMIT 1`,
    [auth.user.id]
  );
  const companyId = companyResult.rows[0]?.id;
  if (!companyId) return;

  const validation = await validateUploadedFile(file, { allowedMimeTypes: ALLOWED });
  if (!validation.ok) return;

  const ext = safeExtension(file.name);
  const storagePath = `contractors/${companyId}/verification/${crypto.randomUUID()}${ext}`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: storagePath,
    Body: validation.buffer,
    ContentType: file.type,
    CacheControl: "private, max-age=0, no-store",
  }));

  await db.query(
    `INSERT INTO public.contractor_verification_documents(
       contractor_id,uploaded_by,kind,title,storage_bucket,storage_path,file_name,file_size,mime_type,expires_at
     ) VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10::date)`,
    [companyId, auth.user.id, parsed.data.kind, parsed.data.title, BUCKET, storagePath, file.name, file.size, file.type, emptyToNull(parsed.data.expiresAt)]
  );
  revalidateTrustPages();
}

function emptyToNull(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
function safeExtension(name: string) {
  return name.toLowerCase().match(/\.[a-z0-9]{1,8}$/)?.[0] ?? "";
}
function revalidateTrustPages() {
  revalidatePath("/contractor/company");
  revalidatePath("/contractor/company/trust");
  revalidatePath("/admin/contractors");
}
