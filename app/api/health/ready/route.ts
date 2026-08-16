import { db } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await db.query("SELECT 1");

    return Response.json(
      {
        status: "ok",
        service: "stroyselect",
        check: "ready",
        database: "ok",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Readiness check failed:", error);

    return Response.json(
      {
        status: "error",
        service: "stroyselect",
        check: "ready",
        database: "unavailable",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
