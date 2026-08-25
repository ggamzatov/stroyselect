import "server-only";

import { db } from "@/lib/db/pool";

type AccessRow = {
  has_access: boolean;
  status: string | null;
  current_period_end: Date | string | null;
  grace_ends_at: Date | string | null;
  auto_renew: boolean | null;
  plan_name: string | null;
};

export type ContractorMarketplaceAccess = {
  hasAccess: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  autoRenew: boolean;
  planName: string | null;
};

export async function getContractorMarketplaceAccess(contractorId: string): Promise<ContractorMarketplaceAccess> {
  const result = await db.query<AccessRow>(`
    SELECT
      public.contractor_has_marketplace_access($1::uuid) AS has_access,
      cs.status,
      cs.current_period_end,
      cs.grace_ends_at,
      cs.auto_renew,
      sp.name AS plan_name
    FROM (SELECT 1) seed
    LEFT JOIN public.contractor_subscriptions cs ON cs.contractor_id=$1::uuid
    LEFT JOIN public.contractor_subscription_plans sp ON sp.id=cs.plan_id
    LIMIT 1
  `,[contractorId]);
  const row=result.rows[0];
  return {
    hasAccess:Boolean(row?.has_access),
    status:row?.status??null,
    currentPeriodEnd:toIso(row?.current_period_end),
    graceEndsAt:toIso(row?.grace_ends_at),
    autoRenew:Boolean(row?.auto_renew),
    planName:row?.plan_name??null,
  };
}

function toIso(value: Date|string|null|undefined){
  if(!value)return null;
  return value instanceof Date?value.toISOString():new Date(value).toISOString();
}
