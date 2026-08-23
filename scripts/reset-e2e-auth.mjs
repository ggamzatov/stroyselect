import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for E2E auth reset");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();

try {
  await client.query("BEGIN");

  const e2eUsers = await client.query(`
    SELECT id
    FROM public.users
    WHERE lower(email) LIKE 'e2e.%@stroyselect.local'
  `);

  const ids = e2eUsers.rows.map((row) => row.id);

  if (ids.length > 0) {
    await client.query(
      `UPDATE public.users
       SET is_active = true,
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           must_change_password = false
       WHERE id = ANY($1::uuid[])`,
      [ids]
    );

    await client.query(
      `DELETE FROM public.auth_sessions WHERE user_id = ANY($1::uuid[])`,
      [ids]
    );
  }

  // E2E databases are disposable/local test databases. Clear login locks so repeated
  // regression runs cannot poison the next run with rate-limit state.
  await client.query(`DELETE FROM public.auth_login_attempts`);

  await client.query("COMMIT");
  console.log(`E2E auth state reset for ${ids.length} users.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
