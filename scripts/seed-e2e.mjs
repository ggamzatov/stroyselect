import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL не указан. Запускайте через npm run e2e:seed с .env.local");
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

  await client.query(`DELETE FROM public.contractor_services WHERE contractor_id=$1::uuid`, [IDS.company]);
  await client.query(
    `INSERT INTO public.contractor_services(contractor_id,category_id,is_primary) VALUES($1::uuid,$2,true)`,
    [IDS.company, categoryId]
  );

  await client.query(`DELETE FROM public.contractor_service_areas WHERE contractor_id=$1::uuid`, [IDS.company]);
  await client.query(
    `INSERT INTO public.contractor_service_areas(contractor_id,region,city,is_primary) VALUES($1::uuid,$2,$3,true)`,
    [IDS.company, REGION, CITY]
  );

  await upsertProject(client, {
    id: IDS.publishedProject,
    customerId: IDS.customer,
    categoryId,
    title: "E2E Опубликованный проект",
    description: "Тестовый опубликованный проект для проверки matching, приглашения подрядчика и отправки предложения.",
    status: "published",
    selectedContractorId: null,
    selectedBidId: null,
  });

  await upsertProject(client, {
    id: IDS.workspaceProject,
    customerId: IDS.customer,
    categoryId,
    title: "E2E Проект в работе",
    description: "Тестовый проект с выбранным подрядчиком для проверки рабочего пространства, бюджета, документов и замечаний.",
    status: "in_progress",
    selectedContractorId: IDS.company,
    selectedBidId: IDS.workspaceBid,
  }, false);

  await upsertBid(client, IDS.workspaceBid, IDS.workspaceProject, IDS.company, "accepted", 1200000, 45);
  await client.query(
    `UPDATE public.projects SET selected_contractor_id=$2::uuid,selected_bid_id=$3::uuid,status='in_progress',updated_at=now() WHERE id=$1::uuid`,
    [IDS.workspaceProject, IDS.company, IDS.workspaceBid]
  );

  await upsertStage(client, IDS.workspaceStage, IDS.workspaceProject, IDS.contractor, "Основной этап E2E", "in_progress", 100, 1200000);

  await upsertProject(client, {
    id: IDS.completedProject,
    customerId: IDS.customer,
    categoryId,
    title: "E2E Завершённый проект",
    description: "Тестовый завершённый проект для проверки финального отзыва и истории выполнения.",
    status: "in_progress",
    selectedContractorId: IDS.company,
    selectedBidId: IDS.completedBid,
  }, false);

  await upsertBid(client, IDS.completedBid, IDS.completedProject, IDS.company, "accepted", 850000, 30);
  await client.query(
    `UPDATE public.projects SET selected_contractor_id=$2::uuid,selected_bid_id=$3::uuid,status='in_progress',updated_at=now() WHERE id=$1::uuid`,
    [IDS.completedProject, IDS.company, IDS.completedBid]
  );
  await upsertStage(client, IDS.completedStage, IDS.completedProject, IDS.contractor, "Завершённый этап E2E", "completed", 100, 850000);
  await client.query(
    `UPDATE public.projects SET status='completed',updated_at=now() WHERE id=$1::uuid`,
    [IDS.completedProject]
  );

  await client.query("COMMIT");

  const envText = [
    `E2E_CUSTOMER_EMAIL=${CUSTOMER_EMAIL}`,
    `E2E_CUSTOMER_PASSWORD=${PASSWORD}`,
    `E2E_CONTRACTOR_EMAIL=${CONTRACTOR_EMAIL}`,
    `E2E_CONTRACTOR_PASSWORD=${PASSWORD}`,
    `E2E_PROJECT_ID=${IDS.publishedProject}`,
    `E2E_WORKSPACE_PROJECT_ID=${IDS.workspaceProject}`,
    `E2E_COMPLETED_PROJECT_ID=${IDS.completedProject}`,
    `E2E_RUN_MUTATIONS=0`,
    "",
  ].join("\n");

  const envPath = path.join(process.cwd(), ".env.e2e.local");
  await fs.writeFile(envPath, envText, { mode: 0o600 });

  console.log("E2E seed готов.");
  console.log(`Customer:   ${CUSTOMER_EMAIL}`);
  console.log(`Contractor: ${CONTRACTOR_EMAIL}`);
  console.log(`Project:    ${IDS.publishedProject}`);
  console.log(`Workspace:  ${IDS.workspaceProject}`);
  console.log(`Completed:  ${IDS.completedProject}`);
  console.log("Переменные записаны в .env.e2e.local");
} catch (error) {
  await client.query("ROLLBACK");
  console.error("E2E seed failed:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

async function ensureCategory(client) {
  const existing = await client.query(
    `SELECT id FROM public.service_categories WHERE COALESCE(is_active,true)=true ORDER BY id ASC LIMIT 1`
  );
  if (existing.rows[0]?.id !== undefined) return existing.rows[0].id;

  const created = await client.query(
    `INSERT INTO public.service_categories(name,is_active) VALUES('E2E Общестроительные работы',true) RETURNING id`
  );
  return created.rows[0].id;
}

async function upsertUser(client, id, email, passwordHash, role, firstName, lastName) {
  await client.query(
    `
      INSERT INTO public.users(id,email,password_hash,email_confirmed_at,raw_user_meta_data,is_active)
      VALUES($1::uuid,$2::text,$3::text,now(),$4::jsonb,true)
      ON CONFLICT(id) DO UPDATE SET
        email=EXCLUDED.email,password_hash=EXCLUDED.password_hash,email_confirmed_at=now(),
        raw_user_meta_data=EXCLUDED.raw_user_meta_data,is_active=true
    `,
    [id, email, passwordHash, JSON.stringify({ role, first_name: firstName, last_name: lastName })]
  );

  await client.query(
    `
      INSERT INTO public.profiles(id,role,first_name,last_name,email,is_blocked,phone,city)
      VALUES($1::uuid,$2,$3,$4,$5::text,false,$6,$7)
      ON CONFLICT(id) DO UPDATE SET
        role=EXCLUDED.role,first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,
        email=EXCLUDED.email,is_blocked=false,phone=EXCLUDED.phone,city=EXCLUDED.city
    `,
    [id, role, firstName, lastName, email, role === "customer" ? "+79990000001" : "+79990000002", CITY]
  );
}

async function upsertProject(client, values, includeSelection = true) {
  const params = [
    values.id,
    values.customerId,
    values.categoryId,
    values.title,
    values.description,
    "private_house",
    REGION,
    CITY,
    "E2E тестовый адрес",
    700000,
    1500000,
    values.status,
  ];

  await client.query(
    `
      INSERT INTO public.projects(
        id,customer_id,category_id,title,description,property_type,region,city,address,
        budget_min,budget_max,status,desired_start_date,desired_end_date,updated_at
      ) VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,current_date+7,current_date+90,now())
      ON CONFLICT(id) DO UPDATE SET
        customer_id=EXCLUDED.customer_id,category_id=EXCLUDED.category_id,title=EXCLUDED.title,
        description=EXCLUDED.description,property_type=EXCLUDED.property_type,region=EXCLUDED.region,
        city=EXCLUDED.city,address=EXCLUDED.address,budget_min=EXCLUDED.budget_min,budget_max=EXCLUDED.budget_max,
        desired_start_date=EXCLUDED.desired_start_date,desired_end_date=EXCLUDED.desired_end_date,
        status=EXCLUDED.status,updated_at=now()
    `,
    params
  );

  if (includeSelection) {
    await client.query(
      `UPDATE public.projects SET selected_contractor_id=$2::uuid,selected_bid_id=$3::uuid WHERE id=$1::uuid`,
      [values.id, values.selectedContractorId, values.selectedBidId]
    );
  }
}

async function upsertBid(client, id, projectId, contractorId, status, price, durationDays) {
  await client.query(
    `
      INSERT INTO public.project_bids(
        id,project_id,contractor_id,price,duration_days,proposed_start_date,message,
        scope_summary,materials_summary,exclusions,payment_terms,warranty_months,
        price_includes_materials,completeness_score,status,updated_at
      ) VALUES(
        $1::uuid,$2::uuid,$3::uuid,$4,$5,current_date+7,$6,$7,$8,$9,$10,24,true,100,$11,now()
      )
      ON CONFLICT(id) DO UPDATE SET
        project_id=EXCLUDED.project_id,contractor_id=EXCLUDED.contractor_id,price=EXCLUDED.price,
        duration_days=EXCLUDED.duration_days,proposed_start_date=EXCLUDED.proposed_start_date,
        message=EXCLUDED.message,scope_summary=EXCLUDED.scope_summary,materials_summary=EXCLUDED.materials_summary,
        exclusions=EXCLUDED.exclusions,payment_terms=EXCLUDED.payment_terms,warranty_months=EXCLUDED.warranty_months,
        price_includes_materials=EXCLUDED.price_includes_materials,completeness_score=EXCLUDED.completeness_score,
        status=EXCLUDED.status,updated_at=now()
    `,
    [
      id, projectId, contractorId, price, durationDays,
      "Автоматическое E2E предложение",
      "Полный комплекс работ по тестовому проекту.",
      "Основные материалы включены в стоимость.",
      "Дополнительные работы вне согласованного объёма.",
      "Оплата по этапам после приёмки.",
      status,
    ]
  );
}

async function upsertStage(client, id, projectId, createdBy, title, status, weight, price) {
  await client.query(
    `
      INSERT INTO public.project_stages(
        id,project_id,created_by,title,description,price,progress_weight,sort_order,status,
        planned_start_date,planned_end_date,updated_at
      ) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,0,$8,current_date-10,current_date+30,now())
      ON CONFLICT(id) DO UPDATE SET
        project_id=EXCLUDED.project_id,created_by=EXCLUDED.created_by,title=EXCLUDED.title,
        description=EXCLUDED.description,price=EXCLUDED.price,progress_weight=EXCLUDED.progress_weight,
        sort_order=0,status=EXCLUDED.status,planned_start_date=EXCLUDED.planned_start_date,
        planned_end_date=EXCLUDED.planned_end_date,updated_at=now()
    `,
    [id, projectId, createdBy, title, "Автоматический этап для E2E проверки", price, weight, status]
  );
}
