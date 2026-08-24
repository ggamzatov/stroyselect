import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for full-app E2E seed");

const IDS = {
  customer: "00000000-0000-4000-8000-000000000101",
  company: "00000000-0000-4000-8000-000000000201",
  workspaceProject: "00000000-0000-4000-8000-000000000302",
  supplier: "00000000-0000-4000-8000-000000001101",
  dispute: "00000000-0000-4000-8000-000000002101",
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();

try {
  await client.query("BEGIN");

  await client.query(
    `INSERT INTO public.project_disputes(
       id,project_id,opened_by,subject,description,status,priority,updated_at
     ) VALUES(
       $1::uuid,$2::uuid,$3::uuid,
       'E2E Спор для полного аудита приложения',
       'Детерминированная запись для проверки списка и карточки спора администратором.',
       'under_review','high',now()
     )
     ON CONFLICT(id) DO UPDATE SET
       project_id=EXCLUDED.project_id,
       opened_by=EXCLUDED.opened_by,
       subject=EXCLUDED.subject,
       description=EXCLUDED.description,
       status='under_review',
       priority='high',
       resolution=NULL,
       resolved_by=NULL,
       resolved_at=NULL,
       admin_note=NULL,
       admin_resolved_by=NULL,
       admin_resolved_at=NULL,
       updated_at=now()`,
    [IDS.dispute, IDS.workspaceProject, IDS.customer]
  );

  await client.query(`DELETE FROM public.project_dispute_messages WHERE dispute_id=$1::uuid`, [IDS.dispute]);
  await client.query(
    `INSERT INTO public.project_dispute_messages(dispute_id,author_id,body)
     VALUES($1::uuid,$2::uuid,'E2E сообщение: проверка отображения переписки по спору.')`,
    [IDS.dispute, IDS.customer]
  );

  const category = await client.query(
    `SELECT sc.slug
     FROM public.contractor_services cs
     JOIN public.service_categories sc ON sc.id=cs.category_id
     WHERE cs.contractor_id=$1::uuid
       AND COALESCE(sc.is_active,true)=true
       AND sc.slug IS NOT NULL
       AND length(trim(sc.slug))>0
     ORDER BY cs.is_primary DESC, sc.id ASC
     LIMIT 1`,
    [IDS.company]
  );
  const categorySlug = category.rows[0]?.slug?.trim();
  if (!categorySlug) throw new Error("Active E2E service category with slug not found");

  const supplier = await client.query(`SELECT 1 FROM public.material_suppliers WHERE id=$1::uuid LIMIT 1`, [IDS.supplier]);
  if (!supplier.rowCount) throw new Error("E2E material supplier not found");

  await client.query("COMMIT");

  const envPath = path.join(process.cwd(), ".env.e2e.local");
  let envText = await fs.readFile(envPath, "utf8");
  const additions = {
    E2E_CUSTOMER_ID: IDS.customer,
    E2E_COMPANY_ID: IDS.company,
    E2E_SUPPLIER_ID: IDS.supplier,
    E2E_DISPUTE_ID: IDS.dispute,
    E2E_CATEGORY_SLUG: categorySlug,
    E2E_CITY_SLUG: "махачкала",
  };

  for (const [key, value] of Object.entries(additions)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    envText = pattern.test(envText) ? envText.replace(pattern, line) : `${envText.trimEnd()}\n${line}\n`;
  }
  await fs.writeFile(envPath, envText, { mode: 0o600 });

  console.log("E2E full-app fixture готов: dynamic route identifiers + admin dispute");
  console.log(`Dispute:    ${IDS.dispute}`);
  console.log(`Category:   ${categorySlug}`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("E2E full-app seed failed:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
