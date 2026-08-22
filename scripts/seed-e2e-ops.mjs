import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  const envFile = path.resolve(".env.local");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL не указан ни в окружении, ни в .env.local");
}

const ADMIN_ID = "00000000-0000-4000-8000-000000000103";
const ADMIN_EMAIL = "e2e.admin@stroyselect.local";
const CUSTOMER_ID = "00000000-0000-4000-8000-000000000101";
const WORKSPACE_PROJECT_ID = "00000000-0000-4000-8000-000000000302";
const WORKSPACE_STAGE_ID = "00000000-0000-4000-8000-000000000501";
const PAYMENT_ID = "00000000-0000-4000-8000-000000000601";
const PAYMENT_KEY = "00000000-0000-4000-8000-000000000701";
const PASSWORD = process.env.E2E_SEED_PASSWORD || "StroySelect-E2E-2026!";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();

try {
  await client.query("BEGIN");
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await client.query(
    `
      INSERT INTO public.users(id,email,password_hash,email_confirmed_at,raw_user_meta_data,is_active)
      VALUES($1::uuid,$2::text,$3::text,now(),$4::jsonb,true)
      ON CONFLICT(id) DO UPDATE SET
        email=EXCLUDED.email,
        password_hash=EXCLUDED.password_hash,
        email_confirmed_at=now(),
        raw_user_meta_data=EXCLUDED.raw_user_meta_data,
        is_active=true
    `,
    [ADMIN_ID, ADMIN_EMAIL, passwordHash, JSON.stringify({ role: "admin", first_name: "E2E", last_name: "Администратор" })]
  );

  await client.query(
    `
      INSERT INTO public.profiles(id,role,first_name,last_name,email,is_blocked)
      VALUES($1::uuid,'admin','E2E','Администратор',$2::text,false)
      ON CONFLICT(id) DO UPDATE SET
        role='admin',first_name='E2E',last_name='Администратор',email=EXCLUDED.email,is_blocked=false
    `,
    [ADMIN_ID, ADMIN_EMAIL]
  );

  await client.query(`DELETE FROM public.project_payment_confirmations WHERE payment_id=$1::uuid`, [PAYMENT_ID]);
  await client.query(`DELETE FROM public.project_payments WHERE id=$1::uuid`, [PAYMENT_ID]);
  await client.query(
    `
      INSERT INTO public.project_payments(
        id,project_id,recorded_by,stage_id,amount,paid_at,note,idempotency_key
      ) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,15000,current_date,'E2E платёж для подтверждения',$5::uuid)
    `,
    [PAYMENT_ID, WORKSPACE_PROJECT_ID, CUSTOMER_ID, WORKSPACE_STAGE_ID, PAYMENT_KEY]
  );

  await client.query(
    `
      UPDATE public.project_payment_confirmations
      SET status='pending',customer_confirmed_at=NULL,contractor_confirmed_at=NULL,
          disputed_at=NULL,disputed_by=NULL,dispute_reason=NULL,
          cancelled_at=NULL,cancelled_by=NULL,cancellation_reason=NULL,updated_at=now()
      WHERE payment_id=$1::uuid
    `,
    [PAYMENT_ID]
  );

  await client.query("COMMIT");

  const envPath = path.join(process.cwd(), ".env.e2e.local");
  let envText = await fs.readFile(envPath, "utf8");
  const additions = {
    E2E_ADMIN_EMAIL: ADMIN_EMAIL,
    E2E_ADMIN_PASSWORD: PASSWORD,
    E2E_PAYMENT_ID: PAYMENT_ID,
  };
  for (const [key, value] of Object.entries(additions)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    envText = pattern.test(envText) ? envText.replace(pattern, line) : `${envText.trimEnd()}\n${line}\n`;
  }
  await fs.writeFile(envPath, envText, { mode: 0o600 });

  console.log(`Admin:      ${ADMIN_EMAIL}`);
  console.log(`Payment:    ${PAYMENT_ID}`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("E2E ops seed failed:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
