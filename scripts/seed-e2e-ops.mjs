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
const COMPLETED_PROJECT_ID = "00000000-0000-4000-8000-000000000303";
const WORKSPACE_BID_ID = "00000000-0000-4000-8000-000000000401";
const COMPLETED_BID_ID = "00000000-0000-4000-8000-000000000402";

const WORKSPACE_STAGE_ID = "00000000-0000-4000-8000-000000000501";
const COMPLETED_STAGE_ID = "00000000-0000-4000-8000-000000000502";
const PAYMENT_STAGE_ID = "00000000-0000-4000-8000-000000000503";

const WORKSPACE_CONTRACT_ID = "00000000-0000-4000-8000-000000000801";
const COMPLETED_CONTRACT_ID = "00000000-0000-4000-8000-000000000802";

const PAYMENT_ID = "00000000-0000-4000-8000-000000000601";
const PAYMENT_KEY = "00000000-0000-4000-8000-000000000701";
const APPOINTMENT_TITLE = "E2E Выезд на объект";
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
    [
      ADMIN_ID,
      ADMIN_EMAIL,
      passwordHash,
      JSON.stringify({ role: "admin", first_name: "E2E", last_name: "Администратор" }),
    ]
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

  await client.query(
    `DELETE FROM public.project_appointments WHERE project_id=$1::uuid AND title=$2::text`,
    [WORKSPACE_PROJECT_ID, APPOINTMENT_TITLE]
  );

  // Remove only mutable financial fixtures before rebuilding their stage. The IDs are
  // reserved for E2E and never overlap with user-created records.
  await client.query(
    `DELETE FROM public.project_payment_confirmations WHERE payment_id=$1::uuid`,
    [PAYMENT_ID]
  );
  await client.query(`DELETE FROM public.project_payments WHERE id=$1::uuid`, [PAYMENT_ID]);
  await client.query(
    `DELETE FROM public.project_payment_intents WHERE stage_id=ANY($1::uuid[])`,
    [[WORKSPACE_STAGE_ID, COMPLETED_STAGE_ID, PAYMENT_STAGE_ID]]
  );

  // Base seed leaves both projects at contractor_selected. Reset timestamps/risk state
  // so interrupted previous runs cannot influence the next deterministic lifecycle.
  await client.query(
    `
      UPDATE public.projects
      SET status='contractor_selected',work_started_at=NULL,completed_at=NULL,
          risk_hold=false,risk_hold_reason=NULL,risk_hold_by=NULL,risk_hold_at=NULL,updated_at=now()
      WHERE id=ANY($1::uuid[])
    `,
    [[WORKSPACE_PROJECT_ID, COMPLETED_PROJECT_ID]]
  );

  // Existing stage rows may be in any terminal state from the previous run. Delete only
  // the deterministic E2E stages and recreate them after the signed contracts exist.
  await client.query(
    `DELETE FROM public.project_stages WHERE id=ANY($1::uuid[])`,
    [[WORKSPACE_STAGE_ID, COMPLETED_STAGE_ID, PAYMENT_STAGE_ID]]
  );

  const workspaceContractId = await ensureSignedContract({
    projectId: WORKSPACE_PROJECT_ID,
    bidId: WORKSPACE_BID_ID,
    preferredContractId: WORKSPACE_CONTRACT_ID,
    title: "E2E подписанный договор рабочего проекта",
  });
  const completedContractId = await ensureSignedContract({
    projectId: COMPLETED_PROJECT_ID,
    bidId: COMPLETED_BID_ID,
    preferredContractId: COMPLETED_CONTRACT_ID,
    title: "E2E подписанный договор завершённого проекта",
  });

  // Stage plans are created only after a current contract is signed by both parties.
  // Workspace total is 100%: the payment-archive stage has zero structural weight and
  // exists only to exercise the manual payment confirmation UI.
  await insertPlannedStage({
    id: WORKSPACE_STAGE_ID,
    projectId: WORKSPACE_PROJECT_ID,
    title: "Основной этап E2E",
    description: "Основной выполняемый этап рабочего E2E проекта.",
    price: 1200000,
    weight: 100,
    sortOrder: 0,
  });
  await insertPlannedStage({
    id: PAYMENT_STAGE_ID,
    projectId: WORKSPACE_PROJECT_ID,
    title: "E2E принятый этап для платежа",
    description: "Отдельный завершённый этап для проверки финансового контура.",
    price: 15000,
    weight: 0,
    sortOrder: 99,
  });
  await insertPlannedStage({
    id: COMPLETED_STAGE_ID,
    projectId: COMPLETED_PROJECT_ID,
    title: "Завершённый этап E2E",
    description: "Этап для проверки корректного завершения проекта и отзыва.",
    price: 850000,
    weight: 100,
    sortOrder: 0,
  });

  // Start projects only after the signed contract and 100% stage plan exist.
  await startProject(WORKSPACE_PROJECT_ID);
  await startProject(COMPLETED_PROJECT_ID);

  // Exercise only allowed stage transitions. This makes the seed itself a regression
  // check for the DB lifecycle guards introduced after migration 052.
  await setStageStatus(WORKSPACE_STAGE_ID, WORKSPACE_PROJECT_ID, "planned", "in_progress", {
    actual_started_at: "now() - interval '1 day'",
  });

  await setStageStatus(PAYMENT_STAGE_ID, WORKSPACE_PROJECT_ID, "planned", "in_progress", {
    actual_started_at: "now() - interval '4 days'",
  });
  await setStageStatus(PAYMENT_STAGE_ID, WORKSPACE_PROJECT_ID, "in_progress", "awaiting_review", {
    submitted_for_review_at: "now() - interval '2 days'",
  });
  await setStageStatus(PAYMENT_STAGE_ID, WORKSPACE_PROJECT_ID, "awaiting_review", "completed", {
    actual_completed_at: "now() - interval '1 day'",
    reviewed_at: "now() - interval '1 day'",
    reviewed_by: `$customer$`,
  });

  await setStageStatus(COMPLETED_STAGE_ID, COMPLETED_PROJECT_ID, "planned", "in_progress", {
    actual_started_at: "now() - interval '10 days'",
  });
  await setStageStatus(COMPLETED_STAGE_ID, COMPLETED_PROJECT_ID, "in_progress", "awaiting_review", {
    submitted_for_review_at: "now() - interval '2 days'",
  });
  await setStageStatus(COMPLETED_STAGE_ID, COMPLETED_PROJECT_ID, "awaiting_review", "completed", {
    actual_completed_at: "now() - interval '1 day'",
    reviewed_at: "now() - interval '1 day'",
    reviewed_by: `$customer$`,
  });

  await client.query(
    `
      UPDATE public.projects
      SET status='completed',completed_at=now(),updated_at=now()
      WHERE id=$1::uuid AND status='in_progress'
    `,
    [COMPLETED_PROJECT_ID]
  );

  await client.query(
    `
      INSERT INTO public.project_payments(
        id,project_id,recorded_by,stage_id,amount,paid_at,note,idempotency_key
      )
      VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,15000,current_date,
             'E2E платёж для подтверждения',$5::uuid)
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
    envText = pattern.test(envText)
      ? envText.replace(pattern, line)
      : `${envText.trimEnd()}\n${line}\n`;
  }
  await fs.writeFile(envPath, envText, { mode: 0o600 });

  console.log(`Admin:      ${ADMIN_EMAIL}`);
  console.log(`Contract:   ${workspaceContractId}`);
  console.log(`Completed contract: ${completedContractId}`);
  console.log(`Payment:    ${PAYMENT_ID}`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("E2E ops seed failed:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

async function ensureSignedContract({ projectId, bidId, preferredContractId, title }) {
  const contractResult = await client.query(
    `
      INSERT INTO public.project_contracts(
        id,project_id,source_bid_id,customer_id,contractor_id,status,current_version,updated_at
      )
      VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,'active',1,now())
      ON CONFLICT(project_id) DO UPDATE SET
        source_bid_id=EXCLUDED.source_bid_id,
        customer_id=EXCLUDED.customer_id,
        contractor_id=EXCLUDED.contractor_id,
        status='active',
        current_version=1,
        updated_at=now()
      RETURNING id
    `,
    [preferredContractId, projectId, bidId, CUSTOMER_ID, COMPANY_ID]
  );
  const contractId = contractResult.rows[0]?.id;
  if (!contractId) throw new Error(`E2E договор не создан для проекта ${projectId}`);

  await client.query(
    `
      INSERT INTO public.project_contract_versions(
        contract_id,version_no,title,body,commercial_terms,created_by,
        customer_approved_at,contractor_approved_at,legal_template_version,
        customer_approval_evidence,contractor_approval_evidence
      )
      VALUES(
        $1::uuid,1,$2,$3,'{}'::jsonb,$4::uuid,now(),now(),'ru-e2e-1.0',
        '{"source":"e2e"}'::jsonb,'{"source":"e2e"}'::jsonb
      )
      ON CONFLICT(contract_id,version_no) DO NOTHING
    `,
    [
      contractId,
      title,
      "E2E договор для проверки жизненного цикла проекта",
      CUSTOMER_ID,
    ]
  );

  const signed = await client.query(
    `
      SELECT 1
      FROM public.project_contract_versions
      WHERE contract_id=$1::uuid
        AND version_no=1
        AND customer_approved_at IS NOT NULL
        AND contractor_approved_at IS NOT NULL
      LIMIT 1
    `,
    [contractId]
  );
  if (!signed.rowCount) throw new Error(`E2E договор ${contractId} не подписан обеими сторонами`);

  return contractId;
}

async function insertPlannedStage({ id, projectId, title, description, price, weight, sortOrder }) {
  await client.query(
    `
      INSERT INTO public.project_stages(
        id,project_id,created_by,title,description,price,progress_weight,sort_order,status,
        planned_start_date,planned_end_date,updated_at
      )
      VALUES(
        $1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,'planned',
        current_date-10,current_date+30,now()
      )
    `,
    [id, projectId, CONTRACTOR_ID, title, description, price, weight, sortOrder]
  );
}

async function startProject(projectId) {
  const result = await client.query(
    `
      UPDATE public.projects
      SET status='in_progress',work_started_at=now(),updated_at=now()
      WHERE id=$1::uuid AND status='contractor_selected'
      RETURNING id
    `,
    [projectId]
  );
  if (!result.rowCount) throw new Error(`E2E проект ${projectId} не удалось перевести в работу`);
}

async function setStageStatus(stageId, projectId, fromStatus, toStatus, extras = {}) {
  const assignments = ["status=$3::project_stage_status", "updated_at=now()"];
  const values = [stageId, projectId, toStatus];

  for (const [column, expression] of Object.entries(extras)) {
    if (expression === "$customer$") {
      values.push(CUSTOMER_ID);
      assignments.push(`${column}=$${values.length}::uuid`);
    } else {
      assignments.push(`${column}=${expression}`);
    }
  }

  const result = await client.query(
    `
      UPDATE public.project_stages
      SET ${assignments.join(",")}
      WHERE id=$1::uuid
        AND project_id=$2::uuid
        AND status::text=$${values.length + 1}::text
      RETURNING id
    `,
    [...values, fromStatus]
  );

  if (!result.rowCount) {
    throw new Error(`E2E этап ${stageId}: переход ${fromStatus} -> ${toStatus} не выполнен`);
  }
}
