import { db } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

type SchemaCheckRow = {
  projects_table: boolean;
  intake_column: boolean;
};

export async function GET() {
  const startedAt = Date.now();

  try {
    const result = await db.query<SchemaCheckRow>(`
      SELECT
        to_regclass('public.projects') IS NOT NULL AS projects_table,
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'projects'
            AND column_name = 'work_type'
        ) AS intake_column
    `);

    const schema = result.rows[0];
    if (!schema?.projects_table || !schema.intake_column) {
      throw new Error("Database schema is behind the application migrations");
    }

    return Response.json(
      {
        status: "ok",
        service: "stroyselect",
        check: "ready",
        database: "ok",
        schema: "ok",
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
        database: "unavailable_or_stale",
        schema: "unavailable_or_stale",
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
