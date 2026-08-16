import "server-only";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { getSignedFileUrl } from "@/lib/storage/get-signed-file-url";

export async function getProjectDocuments(projectId: string) {
  const auth = await requireActiveUser();
  if (!auth.success) return null;

  const access = await db.query<{ role: "customer" | "contractor" }>(
    `
      SELECT CASE WHEN p.customer_id=$2::uuid THEN 'customer' ELSE 'contractor' END AS role
      FROM public.projects p
      LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id
      WHERE p.id=$1::uuid
        AND (p.customer_id=$2::uuid OR cc.owner_id=$2::uuid)
      LIMIT 1
    `,
    [projectId, auth.user.id]
  );
  const role = access.rows[0]?.role;
  if (!role) return null;

  const result = await db.query<{
    id: string; project_id: string; uploaded_by: string; category: string; title: string;
    storage_bucket: string; storage_path: string; file_name: string; file_size: string | number;
    mime_type: string; version: number; parent_document_id: string | null; created_at: Date | string;
    uploader_first_name: string | null; uploader_last_name: string | null;
  }>(
    `
      SELECT d.id,d.project_id,d.uploaded_by,d.category,d.title,d.storage_bucket,d.storage_path,
        d.file_name,d.file_size,d.mime_type,d.version,d.parent_document_id,d.created_at,
        p.first_name AS uploader_first_name,p.last_name AS uploader_last_name
      FROM public.project_documents d
      LEFT JOIN public.profiles p ON p.id=d.uploaded_by
      WHERE d.project_id=$1::uuid AND d.deleted_at IS NULL
      ORDER BY d.category,d.title,d.version DESC,d.created_at DESC
    `,
    [projectId]
  );

  const documents = await Promise.all(result.rows.map(async (row) => ({
    id: row.id,
    projectId: row.project_id,
    uploadedBy: row.uploaded_by,
    category: row.category,
    title: row.title,
    fileName: row.file_name,
    fileSize: Number(row.file_size),
    mimeType: row.mime_type,
    version: Number(row.version),
    parentDocumentId: row.parent_document_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    uploaderName: [row.uploader_first_name, row.uploader_last_name].filter(Boolean).join(" ") || "Пользователь",
    downloadUrl: await getSignedFileUrl({ bucket: row.storage_bucket, key: row.storage_path, expiresIn: 300 }),
  })));

  return { role, userId: auth.user.id, documents };
}
