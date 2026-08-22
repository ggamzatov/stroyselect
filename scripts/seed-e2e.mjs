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

const IDS = {
  customer: "00000000-0000-4000-8000-000000000101",
  contractor: "00000000-0000-4000-8000-000000000102",
  company: "00000000-0000-4000-8000-000000000201",
  publishedProject: "00000000-0000-4000-8000-000000000301",
  workspaceProject: "00000000-0000-4000-8000-000000000302",
  completedProject: "00000000-0000-4000-8000-000000000303",
  workspaceBid: "00000000-0000-4000-8000-000000000401",
  completedBid: "00000000-0000-4000-8000-000000000402",
  workspaceStage: "00000000-0000-4000-8000-000000000501",
  completedStage: "00000000-0000-4000-8000-000000000502",
};

const CUSTOMER_EMAIL = "e2e.customer@stroyselect.local";
const CONTRACTOR_EMAIL = "e2e.contractor@stroyselect.local";
const PASSWORD = process.env.E2E_SEED_PASSWORD || "StroySelect-E2E-2026!";
const CITY = "Махачкала";
const REGION = "Республика Дагестан";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();

try {
  await client.query("BEGIN");

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const categoryId = await ensureCategory(client);

  await upsertUser(client, IDS.customer, CUSTOMER_EMAIL, passwordHash, "customer", "E2E", "Заказчик");
  await upsertUser(client, IDS.contractor, CONTRACTOR_EMAIL, passwordHash, "contractor", "E2E", "Подрядчик");

  await client.query(
    `
      INSERT INTO public.contractor_companies (
        id, owner_id, public_name, legal_name, company_type, inn, ogrn,
        description, founded_year, employee_count, contact_phone, contact_email,
        accepts_new_projects, verification_status, verification_comment, updated_at
      ) VALUES (
        $1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,'verified',NULL,now()
      )
      ON CONFLICT (id) DO UPDATE SET
        owner_id=EXCLUDED.owner_id,
        public_name=EXCLUDED.public_name,
        legal_name=EXCLUDED.legal_name,
        company_type=EXCLUDED.company_type,
        inn=EXCLUDED.inn,
        ogrn=EXCLUDED.ogrn,
        description=EXCLUDED.description,
        founded_year=EXCLUDED.founded_year,
        employee_count=EXCLUDED.employee_count,
        contact_phone=EXCLUDED.contact_phone,
        contact_email=EXCLUDED.contact_email,
        accepts_new_projects=true,
        verification_status='verified',
        verification_comment=NULL,
        updated_at=now()
    `,
    [
      IDS.company,
      IDS.contractor,
      "E2E Строй Подрядчик",
      "ООО E2E Строй",
      "company",
      "057300000001",
      "1260500000001",
      "Автоматически созданная тестовая компания для полного E2E marketplace flow StroySelect.",
      2018,
      12,
      "+79990000002",
      CONTRACTOR_EMAIL,
    ]
  );

  await client.query(
    `
      INSERT INTO public.contractor_services (contractor_id, category_id, is_primary)
      VALUES ($1::uuid, $2::bigint, true)
      ON CONFLICT (contractor_id, category_id) DO UPDATE SET is_primary=true
    `,
    [IDS.company, categoryId]
  );

  await upsertProject(client, {
    id: IDS.publishedProject,
    customerId: IDS.customer,
    categoryId,
    title: "E2E опубликованный проект",
    description: "Тестовый опубликованный проект для проверки matching, приглашений и предложений подрядчиков.",
    status: "published",
    selectedContractorId: null,
    budgetMin: 250000,
    budgetMax: 500000,
  });

  await upsertProject(client, {
    id: IDS.workspaceProject,
    customerId: IDS.customer,
    categoryId,
    title: "E2E проект в работе",
    description: "Тестовый проект с выбранным подрядчиком для проверки workspace, этапов и совместной работы.",
    status: "in_progress",
    selectedContractorId: IDS.company,
    budgetMin: 500000,
    budgetMax: 900000,
  });

  await upsertProject(client, {
    id: IDS.completedProject,
    customerId: IDS.customer,
    categoryId,
    title: "E2E завершённый проект",
    description: "Тестовый завершённый проект для проверки финального отзыва и истории сотрудничества.",
    status: "completed",
    selectedContractorId: IDS.company,
    budgetMin: 300000,
    budgetMax: 450000,
  });

  await upsertBid(client, IDS.workspaceBid, IDS.workspaceProject, IDS.company, "accepted", 650000, 45);
  await upsertBid(client, IDS.completedBid, IDS.completedProject, IDS.company, "accepted", 390000, 30);

  await upsertStage(client, IDS.workspaceStage, IDS.workspaceProject, "Основной этап E2E", "in_progress", 1);
  await upsertStage(client, IDS.completedStage, IDS.completedProject, "Завершённый этап E2E", "completed", 1);

  await client.query(
    `
      INSERT INTO public.project_contractor_invitations (project_id, contractor_id, invited_by, status, created_at, updated_at)
      VALUES ($1::uuid,$2::uuid,$3::uuid,'invited',now(),now())
      ON CONFLICT (project_id, contractor_id) DO UPDATE SET
        invited_by=EXCLUDED.invited_by,
        status='invited',
        updated_at=now()
    `,
    [IDS.publishedProject, IDS.company, IDS.customer]
  );

  await client.query("COMMIT");

  const envLines = [
    `E2E_CUSTOMER_EMAIL=${CUSTOMER_EMAIL}`,
    `E2E_CUSTOMER_PASSWORD=${PASSWORD}`,
    `E2E_CONTRACTOR_EMAIL=${CONTRACTOR_EMAIL}`,
    `E2E_CONTRACTOR_PASSWORD=${PASSWORD}`,
    `E2E_PROJECT_ID=${IDS.publishedProject}`,
    `E2E_WORKSPACE_PROJECT_ID=${IDS.workspaceProject}`,
    `E2E_COMPLETED_PROJECT_ID=${IDS.completedProject}`,
    "E2E_RUN_MUTATIONS=0",
  ];

  await fs.writeFile(path.resolve(".env.e2e.local"), `${envLines.join("\n")}\n`, "utf8");
  console.log("Seeded E2E marketplace fixtures and wrote .env.e2e.local");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}

