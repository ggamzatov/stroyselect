import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for materials seed");

const I = {
  workspaceProject: "00000000-0000-4000-8000-000000000302",
  deliveryProject: "00000000-0000-4000-8000-000000001901",
  customer: "00000000-0000-4000-8000-000000000101",
  contractor: "00000000-0000-4000-8000-000000000102",
  company: "00000000-0000-4000-8000-000000000201",
  deliveryBid: "00000000-0000-4000-8000-000000001902",
  deliveryContract: "00000000-0000-4000-8000-000000001903",
  supplierA: "00000000-0000-4000-8000-000000001101",
  supplierB: "00000000-0000-4000-8000-000000001102",
  productRadiator: "00000000-0000-4000-8000-000000001201",
  productPipe: "00000000-0000-4000-8000-000000001202",
  offerARadiator: "00000000-0000-4000-8000-000000001301",
  offerAPipe: "00000000-0000-4000-8000-000000001302",
  offerBRadiator: "00000000-0000-4000-8000-000000001303",
  offerBPipe: "00000000-0000-4000-8000-000000001304",
  workspaceList: "00000000-0000-4000-8000-000000001401",
  workspaceItemRadiator: "00000000-0000-4000-8000-000000001501",
  workspaceItemPipe: "00000000-0000-4000-8000-000000001502",
  workspaceRequest: "00000000-0000-4000-8000-000000001601",
  workspaceQuoteA: "00000000-0000-4000-8000-000000001701",
  workspaceQuoteB: "00000000-0000-4000-8000-000000001702",
  locationA: "00000000-0000-4000-8000-000000001801",
  deliveryList: "00000000-0000-4000-8000-000000001904",
  deliveryItemRadiator: "00000000-0000-4000-8000-000000001905",
  deliveryItemPipe: "00000000-0000-4000-8000-000000001906",
  deliveryRequest: "00000000-0000-4000-8000-000000001907",
  deliveryQuote: "00000000-0000-4000-8000-000000001908",
  deliveryOrder: "00000000-0000-4000-8000-000000001909",
  deliveryPayment: "00000000-0000-4000-8000-000000001910",
  deliveryPaymentKey: "00000000-0000-4000-8000-000000001911",
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();

try {
  await client.query("BEGIN");

  // Remove only the dedicated delivery project from an interrupted prior run.
  // The regular workspace fixture stays independent and is rebuilt below in its
  // original pre-order state for public-v1 procurement tests.
  await client.query(`DELETE FROM public.projects WHERE id=$1::uuid`, [I.deliveryProject]);

  await client.query(
    `INSERT INTO public.material_suppliers(
      id,public_name,legal_name,inn,status,commission_bps,integration_mode,contact_email,contact_phone
    ) VALUES
      ($1,'E2E ТеплоСнаб','ООО E2E ТеплоСнаб','057300000101','active',500,'csv','teplo@e2e.local','+79990000101'),
      ($2,'E2E СтройБаза','ООО E2E СтройБаза','057300000102','active',450,'api','baza@e2e.local','+79990000102')
    ON CONFLICT(id) DO UPDATE SET
      status='active',commission_bps=EXCLUDED.commission_bps,
      contact_email=EXCLUDED.contact_email,contact_phone=EXCLUDED.contact_phone,updated_at=now()`,
    [I.supplierA, I.supplierB]
  );

  await client.query(
    `INSERT INTO public.material_supplier_locations(
      id,supplier_id,name,address,region,city,latitude,longitude,phone,loading_notes,is_active
    ) VALUES(
      $1::uuid,$2::uuid,'E2E основной склад',
      'Республика Дагестан, Махачкала, ул. E2E Складская, 10',
      'Республика Дагестан','Махачкала',42.9849000,47.5047000,
      '+79990000101','Въезд через тестовые ворота',true
    )
    ON CONFLICT(supplier_id,name,address) DO UPDATE SET
      latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,phone=EXCLUDED.phone,
      loading_notes=EXCLUDED.loading_notes,is_active=true,updated_at=now()`,
    [I.locationA, I.supplierA]
  );

  await client.query(
    `INSERT INTO public.material_products(
      id,normalized_key,canonical_name,category_name,brand,model,unit,is_active
    ) VALUES
      ($1,'e2e|radiator|500-10|шт','E2E Радиатор биметаллический 500 / 10 секций','Отопление','E2E Heat','500/10','шт',true),
      ($2,'e2e|pipe|ppr25|м','E2E Труба PPR 25 мм','Отопление','E2E Pipe','PPR25','м',true)
    ON CONFLICT(id) DO UPDATE SET is_active=true,updated_at=now()`,
    [I.productRadiator, I.productPipe]
  );

  const offers = [
    [I.offerARadiator, I.supplierA, I.productRadiator, "A-RAD-10", "E2E Радиатор 500x10", 800000, 50, 1],
    [I.offerAPipe, I.supplierA, I.productPipe, "A-PPR-25", "E2E PPR труба 25", 20000, 500, 0],
    [I.offerBRadiator, I.supplierB, I.productRadiator, "B-RAD-10", "Радиатор E2E 10 секций", 780000, 40, 2],
    [I.offerBPipe, I.supplierB, I.productPipe, "B-PPR-25", "Труба полипропилен 25 E2E", 25000, 400, 1],
  ];
  for (const offer of offers) {
    await client.query(
      `INSERT INTO public.material_supplier_offers(
        id,supplier_id,product_id,supplier_sku,raw_name,price_minor,stock_qty,lead_time_days,
        is_active,source,external_updated_at
      ) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,true,'manual',now())
      ON CONFLICT(id) DO UPDATE SET
        price_minor=EXCLUDED.price_minor,stock_qty=EXCLUDED.stock_qty,
        lead_time_days=EXCLUDED.lead_time_days,is_active=true,updated_at=now()`,
      offer
    );
  }

  await seedWorkspaceProcurementFixture();
  await seedDedicatedDeliveryFixture();

  await client.query("COMMIT");

  const envPath = path.join(process.cwd(), ".env.e2e.local");
  let envText = await fs.readFile(envPath, "utf8");
  const line = `E2E_DELIVERY_PROJECT_ID=${I.deliveryProject}`;
  const pattern = /^E2E_DELIVERY_PROJECT_ID=.*$/m;
  envText = pattern.test(envText)
    ? envText.replace(pattern, line)
    : `${envText.trimEnd()}\n${line}\n`;
  await fs.writeFile(envPath, envText, { mode: 0o600 });

  console.log("E2E materials fixture готов: isolated procurement + paid delivery order");
  console.log(`Delivery:   ${I.deliveryProject}`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("E2E materials seed failed:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

async function seedWorkspaceProcurementFixture() {
  await client.query(`DELETE FROM public.project_material_lists WHERE project_id=$1::uuid`, [I.workspaceProject]);

  await client.query(
    `INSERT INTO public.project_material_lists(id,project_id,created_by,title,status)
     VALUES($1::uuid,$2::uuid,$3::uuid,'E2E Система отопления','requested')`,
    [I.workspaceList, I.workspaceProject, I.customer]
  );
  await insertMaterialItems(I.workspaceList, I.workspaceItemRadiator, I.workspaceItemPipe);

  await client.query(
    `INSERT INTO public.material_procurement_requests(id,list_id,created_by,status,requested_at,closes_at)
     VALUES($1::uuid,$2::uuid,$3::uuid,'open',now(),now()+interval '24 hours')`,
    [I.workspaceRequest, I.workspaceList, I.customer]
  );

  await client.query(
    `INSERT INTO public.material_procurement_quotes(
      id,request_id,supplier_id,status,goods_subtotal_minor,missing_item_count,max_lead_time_days,currency,valid_until
    ) VALUES
      ($1::uuid,$3::uuid,$4::uuid,'submitted',11600000,0,1,'RUB',now()+interval '24 hours'),
      ($2::uuid,$3::uuid,$5::uuid,'submitted',11860000,0,2,'RUB',now()+interval '24 hours')`,
    [I.workspaceQuoteA, I.workspaceQuoteB, I.workspaceRequest, I.supplierA, I.supplierB]
  );

  await insertQuoteItems(I.workspaceQuoteA, I.workspaceItemRadiator, I.workspaceItemPipe, "A");
  await insertQuoteItems(I.workspaceQuoteB, I.workspaceItemRadiator, I.workspaceItemPipe, "B");

  await client.query(
    `UPDATE public.material_procurement_quotes
     SET status=CASE WHEN id=$1::uuid THEN 'selected' ELSE 'submitted' END,updated_at=now()
     WHERE request_id=$2::uuid`,
    [I.workspaceQuoteA, I.workspaceRequest]
  );
  await client.query(
    `UPDATE public.material_procurement_requests SET status='selected',updated_at=now() WHERE id=$1::uuid`,
    [I.workspaceRequest]
  );
  await client.query(
    `UPDATE public.project_material_lists
     SET status='selected',selected_quote_id=$2::uuid,updated_at=now() WHERE id=$1::uuid`,
    [I.workspaceList, I.workspaceQuoteA]
  );
}

async function seedDedicatedDeliveryFixture() {
  const workspace = await client.query(
    `SELECT customer_id,category_id,property_type,region,city,budget_min,budget_max
     FROM public.projects WHERE id=$1::uuid LIMIT 1`,
    [I.workspaceProject]
  );
  const source = workspace.rows[0];
  if (!source) throw new Error("Workspace project not found for delivery fixture");

  await client.query(
    `INSERT INTO public.projects(
      id,customer_id,category_id,title,description,property_type,region,city,address,
      budget_min,budget_max,status,desired_start_date,desired_end_date,updated_at
    ) VALUES(
      $1::uuid,$2::uuid,$3,'E2E Проект доставки материалов',
      'Изолированный E2E проект для проверки Яндекс Доставки без влияния на procurement-тесты.',
      $4,$5,$6,'ул. E2E Объект доставки, 1',$7,$8,'published',current_date+7,current_date+90,now()
    )`,
    [
      I.deliveryProject,
      source.customer_id,
      source.category_id,
      source.property_type,
      source.region,
      source.city,
      source.budget_min,
      source.budget_max,
    ]
  );

  await client.query(
    `INSERT INTO public.project_bids(
      id,project_id,contractor_id,price,duration_days,proposed_start_date,message,
      scope_summary,materials_summary,exclusions,payment_terms,warranty_months,
      price_includes_materials,completeness_score,status,updated_at
    ) VALUES(
      $1::uuid,$2::uuid,$3::uuid,1200000,45,current_date+7,'E2E предложение доставки',
      'Тестовый объём работ.','Материалы закупаются через StroySelect.',
      'Нет дополнительных исключений.','Оплата по этапам.',24,true,100,'accepted',now()
    )`,
    [I.deliveryBid, I.deliveryProject, I.company]
  );

  await client.query(
    `UPDATE public.projects SET
      selected_contractor_id=$2::uuid,selected_bid_id=$3::uuid,status='contractor_selected',
      contractor_selected_at=now(),work_started_at=NULL,completed_at=NULL,updated_at=now()
     WHERE id=$1::uuid`,
    [I.deliveryProject, I.company, I.deliveryBid]
  );

  await client.query(
    `INSERT INTO public.project_contracts(
      id,project_id,source_bid_id,customer_id,contractor_id,status,current_version,updated_at
    ) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,'active',1,now())`,
    [I.deliveryContract, I.deliveryProject, I.deliveryBid, I.customer, I.company]
  );
  await client.query(
    `INSERT INTO public.project_contract_versions(
      contract_id,version_no,title,body,commercial_terms,created_by,
      customer_approved_at,contractor_approved_at,legal_template_version,
      customer_approval_evidence,contractor_approval_evidence
    ) VALUES(
      $1::uuid,1,'E2E договор доставки','E2E договор для изолированного material delivery flow',
      '{}'::jsonb,$2::uuid,now(),now(),'ru-e2e-1.0',
      '{"source":"e2e_delivery"}'::jsonb,'{"source":"e2e_delivery"}'::jsonb
    )`,
    [I.deliveryContract, I.customer]
  );

  await client.query(
    `INSERT INTO public.project_material_lists(id,project_id,created_by,title,status)
     VALUES($1::uuid,$2::uuid,$3::uuid,'E2E Доставка системы отопления','requested')`,
    [I.deliveryList, I.deliveryProject, I.customer]
  );
  await insertMaterialItems(I.deliveryList, I.deliveryItemRadiator, I.deliveryItemPipe);

  await client.query(
    `INSERT INTO public.material_procurement_requests(id,list_id,created_by,status,requested_at,closes_at)
     VALUES($1::uuid,$2::uuid,$3::uuid,'open',now(),now()+interval '24 hours')`,
    [I.deliveryRequest, I.deliveryList, I.customer]
  );
  await client.query(
    `INSERT INTO public.material_procurement_quotes(
      id,request_id,supplier_id,status,goods_subtotal_minor,missing_item_count,max_lead_time_days,currency,valid_until
    ) VALUES($1::uuid,$2::uuid,$3::uuid,'selected',11600000,0,1,'RUB',now()+interval '24 hours')`,
    [I.deliveryQuote, I.deliveryRequest, I.supplierA]
  );
  await insertQuoteItems(I.deliveryQuote, I.deliveryItemRadiator, I.deliveryItemPipe, "A");

  await client.query(
    `UPDATE public.material_procurement_requests SET status='selected',updated_at=now() WHERE id=$1::uuid`,
    [I.deliveryRequest]
  );
  await client.query(
    `UPDATE public.project_material_lists
     SET status='selected',selected_quote_id=$2::uuid,updated_at=now() WHERE id=$1::uuid`,
    [I.deliveryList, I.deliveryQuote]
  );

  await client.query(
    `INSERT INTO public.material_orders(
      id,project_id,list_id,quote_id,supplier_id,created_by,status,goods_subtotal_minor,
      platform_commission_bps,platform_commission_minor,supplier_net_minor,currency,
      supplier_name_snapshot,supplier_legal_name_snapshot,supplier_inn_snapshot
    ) VALUES(
      $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,'awaiting_payment',
      11600000,500,580000,11020000,'RUB','E2E ТеплоСнаб','ООО E2E ТеплоСнаб','057300000101'
    )`,
    [I.deliveryOrder, I.deliveryProject, I.deliveryList, I.deliveryQuote, I.supplierA, I.customer]
  );

  await client.query(
    `INSERT INTO public.material_order_items(
      order_id,quote_item_id,product_id,supplier_sku_snapshot,product_name_snapshot,
      quantity,unit_price_minor,line_total_minor,lead_time_days
    )
    SELECT $1::uuid,qi.id,qi.product_id,qi.supplier_sku_snapshot,qi.product_name_snapshot,
           qi.quantity_requested,qi.unit_price_minor,qi.line_total_minor,qi.lead_time_days
    FROM public.material_procurement_quote_items qi WHERE qi.quote_id=$2::uuid`,
    [I.deliveryOrder, I.deliveryQuote]
  );

  await client.query(
    `INSERT INTO public.material_order_payments(
      id,order_id,payer_id,provider,idempotency_key,status,amount_minor,currency,paid_at,metadata
    ) VALUES(
      $1::uuid,$2::uuid,$3::uuid,'admin',$4::uuid,'succeeded',11600000,'RUB',now(),
      '{"fixture":"yandex_delivery_e2e"}'::jsonb
    )`,
    [I.deliveryPayment, I.deliveryOrder, I.customer, I.deliveryPaymentKey]
  );
  await client.query(`UPDATE public.material_orders SET status='paid',updated_at=now() WHERE id=$1::uuid`, [I.deliveryOrder]);
  await client.query(`UPDATE public.project_material_lists SET status='ordered',updated_at=now() WHERE id=$1::uuid`, [I.deliveryList]);
}

async function insertMaterialItems(listId, radiatorItemId, pipeItemId) {
  await client.query(
    `INSERT INTO public.project_material_items(
      id,list_id,product_id,description,quantity,unit,sort_order
    ) VALUES
      ($1::uuid,$3::uuid,$4::uuid,'E2E Радиатор биметаллический 500 / 10 секций',12,'шт',10),
      ($2::uuid,$3::uuid,$5::uuid,'E2E Труба PPR 25 мм',100,'м',20)`,
    [radiatorItemId, pipeItemId, listId, I.productRadiator, I.productPipe]
  );
}

async function insertQuoteItems(quoteId, radiatorItemId, pipeItemId, supplier) {
  const isA = supplier === "A";
  const rows = isA
    ? [
        [quoteId, radiatorItemId, I.offerARadiator, I.productRadiator, "A-RAD-10", "E2E Радиатор 500x10", 12, 50, 800000, 9600000, 1],
        [quoteId, pipeItemId, I.offerAPipe, I.productPipe, "A-PPR-25", "E2E PPR труба 25", 100, 500, 20000, 2000000, 0],
      ]
    : [
        [quoteId, radiatorItemId, I.offerBRadiator, I.productRadiator, "B-RAD-10", "Радиатор E2E 10 секций", 12, 40, 780000, 9360000, 2],
        [quoteId, pipeItemId, I.offerBPipe, I.productPipe, "B-PPR-25", "Труба полипропилен 25 E2E", 100, 400, 25000, 2500000, 1],
      ];

  for (const row of rows) {
    await client.query(
      `INSERT INTO public.material_procurement_quote_items(
        quote_id,material_item_id,offer_id,product_id,supplier_sku_snapshot,product_name_snapshot,
        quantity_requested,quantity_available,unit_price_minor,line_total_minor,lead_time_days,availability_status
      ) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10,$11,'available')`,
      row
    );
  }
}
