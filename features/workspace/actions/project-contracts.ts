"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

const projectSchema = z.string().uuid();

type ProjectForContract = {
  id: string;
  customer_id: string;
  title: string;
  description: string;
  city: string | null;
  address: string | null;
  selected_contractor_id: string | null;
  selected_bid_id: string | null;
  contractor_name: string | null;
  price: string | number | null;
  duration_days: number | null;
  scope_summary: string | null;
  materials_summary: string | null;
  exclusions: string | null;
  payment_terms: string | null;
  warranty_months: number | null;
};

export async function createProjectContract(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectSchema.safeParse(projectId).success) return;
  const auth = await requireActiveUser();
  if (!auth.success || auth.profile.role !== "customer") return;

  const projectResult = await db.query<ProjectForContract>(
    `SELECT p.id,p.customer_id,p.title,p.description,p.city,p.address,p.selected_contractor_id,p.selected_bid_id,
            cc.public_name AS contractor_name,pb.price,pb.duration_days,pb.scope_summary,pb.materials_summary,
            pb.exclusions,pb.payment_terms,pb.warranty_months
     FROM public.projects p
     LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id
     LEFT JOIN public.project_bids pb ON pb.id=p.selected_bid_id
     WHERE p.id=$1::uuid AND p.customer_id=$2::uuid LIMIT 1`,
    [projectId, auth.user.id]
  );
  const project = projectResult.rows[0];
  if (!project?.selected_contractor_id) return;

  const existing = await db.query<{ id: string }>(
    `SELECT id FROM public.project_contracts WHERE project_id=$1::uuid LIMIT 1`,
    [projectId]
  );
  if (existing.rows[0]) {
    revalidateContractPages(projectId);
    return;
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const contractResult = await client.query<{ id: string }>(
      `INSERT INTO public.project_contracts(project_id,source_bid_id,customer_id,contractor_id,status,current_version)
       VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,'pending_approval',1) RETURNING id`,
      [projectId, project.selected_bid_id, project.customer_id, project.selected_contractor_id]
    );
    const contractId = contractResult.rows[0]?.id;
    if (!contractId) throw new Error("Contract was not created");

    const terms = {
      price: numberOrNull(project.price),
      durationDays: project.duration_days,
      scope: project.scope_summary,
      materials: project.materials_summary,
      exclusions: project.exclusions,
      paymentTerms: project.payment_terms,
      warrantyMonths: project.warranty_months,
    };
    const body = buildContractBody(project);
    await client.query(
      `INSERT INTO public.project_contract_versions(contract_id,version_no,title,body,commercial_terms,created_by)
       VALUES($1::uuid,1,$2,$3,$4::jsonb,$5::uuid)`,
      [contractId, `Договор по проекту «${project.title}»`, body, JSON.stringify(terms), auth.user.id]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка создания договора:", error);
  } finally {
    client.release();
  }
  revalidateContractPages(projectId);
}

export async function approveProjectContract(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectSchema.safeParse(projectId).success) return;
  const auth = await requireActiveUser();
  if (!auth.success) return;

  const access = await db.query<{
    contract_id: string;
    version_no: number;
    customer_id: string;
    contractor_owner_id: string | null;
  }>(
    `SELECT pc.id AS contract_id,pc.current_version AS version_no,pc.customer_id,cc.owner_id AS contractor_owner_id
     FROM public.project_contracts pc
     JOIN public.contractor_companies cc ON cc.id=pc.contractor_id
     WHERE pc.project_id=$1::uuid LIMIT 1`,
    [projectId]
  );
  const row = access.rows[0];
  if (!row) return;
  const isCustomer = row.customer_id === auth.user.id;
  const isContractor = row.contractor_owner_id === auth.user.id;
  if (!isCustomer && !isContractor) return;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    if (isCustomer) {
      await client.query(
        `UPDATE public.project_contract_versions SET customer_approved_at=COALESCE(customer_approved_at,now())
         WHERE contract_id=$1::uuid AND version_no=$2`,
        [row.contract_id, row.version_no]
      );
    } else {
      await client.query(
        `UPDATE public.project_contract_versions SET contractor_approved_at=COALESCE(contractor_approved_at,now())
         WHERE contract_id=$1::uuid AND version_no=$2`,
        [row.contract_id, row.version_no]
      );
    }
    await client.query(
      `UPDATE public.project_contracts pc SET status=CASE WHEN EXISTS(
         SELECT 1 FROM public.project_contract_versions v
         WHERE v.contract_id=pc.id AND v.version_no=pc.current_version
           AND v.customer_approved_at IS NOT NULL AND v.contractor_approved_at IS NOT NULL
       ) THEN 'active' ELSE 'pending_approval' END, updated_at=now()
       WHERE pc.id=$1::uuid`,
      [row.contract_id]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка согласования договора:", error);
  } finally {
    client.release();
  }
  revalidateContractPages(projectId);
}

function buildContractBody(project: ProjectForContract) {
  return [
    `Проект: ${project.title}`,
    `Объект: ${[project.city, project.address].filter(Boolean).join(", ") || "адрес уточняется"}`,
    `Подрядчик: ${project.contractor_name || "выбранный подрядчик"}`,
    "",
    "Предмет договора:",
    project.scope_summary || project.description,
    "",
    `Стоимость: ${project.price == null ? "по согласованию" : `${new Intl.NumberFormat("ru-RU").format(Number(project.price))} ₽`}`,
    `Срок выполнения: ${project.duration_days ? `${project.duration_days} дней` : "по согласованию"}`,
    `Материалы: ${project.materials_summary || "определяются сторонами"}`,
    `Исключения: ${project.exclusions || "не указаны"}`,
    `Порядок оплаты: ${project.payment_terms || "в соответствии с согласованным графиком платежей"}`,
    `Гарантия: ${project.warranty_months == null ? "по согласованию" : `${project.warranty_months} мес.`}`,
    "",
    "Изменение объёма, стоимости или сроков оформляется через согласованный change order в СтройВыбор.",
    "Факт согласования версии фиксируется отдельно для заказчика и подрядчика в системе.",
  ].join("\n");
}
function numberOrNull(value: unknown) { const number = Number(value); return Number.isFinite(number) ? number : null; }
function revalidateContractPages(projectId: string) {
  revalidatePath(`/customer/work/${projectId}/contract`);
  revalidatePath(`/contractor/work/${projectId}/contract`);
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
}
