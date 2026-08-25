import "server-only";

const API_BASE = "https://api.yookassa.ru/v3";

type Money = { value: string; currency: "RUB" };
type ApiObject = Record<string, unknown> & { id?: string; status?: string };

type PayoutResponse={
  id:string;
  status:"pending"|"succeeded"|"canceled";
  cancellation_details?:{reason?:string};
};

type RefundResponse={
  id:string;
  status:"pending"|"succeeded"|"canceled";
};

function e2eMockEnabled(){
  return process.env.YOOKASSA_E2E_MOCK==="1"&&process.env.E2E_ALLOW_INSECURE_SESSION==="1";
}

function credentials() {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim();
  if (!shopId || !secretKey) throw new Error("ЮKassa не настроена: укажите YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY");
  return { shopId, secretKey };
}

function authHeader() {
  const { shopId, secretKey } = credentials();
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
}

async function request<T extends ApiObject>(path: string, init: RequestInit & { idempotenceKey?: string } = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init.idempotenceKey ? { "Idempotence-Key": init.idempotenceKey } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal:AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const description = typeof body?.description === "string" ? body.description : `HTTP ${response.status}`;
    throw new Error(`ЮKassa: ${description}`);
  }
  return body as T;
}

export function isYooKassaConfigured() {
  return e2eMockEnabled()||Boolean(process.env.YOOKASSA_SHOP_ID?.trim() && process.env.YOOKASSA_SECRET_KEY?.trim());
}

export async function createSafeDeal(input: { projectId: string; stageId: string; description: string }) {
  if(e2eMockEnabled())return{id:`e2e-deal-${input.stageId}`,status:"opened"};
  return request<{ id: string; status: string; expires_at?: string }>("/deals", {
    method: "POST",
    idempotenceKey: `deal-${input.stageId}`,
    body: JSON.stringify({
      type: "safe_deal",
      fee_moment: "deal_closed",
      description: input.description.slice(0, 128),
      metadata: { project_id: input.projectId, stage_id: input.stageId },
    }),
  });
}

export async function createSafeDealPayment(input: {
  projectId: string;
  stageId: string;
  paymentIntentId: string;
  dealId: string;
  amount: number;
  payoutAmount: number;
  returnUrl: string;
  description: string;
}) {
  const amount: Money = { value: input.amount.toFixed(2), currency: "RUB" };
  const payout: Money = { value: input.payoutAmount.toFixed(2), currency: "RUB" };
  if(e2eMockEnabled())return{id:`e2e-project-payment-${Math.round(input.amount*100)}-${input.paymentIntentId}`,status:"pending",confirmation:{type:"redirect",confirmation_url:`${input.returnUrl}${input.returnUrl.includes("?")?"&":"?"}e2e_payment=1`}};
  return request<{ id: string; status: string; confirmation?: { type?: string; confirmation_url?: string } }>("/payments", {
    method: "POST",
    idempotenceKey: `payment-${input.paymentIntentId}`,
    body: JSON.stringify({
      amount,
      capture: true,
      confirmation: { type: "redirect", return_url: input.returnUrl },
      description: input.description.slice(0, 128),
      deal: { id: input.dealId, settlements: [{ type: "payout", amount: payout }] },
      metadata: {
        payment_scope:"project_stage",
        project_id: input.projectId,
        stage_id: input.stageId,
        payment_intent_id: input.paymentIntentId,
      },
    }),
  });
}

export async function getYooKassaObject(objectType: "payment" | "refund" | "payout" | "deal", id: string) {
  if(e2eMockEnabled()&&objectType==="payment"){
    const match=id.match(/^e2e-project-payment-(\d+)-([0-9a-f-]{36})$/i);
    if(match){
      return{
        id,
        status:"succeeded",
        paid:true,
        amount:{value:(Number(match[1])/100).toFixed(2),currency:"RUB"},
        metadata:{payment_scope:"project_stage",payment_intent_id:match[2]},
      } satisfies ApiObject;
    }
  }
  if(e2eMockEnabled()&&objectType==="refund"){
    const match=id.match(/^e2e-refund-(\d+)-([0-9a-f-]{36})$/i);
    if(match){
      return{
        id,
        status:"succeeded",
        amount:{value:(Number(match[1])/100).toFixed(2),currency:"RUB"},
        metadata:{payment_intent_id:match[2]},
      } satisfies ApiObject;
    }
  }
  if(e2eMockEnabled()&&objectType==="payout"){
    const match=id.match(/^e2e-payout-(\d+)-([0-9a-f-]{36})$/i);
    if(match){
      return{
        id,
        status:"succeeded",
        amount:{value:(Number(match[1])/100).toFixed(2),currency:"RUB"},
        metadata:{payment_intent_id:match[2]},
      } satisfies ApiObject;
    }
  }
  if(e2eMockEnabled())return{id,status:"succeeded"} satisfies ApiObject;
  const path = objectType === "payment" ? `/payments/${encodeURIComponent(id)}` : objectType === "refund" ? `/refunds/${encodeURIComponent(id)}` : objectType === "payout" ? `/payouts/${encodeURIComponent(id)}` : `/deals/${encodeURIComponent(id)}`;
  return request<ApiObject>(path, { method: "GET" });
}

export async function createSafeDealPayout(input: {
  paymentIntentId: string;
  dealId: string;
  amount: number;
  payoutToken: string;
  description: string;
  idempotenceKey?:string;
}) {
  if(e2eMockEnabled())return{id:`e2e-payout-${Math.round(input.amount*100)}-${input.paymentIntentId}`,status:"pending"} satisfies PayoutResponse;
  return request<PayoutResponse>("/payouts", {
    method: "POST",
    idempotenceKey: input.idempotenceKey??`payout-${input.paymentIntentId}`,
    body: JSON.stringify({
      amount: { value: input.amount.toFixed(2), currency: "RUB" },
      payout_token: input.payoutToken,
      description: input.description.slice(0, 128),
      deal: { id: input.dealId },
      metadata: { payment_intent_id: input.paymentIntentId },
    }),
  });
}

export async function createPaymentRefund(input: {
  paymentIntentId: string;
  paymentId: string;
  amount: number;
  description: string;
  idempotenceKey?:string;
}) {
  if(e2eMockEnabled())return{id:`e2e-refund-${Math.round(input.amount*100)}-${input.paymentIntentId}`,status:"pending"} satisfies RefundResponse;
  return request<RefundResponse>("/refunds", {
    method: "POST",
    idempotenceKey: input.idempotenceKey??`refund-${input.paymentIntentId}`,
    body: JSON.stringify({
      payment_id: input.paymentId,
      amount: { value: input.amount.toFixed(2), currency: "RUB" },
      description: input.description.slice(0, 128),
      metadata:{payment_intent_id:input.paymentIntentId},
    }),
  });
}
