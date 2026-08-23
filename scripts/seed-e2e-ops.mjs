import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL не указан");
}

const ADMIN_ID = "00000000-0000-4000-8000-000000000103";
const ADMIN_EMAIL = "e2e.admin@stroyselect.local";
const CUSTOMER_ID = "00000000-0000-4000-8000-000000000101";
const CONTRACTOR_ID = "00000000-0000-4000-8000-000000000102";
const COMPANY_ID = "00000000-0000-4000-8000-000000000201";
const WORKSPACE_PROJECT_ID = "00000000-0000-4000-8000-000000000302";
const WORKSPACE_BID_ID = "00000000-0000-4000-8000-000000000401";
const PAYMENT_STAGE_ID = "00000000-0000-4000-8000-000000000503";
const CONTRACT_ID = "00000000-0000-4000-8000-000000000801";
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

  const contractResult = await client.query(
    `
      INSERT INTO public.project_contracts(
        id,project_id,source_bid_id,customer_id,contractor_id,status,current_version,updated_at
      ) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,'active',1,now())
      ON CONFLICT(project_id) DO UPDATE SET
        source_bid_id=EXCLUDED.source_bid_id,
        customer_id=EXCLUDED.customer_id,
        contractor_id=EXCLUDED.contractor_id,
        status='active',
        current_version=1,
        updated_at=now()
      RETURNING id
    `,
    [CONTRACT_ID, WORKSPACE_PROJECT_ID, WORKSPACE_BID_ID, CUSTOMER_ID, COMPANY_ID]
  );
  const contractId = contractResult.rows[0]?.id;
  if (!contractId) throw new Error("E2E договор не создан");

  await client.query(`DELETE FROM public.project_contract_versions WHERE contract_id=$1::uuid`, [contractId]);
  await client.query(
    `
      INSERT INTO public.project_contract_versions(
        contract_id,version_no,title,body,commercial_terms,created_by,
        customer_approved_at,contractor_approved_at,legal_template_version,
        customer_approval_evidence,contractor_approval_evidence
      ) VALUES(
        $1::uuid,1,'E2E подписанный договор','E2E договор для проверки жизненного цикла проекта',
        '{}'::jsonb,$2::uuid,now(),now(),'ru-e2e-1.0',
        '{"source":"e2e"}'::jsonb,'{"source":"e2e"}'::jsonb
      )
    `,
    [contractId, CUSTOMER_ID]
  );

  await client.query(
    `
      INSERT INTO public.project_stages(
        id,project_id,created_by,title,description,price,progress_weight,sort_order,status,
        planned_start_date,planned_end_date,actual_started_at,actual_completed_at,
        submitted_for_review_at,reviewed_at,reviewed_by,updated_at
      ) VALUES(
        $1::uuid,$2::uuid,$3::uuid,'E2E принятый этап для платежа',
        'Отдельный завершённый этап для проверки финансового контура.',15000,0,99,'completed',
        current_date-5,current_date-1,now()-interval '4 days',now()-interval '1 day',
        now()-interval '2 days',now()-interval '1 day',$4::uuid,now()
      )
      ON CONFLICT(id) DO UPDATE SET
        project_id=EXCLUDED.project_id,created_by=EXCLUDED.created_by,title=EXCLUDED.title,
        description=EXCLUDED.description,price=EXCLUDED.price,progress_weight=0,sort_order=99,
        status='completed',actual_started_at=EXCLUDED.actual_started_at,
        actual_completed_at=EXCLUDED.actual_completed_at,submitted_for_review_at=EXCLUDED.submitted_for_review_at,
        reviewed_at=EXCLUDED.reviewed_at,reviewed_by=EXCLUDED.reviewed_by,updated_at=now()
    `,
    [PAYMENT_STAGE_ID, WORKSPACE_PROJECT_ID, CONTRACTOR_ID, CUSTOMER_ID]
  );

  await client.query(`DELETE FROM public.project_payment_confirmations WHERE payment_id=$1::uuid`, [PAYMENT_ID]);
  await client.query(`DELETE FROM public.project_payments WHERE id=$1::uuid`, [PAYMENT_ID]);
  await client.query(
    `
      INSERT INTO public.project_payments(
        id,project_id,recorded_by,stage_id,amount,paid_at,note,idempotency_key
      ) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,15000,current_date,'E2E платёж для подтверждения',$5::uuid)
    `,
    [PAYMENT_ID, WORKSPACE_PROJECT_ID, CUSTOMER_ID, PAYMENT_STAGE_ID, PAYMENT_KEY]
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
  console.log(`Contract:   ${contractId}`);
  console.log(`Payment:    ${PAYMENT_ID}`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("E2E ops seed failed:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
