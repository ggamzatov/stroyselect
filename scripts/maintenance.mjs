import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(2);
}

const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000 });
try {
  await pool.query("SELECT public.stroyselect_housekeeping()");
  const stats = await pool.query(`
    SELECT
      (SELECT count(*) FROM public.auth_sessions WHERE revoked_at IS NULL AND expires_at > now()) AS active_sessions,
      (SELECT count(*) FROM public.application_errors WHERE resolved_at IS NULL) AS open_errors,
      (SELECT count(*) FROM public.action_rate_limits) AS rate_limit_rows
  `);
  console.log("Housekeeping complete", stats.rows[0]);
} finally {
  await pool.end();
}
