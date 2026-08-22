import "server-only";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export type ProjectContractView = {
  projectId: string;
  projectTitle: string;
  hasSelectedContractor: boolean;
  contractId: string | null;
  status: string | null;
  versionNo: number | null;
  title: string | null;
  body: string | null;
  commercialTerms: Record<string, unknown>;
  customerApprovedAt: string | Date | null;
  contractorApprovedAt: string | Date | null;
  viewerRole: "customer" | "contractor";
};

export async function getProjectContract(projectId: string): Promise<ProjectContractView | null> {
  const auth = await requireActiveUser();
  if (!auth.success) return null;

  const result = await db.query<{
    project_id: string;
    project_title: string;
    customer_id: string;
    selected_contractor_id: string | null;
    contractor_owner_id: string | null;
    contract_id: string | null;
    status: string | null;
    current_version: number | null;
    version_no: number | null;
    version_title: string | null;
    body: string | null;
    commercial_terms: unknown;
    customer_approved_at: string | Date | null;
    contractor_approved_at: string | Date | null;
  }>(
    `SELECT p.id AS project_id,p.title AS project_title,p.customer_id,p.selected_contractor_id,
            cc.owner_id AS contractor_owner_id,pc.id AS contract_id,pc.status,pc.current_version,
            v.version_no,v.title AS version_title,v.body,v.commercial_terms,
            v.customer_approved_at,v.contractor_approved_at
     FROM public.projects p
     LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id
     LEFT JOIN public.project_contracts pc ON pc.project_id=p.id
     LEFT JOIN public.project_contract_versions v ON v.contract_id=pc.id AND v.version_no=pc.current_version
     WHERE p.id=$1::uuid LIMIT 1`,
    [projectId]
  );
  const row = result.rows[0];
  if (!row) return null;
  const viewerRole = row.customer_id === auth.user.id
    ? "customer"
    : row.contractor_owner_id === auth.user.id
      ? "contractor"
      : null;
  if (!viewerRole) return null;

  return {
    projectId: row.project_id,
    projectTitle: row.project_title,
    hasSelectedContractor: Boolean(row.selected_contractor_id),
    contractId: row.contract_id,
    status: row.status,
    versionNo: row.version_no,
    title: row.version_title,
    body: row.body,
    commercialTerms: isRecord(row.commercial_terms) ? row.commercial_terms : {},
    customerApprovedAt: row.customer_approved_at,
    contractorApprovedAt: row.contractor_approved_at,
    viewerRole,
  };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
