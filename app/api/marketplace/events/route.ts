import { NextResponse } from "next/server";

import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";

const ALLOWED_EVENTS = new Set([
  "catalog_viewed",
  "contractor_profile_viewed",
  "service_city_viewed",
  "project_cta_clicked",
]);

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.eventName !== "string" || !ALLOWED_EVENTS.has(body.eventName)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const contractorId = typeof body.contractorId === "string" && isUuid(body.contractorId)
    ? body.contractorId
    : null;
  const metadata = sanitizeMetadata(body.metadata);
  const userId = await getCurrentSessionUserId();

  try {
    await db.query(
      `INSERT INTO public.marketplace_events(event_name,contractor_id,user_id,metadata)
       VALUES($1,$2::uuid,$3::uuid,$4::jsonb)`,
      [body.eventName, contractorId, userId, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error("Ошибка записи события marketplace:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function sanitizeMetadata(value: unknown) {
  if (!isRecord(value)) return {};

  const allowed = ["path", "city", "category", "source", "searchUsed", "filtersUsed"] as const;
  const result: Record<string, string | boolean> = {};

  for (const key of allowed) {
    const item = value[key];
    if (typeof item === "boolean") result[key] = item;
    if (typeof item === "string" && item.length <= 160) result[key] = item;
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
