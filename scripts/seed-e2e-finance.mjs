import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const {Pool}=pg;
if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL не указан");

const WORKSPACE_PROJECT_ID="00000000-0000-4000-8000-000000000302";
const COMPLETED_PROJECT_ID="00000000-0000-4000-8000-000000000303";
const COMPANY_ID="00000000-0000-4000-8000-000000000201";
const PAYOUT_STAGE_ID="00000000-0000-4000-8000-000000000502";
const REFUND_STAGE_ID="00000000-0000-4000-8000-000000000503";
const PAYOUT_INTENT_ID="00000000-0000-4000-8000-000000002303";
const REFUND_INTENT_ID="00000000-0000-4000-8000-000000002304";
const PAYOUT_MINOR=85_000_000;
const REFUND_MINOR=1_500_000;
const PAYOUT_PROVIDER_ID=`e2e-project-payment-${PAYOUT_MINOR}-${PAYOUT_INTENT_ID}`;
const REFUND_PROVIDER_ID=`e2e-project-payment-${REFUND_MINOR}-${REFUND_INTENT_ID}`;

const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1});
const client=await pool.connect();
try{
  await client.query("BEGIN");
  await client.query(`DELETE FROM public.finance_receipts WHERE project_payment_intent_id=ANY($1::uuid[])`,[[PAYOUT_INTENT_ID,REFUND_INTENT_ID]]);
  await client.query(`DELETE FROM public.finance_refunds WHERE project_payment_intent_id=ANY($1::uuid[])`,[[PAYOUT_INTENT_ID,REFUND_INTENT_ID]]);
  await client.query(`DELETE FROM public.finance_payouts WHERE project_payment_intent_id=ANY($1::uuid[])`,[[PAYOUT_INTENT_ID,REFUND_INTENT_ID]]);
  await client.query(`DELETE FROM public.payment_release_failures WHERE payment_intent_id=ANY($1::uuid[])`,[[PAYOUT_INTENT_ID,REFUND_INTENT_ID]]);
  await client.query(`DELETE FROM public.project_payment_intents WHERE id=ANY($1::uuid[])`,[[PAYOUT_INTENT_ID,REFUND_INTENT_ID]]);

  const stages=await client.query<{id:string;project_id:string;status:string;price:string|number}>(`
    SELECT id,project_id,status::text,price
    FROM public.project_stages
    WHERE id=ANY($1::uuid[])
    ORDER BY id
  `,[[PAYOUT_STAGE_ID,REFUND_STAGE_ID]]);
  if(stages.rows.length!==2||stages.rows.some(stage=>stage.status!=="completed"))throw new Error("Finance fixture requires two already accepted E2E stages");

  await client.query(`
    INSERT INTO public.contractor_payout_profiles(contractor_id,provider,payout_token,destination_label,verified_at,disabled_at,updated_at)
    VALUES($1::uuid,'yookassa',$2,'E2E безопасный payout token',now(),NULL,now())
    ON CONFLICT(contractor_id) DO UPDATE SET provider='yookassa',payout_token=EXCLUDED.payout_token,destination_label=EXCLUDED.destination_label,verified_at=now(),disabled_at=NULL,updated_at=now()
  `,[COMPANY_ID,"e2e-safe-payout-token"]);

  await client.query(`
    INSERT INTO public.project_payment_intents(
      id,project_id,stage_id,amount,currency,provider,provider_mode,status,provider_deal_id,provider_payment_id,
      payout_amount,platform_fee_amount,provider_status,metadata,updated_at
    ) VALUES
      ($1::uuid,$2::uuid,$3::uuid,850000,'RUB','yookassa','safe_deal','awaiting_payment',$4,$5,765000,85000,'pending','{"e2e":true}'::jsonb,now()),
      ($6::uuid,$7::uuid,$8::uuid,15000,'RUB','yookassa','safe_deal','awaiting_payment',$9,$10,13500,1500,'pending','{"e2e":true}'::jsonb,now())
  `,[PAYOUT_INTENT_ID,COMPLETED_PROJECT_ID,PAYOUT_STAGE_ID,`e2e-deal-${PAYOUT_STAGE_ID}`,PAYOUT_PROVIDER_ID,REFUND_INTENT_ID,WORKSPACE_PROJECT_ID,REFUND_STAGE_ID,`e2e-deal-${REFUND_STAGE_ID}`,REFUND_PROVIDER_ID]);

  await client.query("COMMIT");
  const envPath=path.join(process.cwd(),".env.e2e.local");
  let envText=await fs.readFile(envPath,"utf8");
  const additions={
    E2E_FINANCE_PAYOUT_INTENT_ID:PAYOUT_INTENT_ID,
    E2E_FINANCE_REFUND_INTENT_ID:REFUND_INTENT_ID,
    E2E_FINANCE_PAYOUT_PROVIDER_ID:PAYOUT_PROVIDER_ID,
    E2E_FINANCE_REFUND_PROVIDER_ID:REFUND_PROVIDER_ID,
  };
  for(const [key,value] of Object.entries(additions)){
    const line=`${key}=${value}`;const pattern=new RegExp(`^${key}=.*$`,`m`);
    envText=pattern.test(envText)?envText.replace(pattern,line):`${envText.trimEnd()}\n${line}\n`;
  }
  await fs.writeFile(envPath,envText,{mode:0o600});
  console.log("E2E finance fixture готов: accepted stages + 2 isolated safe-deal intents");
}catch(error){
  await client.query("ROLLBACK");
  console.error("E2E finance seed failed:",error);
  process.exitCode=1;
}finally{client.release();await pool.end();}
