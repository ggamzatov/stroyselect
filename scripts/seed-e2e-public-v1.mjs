import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for Public V1 E2E seed");
}

const PUBLISHED_PROJECT_ID = "00000000-0000-4000-8000-000000000301";
const CONTRACTOR_COMPANY_ID = "00000000-0000-4000-8000-000000000201";
const PUBLISHED_BID_ID = "00000000-0000-4000-8000-000000000403";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});
const client = await pool.connect();

try {
  await client.query("BEGIN");

  // Keep the fixture deterministic. The INSERT below must exercise the
  // production revision trigger and create exactly revision #1.
  await client.query(
    `DELETE FROM public.project_bid_revisions WHERE bid_id=$1::uuid`,
    [PUBLISHED_BID_ID]
  );
  await client.query(
    `DELETE FROM public.project_bids WHERE id=$1::uuid`,
    [PUBLISHED_BID_ID]
  );

  await client.query(
    `
      INSERT INTO public.project_bids(
        id,
        project_id,
        contractor_id,
        price,
        duration_days,
        proposed_start_date,
        message,
        scope_summary,
        materials_summary,
        exclusions,
        payment_terms,
        warranty_months,
        price_includes_materials,
        completeness_score,
        status,
        updated_at
      ) VALUES(
        $1::uuid,
        $2::uuid,
        $3::uuid,
        980000,
        40,
        current_date + 10,
        'E2E Public V1 предложение для проверки истории версий.',
        'Подготовка объекта, основной комплекс работ и итоговая сдача.',
        'Основные материалы включены в стоимость предложения.',
        'Дополнительные работы за пределами согласованного объёма.',
        'Оплата по этапам после подтверждения результата.',
        24,
        true,
        100,
        'submitted',
        now()
      )
    `,
    [PUBLISHED_BID_ID, PUBLISHED_PROJECT_ID, CONTRACTOR_COMPANY_ID]
  );

  const revisionResult = await client.query(
    `
      SELECT revision_no
      FROM public.project_bid_revisions
      WHERE bid_id=$1::uuid
      ORDER BY revision_no ASC
    `,
    [PUBLISHED_BID_ID]
  );

  if (
    revisionResult.rows.length !== 1 ||
    Number(revisionResult.rows[0]?.revision_no) !== 1
  ) {
    throw new Error(
      `Expected immutable bid revision #1, got ${JSON.stringify(revisionResult.rows)}`
    );
  }

  await client.query("COMMIT");
  console.log("Public V1 E2E bid revision fixture готов: revision #1");
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Public V1 E2E seed failed:", error);
  throw error;
} finally {
  client.release();
  await pool.end();
}