async function ensureCategory(client) {
  const existing = await client.query(
    `SELECT id FROM public.service_categories WHERE is_active IS DISTINCT FROM false ORDER BY id LIMIT 1`
  );
  if (existing.rows[0]?.id) return existing.rows[0].id;

  const created = await client.query(
    `INSERT INTO public.service_categories(name,slug,is_active) VALUES('E2E категория','e2e-category',true) RETURNING id`
  );
  return created.rows[0].id;
}

async function upsertUser(client, id, email, passwordHash, role, firstName, lastName) {
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
    [id, email, passwordHash, JSON.stringify({ role, first_name: firstName, last_name: lastName })]
  );

  await client.query(
    `
      INSERT INTO public.profiles(id,role,first_name,last_name,email,is_blocked)
      VALUES($1::uuid,$2::text,$3::text,$4::text,$5::text,false)
      ON CONFLICT(id) DO UPDATE SET
        role=EXCLUDED.role,
        first_name=EXCLUDED.first_name,
        last_name=EXCLUDED.last_name,
        email=EXCLUDED.email,
        is_blocked=false
    `,
    [id, role, firstName, lastName, email]
  );
}

async function upsertProject(client, project) {
  await client.query(
    `
      INSERT INTO public.projects(
        id, customer_id, category_id, title, description, property_type, region, city,
        budget_min, budget_max, status, selected_contractor_id, published_at, updated_at
      ) VALUES(
        $1::uuid,$2::uuid,$3::bigint,$4,$5,'private_house',$6,$7,$8,$9,$10,$11::uuid,
        CASE WHEN $10='draft' THEN NULL ELSE now() END,now()
      )
      ON CONFLICT(id) DO UPDATE SET
        customer_id=EXCLUDED.customer_id,
        category_id=EXCLUDED.category_id,
        title=EXCLUDED.title,
        description=EXCLUDED.description,
        property_type=EXCLUDED.property_type,
        region=EXCLUDED.region,
        city=EXCLUDED.city,
        budget_min=EXCLUDED.budget_min,
        budget_max=EXCLUDED.budget_max,
        status=EXCLUDED.status,
        selected_contractor_id=EXCLUDED.selected_contractor_id,
        published_at=EXCLUDED.published_at,
        updated_at=now()
    `,
    [
      project.id,
      project.customerId,
      project.categoryId,
      project.title,
      project.description,
      REGION,
      CITY,
      project.budgetMin,
      project.budgetMax,
      project.status,
      project.selectedContractorId,
    ]
  );
}

async function upsertBid(client, id, projectId, contractorId, status, price, durationDays) {
  await client.query(
    `
      INSERT INTO public.project_bids(
        id,project_id,contractor_id,price,duration_days,message,status,scope_summary,materials_summary,payment_terms,updated_at
      ) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,'E2E предложение',$6,'Полный объём E2E работ','Материалы согласуются','Оплата по этапам',now())
      ON CONFLICT(id) DO UPDATE SET
        price=EXCLUDED.price,
        duration_days=EXCLUDED.duration_days,
        message=EXCLUDED.message,
        status=EXCLUDED.status,
        scope_summary=EXCLUDED.scope_summary,
        materials_summary=EXCLUDED.materials_summary,
        payment_terms=EXCLUDED.payment_terms,
        updated_at=now()
    `,
    [id, projectId, contractorId, price, durationDays, status]
  );
}

async function upsertStage(client, id, projectId, title, status, position) {
  await client.query(
    `
      INSERT INTO public.project_stages(id,project_id,title,description,status,position,weight,updated_at)
      VALUES($1::uuid,$2::uuid,$3,'E2E этап',$4,$5,100,now())
      ON CONFLICT(id) DO UPDATE SET
        title=EXCLUDED.title,
        description=EXCLUDED.description,
        status=EXCLUDED.status,
        position=EXCLUDED.position,
        weight=EXCLUDED.weight,
        updated_at=now()
    `,
    [id, projectId, title, status, position]
  );
}
