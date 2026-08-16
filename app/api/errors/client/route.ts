import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSessionUserId } from "@/lib/auth/session";
import { logApplicationError } from "@/lib/observability/application-errors";

const schema = z.object({
  message: z.string().trim().min(1).max(10_000),
  stack: z.string().max(30_000).nullable().optional(),
  route: z.string().max(2_000).nullable().optional(),
  digest: z.string().max(160).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const userId = await getCurrentSessionUserId();
  await logApplicationError({
    userId,
    source: "client",
    severity: "error",
    message: parsed.data.message,
    stack: parsed.data.stack ?? null,
    route: parsed.data.route ?? null,
    digest: parsed.data.digest ?? null,
    method: "CLIENT",
    userAgent: request.headers.get("user-agent"),
    metadata: parsed.data.metadata,
  });

  return NextResponse.json({ success: true });
}
