"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { s3 } from "@/lib/storage/s3";
import { validateUploadedFile } from "@/lib/storage/validate-upload";

const BUCKET = "project-files";
const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const categorySchema = z.enum(["contract","estimate","act","invoice","receipt","plan","photo","permit","warranty","other"]);
const metadataSchema = z.object({
  projectId: z.string().uuid(),
  category: categorySchema,
  title: z.string().trim().min(2).max(240),
  parentDocumentId: z.string().uuid().optional(),
});

export async function uploadProjectDocument(formData: FormData) {
  const parsed = metadataSchema.safeParse({
    projectId: formData.get("projectId"),
    category: formData.get("category"),
    title: formData.get("title"),
    parentDocumentId: String(formData.get("parentDocumentId") ?? "").trim() || undefined,
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные документа" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, message: "Выберите файл" };
  const validation = await validateUploadedFile(file, { allowedMimeTypes: ALLOWED });
  if (!validation.ok) return { success: false, message: validation.message };

  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  const role = await projectRole(parsed.data.projectId, auth.user.id);
  if (!role) return { success: false, message: "Нет доступа к проекту" };

  let version = 1;
  if (parsed.data.parentDocumentId) {
    const parent = await db.query<{ version: number }>(
      `SELECT version FROM public.project_documents WHERE id=$1::uuid AND project_id=$2::uuid AND deleted_at IS NULL LIMIT 1`,
      [parsed.data.parentDocumentId, parsed.data.projectId]
    );
    if (!parent.rows[0]) return { success: false, message: "Предыдущая версия документа не найдена" };
    version = Number(parent.rows[0].version) + 1;
  }

  const extension = safeExtension(file.name);
  const storagePath = `${parsed.data.projectId}/documents/${crypto.randomUUID()}${extension}`;
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: storagePath,
      Body: validation.buffer,
      ContentType: file.type,
      CacheControl: "private, max-age=0, no-store",
    }));
  } catch (error) {
    console.error("Ошибка загрузки документа в S3:", error);
    return { success: false, message: "Не удалось загрузить документ" };
  }

  try {
    const result = await db.query<{ id: string }>(
      `
        INSERT INTO public.project_documents(
          project_id,uploaded_by,category,title,storage_bucket,storage_path,
          file_name,file_size,mime_type,version,parent_document_id
        ) VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11::uuid)
        RETURNING id
      `,
      [parsed.data.projectId, auth.user.id, parsed.data.category, parsed.data.title, BUCKET, storagePath, file.name, file.size, file.type, version, parsed.data.parentDocumentId ?? null]
    );
    revalidateDocumentPages(parsed.data.projectId);
    return { success: true, message: version > 1 ? `Версия ${version} загружена` : "Документ загружен", documentId: result.rows[0]?.id };
  } catch (error) {
    try { await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storagePath })); } catch {}
    console.error("Ошибка сохранения документа:", error);
    return { success: false, message: "Не удалось сохранить документ" };
  }
}

export async function deleteProjectDocument(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(projectId).success) return;
  const auth = await requireActiveUser();
  if (!auth.success || !(await projectRole(projectId, auth.user.id))) return;

  await db.query(
    `UPDATE public.project_documents SET deleted_at=COALESCE(deleted_at,now()),deleted_by=COALESCE(deleted_by,$3::uuid) WHERE id=$1::uuid AND project_id=$2::uuid`,
    [id, projectId, auth.user.id]
  );
  revalidateDocumentPages(projectId);
}

async function projectRole(projectId: string, userId: string) {
  const result = await db.query<{ customer_id: string; contractor_owner_id: string | null }>(
    `SELECT p.customer_id,cc.owner_id AS contractor_owner_id FROM public.projects p LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id WHERE p.id=$1::uuid LIMIT 1`,
    [projectId]
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.customer_id === userId) return "customer";
  if (row.contractor_owner_id === userId) return "contractor";
  return null;
}

function safeExtension(name: string) {
  const match = name.toLowerCase().match(/\.[a-z0-9]{1,8}$/);
  return match?.[0] ?? "";
}
function revalidateDocumentPages(projectId: string) {
  revalidatePath(`/customer/work/${projectId}/documents`);
  revalidatePath(`/contractor/work/${projectId}/documents`);
}
