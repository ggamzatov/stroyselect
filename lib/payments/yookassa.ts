import "server-only";

import { randomUUID } from "node:crypto";

const API_BASE = "https://api.yookassa.ru/v3";

type Money = { value: string; currency: "RUB" };
type ApiObject = Record<string, unknown> & { id?: string; status?: string };

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
  return Boolean(process.env.YOOKASSA_SHOP_ID?.trim() && process.env.YOOKASSA_SECRET_KEY?.trim());
}

export async function createSafeDeal(input: { projectId: string; stageId: string; description: string }) {
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
        project_id: input.projectId,
        stage_id: input.stageId,
        payment_intent_id: input.paymentIntentId,
      },
    }),
  });
}

export async function getYooKassaObject(objectType: "payment" | "refund" | "payout" | "deal", id: string) {
  const path = objectType === "payment" ? `/payments/${id}` : objectType === "refund" ? `/refunds/${id}` : objectType === "payout" ? `/payouts/${id}` : `/deals/${id}`;
  return request<ApiObject>(path, { method: "GET" });
}

export async function createSafeDealPayout(input: {
  paymentIntentId: string;
  dealId: string;
  amount: number;
  payoutToken: string;
  description: string;
}) {
  return request<{ id: string; status: "succeeded" | "canceled"; cancellation_details?: { reason?: string } }>("/payouts", {
    method: "POST",
    idempotenceKey: `payout-${input.paymentIntentId}-${randomUUID()}`,
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
}) {
  return request<{ id: string; status: string }>("/refunds", {
    method: "POST",
    idempotenceKey: `refund-${input.paymentIntentId}`,
    body: JSON.stringify({
      payment_id: input.paymentId,
      amount: { value: input.amount.toFixed(2), currency: "RUB" },
      description: input.description.slice(0, 128),
    }),
  });
}
