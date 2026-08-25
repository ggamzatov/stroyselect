import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const CONTRACTOR_USER_ID = "00000000-0000-4000-8000-000000000102";
const ADMIN_ID = "00000000-0000-4000-8000-000000000103";
const ADVERTISER_ID = "00000000-0000-4000-8000-000000002201";
const CAMPAIGN_ID = "00000000-0000-4000-8000-000000002202";
const CREATIVE_ID = "00000000-0000-4000-8000-000000002203";
const ORDER_ID = "00000000-0000-4000-8000-000000002204";
const PAYMENT_ID = "00000000-0000-4000-8000-000000002205";
const PAYMENT_KEY = "00000000-0000-4000-8000-000000002206";
const TITLE = "E2E Ремонт без сюрпризов";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();
try {
  await client.query("BEGIN");

  // Keep repeated seeded runs idempotent, including the quarterly 3% estimate.
  await client.query(`
    UPDATE public.ad_order_payments p
    SET status='refunded',updated_at=now()
    FROM public.ad_orders o
    JOIN public.ad_advertisers a ON a.id=o.advertiser_id
    WHERE p.order_id=o.id AND a.owner_user_id=$1::uuid AND p.status='succeeded'
  `,[CONTRACTOR_USER_ID]);
  await client.query(`DELETE FROM public.ad_events WHERE order_id IN (SELECT o.id FROM public.ad_orders o JOIN public.ad_advertisers a ON a.id=o.advertiser_id WHERE a.owner_user_id=$1::uuid)`,[CONTRACTOR_USER_ID]);
  await client.query(`DELETE FROM public.ad_moderation_events WHERE order_id IN (SELECT o.id FROM public.ad_orders o JOIN public.ad_advertisers a ON a.id=o.advertiser_id WHERE a.owner_user_id=$1::uuid)`,[CONTRACTOR_USER_ID]);
  await client.query(`DELETE FROM public.ad_erir_reports WHERE order_id IN (SELECT o.id FROM public.ad_orders o JOIN public.ad_advertisers a ON a.id=o.advertiser_id WHERE a.owner_user_id=$1::uuid)`,[CONTRACTOR_USER_ID]);
  await client.query(`DELETE FROM public.ad_order_payments WHERE order_id IN (SELECT o.id FROM public.ad_orders o JOIN public.ad_advertisers a ON a.id=o.advertiser_id WHERE a.owner_user_id=$1::uuid)`,[CONTRACTOR_USER_ID]);
  await client.query(`DELETE FROM public.ad_orders WHERE advertiser_id IN (SELECT id FROM public.ad_advertisers WHERE owner_user_id=$1::uuid)`,[CONTRACTOR_USER_ID]);
  await client.query(`DELETE FROM public.ad_creatives WHERE campaign_id IN (SELECT c.id FROM public.ad_campaigns c JOIN public.ad_advertisers a ON a.id=c.advertiser_id WHERE a.owner_user_id=$1::uuid)`,[CONTRACTOR_USER_ID]);
  await client.query(`DELETE FROM public.ad_campaigns WHERE advertiser_id IN (SELECT id FROM public.ad_advertisers WHERE owner_user_id=$1::uuid)`,[CONTRACTOR_USER_ID]);
  await client.query(`DELETE FROM public.ad_advertisers WHERE owner_user_id=$1::uuid`,[CONTRACTOR_USER_ID]);

  const placementResult = await client.query(`SELECT id,code,name,unit_price_minor,currency FROM public.ad_placements WHERE code='home_premium' AND is_active=true LIMIT 1`);
  const placement = placementResult.rows[0];
  if (!placement) throw new Error("home_premium ad placement not found");

  await client.query(`
    INSERT INTO public.ad_advertisers(id,owner_user_id,display_name,legal_name,inn,ogrn,website_url,contact_email,status,verified_by,verified_at,legal_confirmation_at)
    VALUES($1::uuid,$2::uuid,'E2E Строй Подрядчик','ООО E2E Строй','057300000001','1260500000001','https://example.com/e2e-ad','e2e.contractor@stroyselect.local','verified',$3::uuid,now(),now())
  `,[ADVERTISER_ID,CONTRACTOR_USER_ID,ADMIN_ID]);

  await client.query(`
    INSERT INTO public.ad_campaigns(id,advertiser_id,created_by,name,status)
    VALUES($1::uuid,$2::uuid,$3::uuid,'E2E рекламная кампания','draft')
  `,[CAMPAIGN_ID,ADVERTISER_ID,CONTRACTOR_USER_ID]);

  await client.query(`
    INSERT INTO public.ad_creatives(id,campaign_id,title,body,destination_url,status)
    VALUES($1::uuid,$2::uuid,$3,'Платное E2E-размещение, которое не должно показываться до модерации и ERID.','https://example.com/e2e-ad','draft')
  `,[CREATIVE_ID,CAMPAIGN_ID,TITLE]);

  const durationDays = 7;
  const amountMinor = Number(placement.unit_price_minor) * durationDays;
  const levyMinor = Math.round(amountMinor * 0.03);
  await client.query(`
    INSERT INTO public.ad_orders(
      id,advertiser_id,campaign_id,creative_id,placement_id,created_by,status,duration_days_snapshot,unit_price_minor,amount_minor,currency,
      levy_rate_bps,levy_estimate_minor,placement_code_snapshot,placement_name_snapshot,advertiser_name_snapshot,advertiser_inn_snapshot,
      title_snapshot,body_snapshot,destination_url_snapshot
    ) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,'draft',$7,$8,$9,$10,300,$11,$12,$13,'E2E Строй Подрядчик','057300000001',$14,'Платное E2E-размещение, которое не должно показываться до модерации и ERID.','https://example.com/e2e-ad')
  `,[ORDER_ID,ADVERTISER_ID,CAMPAIGN_ID,CREATIVE_ID,placement.id,CONTRACTOR_USER_ID,durationDays,Number(placement.unit_price_minor),amountMinor,placement.currency,levyMinor,placement.code,placement.name,TITLE]);

  await client.query(`UPDATE public.ad_orders SET status='awaiting_payment' WHERE id=$1::uuid`,[ORDER_ID]);
  await client.query(`
    INSERT INTO public.ad_order_payments(id,order_id,payer_id,provider,idempotency_key,status,amount_minor,currency,metadata)
    VALUES($1::uuid,$2::uuid,$3::uuid,'admin',$4::uuid,'pending',$5,$6,$7::jsonb)
  `,[PAYMENT_ID,ORDER_ID,CONTRACTOR_USER_ID,PAYMENT_KEY,amountMinor,placement.currency,JSON.stringify({e2e:true,payment_scope:"ad_order"})]);
  await client.query(`UPDATE public.ad_order_payments SET status='succeeded',paid_at=now() WHERE id=$1::uuid`,[PAYMENT_ID]);
  await client.query(`UPDATE public.ad_orders SET status='paid' WHERE id=$1::uuid`,[ORDER_ID]);

  await client.query("COMMIT");

  await fs.appendFile(path.join(process.cwd(),".env.e2e.local"),`E2E_AD_ORDER_ID=${ORDER_ID}\nE2E_AD_TITLE=${TITLE}\n`);
  console.log("E2E advertising fixture готов: paid but not published");
  console.log(`Ad order:    ${ORDER_ID}`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("E2E advertising seed failed:",error);
  process.exitCode=1;
} finally {
  client.release();
  await pool.end();
}
