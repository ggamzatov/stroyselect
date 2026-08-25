import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const {Pool}=pg;
if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL не указан");

const PROJECT_ID="00000000-0000-4000-8000-000000000302";
const CUSTOMER_ID="00000000-0000-4000-8000-000000000101";
const CONTRACTOR_ID="00000000-0000-4000-8000-000000000102";
const COMPANY_ID="00000000-0000-4000-8000-000000000201";
const PAYOUT_STAGE_ID="00000000-0000-4000-8000-000000002301";
const REFUND_STAGE_ID="00000000-0000-4000-8000-000000002302";
const PAYOUT_INTENT_ID="00000000-0000-4000-8000-000000002303";
const REFUND_INTENT_ID="00000000-0000-4000-8000-000000002304";
const PAYOUT_MINOR=1_000_000;
const REFUND_MINOR=1_200_000;
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
  await client.query(`DELETE FROM public.project_stages WHERE id=ANY($1::uuid[])`,[[PAYOUT_STAGE_ID,REFUND_STAGE_ID]]);

  await insertStage(PAYOUT_STAGE_ID,"E2E finance payout stage",10000,130);
  await insertStage(REFUND_STAGE_ID,"E2E finance refund stage",12000,131);
  await completeStage(PAYOUT_STAGE_ID);
  await completeStage(REFUND_STAGE_ID);

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
      ($1::uuid,$2::uuid,$3::uuid,10000,'RUB','yookassa','safe_deal','awaiting_payment',$4,$5,9000,1000,'pending',$6::jsonb,now()),
      ($7::uuid,$2::uuid,$8::uuid,12000,'RUB','yookassa','safe_deal','awaiting_payment',$9,$10,10800,1200,'pending',$11::jsonb,now())
  `,[PAYOUT_INTENT_ID,PROJECT_ID,PAYOUT_STAGE_ID,`e2e-deal-${PAYOUT_STAGE_ID}`,PAYOUT_PROVIDER_ID,JSON.stringify({e2e:true,customer_id:CUSTOMER_ID}),REFUND_INTENT_ID,REFUND_STAGE_ID,`e2e-deal-${REFUND_STAGE_ID}`,REFUND_PROVIDER_ID,JSON.stringify({e2e:true,customer_id:CUSTOMER_ID})]);

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
  console.log("E2E finance fixture готов: 2 isolated safe-deal intents");
}catch(error){
  await client.query("ROLLBACK");
  console.error("E2E finance seed failed:",error);
  process.exitCode=1;
}finally{client.release();await pool.end();}

async function insertStage(id,title,price,sortOrder){
  await client.query(`
    INSERT INTO public.project_stages(id,project_id,created_by,title,description,price,progress_weight,sort_order,status,planned_start_date,planned_end_date,updated_at)
    VALUES($1::uuid,$2::uuid,$3::uuid,$4,'Изолированный этап для production finance E2E',$5,0,$6,'planned',current_date-5,current_date+5,now())
  `,[id,PROJECT_ID,CONTRACTOR_ID,title,price,sortOrder]);
}

async function completeStage(id){
  let result=await client.query(`UPDATE public.project_stages SET status='in_progress',actual_started_at=now()-interval '3 days',updated_at=now() WHERE id=$1::uuid AND status='planned' RETURNING id`,[id]);
  if(!result.rowCount)throw new Error(`Не удалось начать finance stage ${id}`);
  result=await client.query(`UPDATE public.project_stages SET status='awaiting_review',submitted_for_review_at=now()-interval '1 day',updated_at=now() WHERE id=$1::uuid AND status='in_progress' RETURNING id`,[id]);
  if(!result.rowCount)throw new Error(`Не удалось отправить finance stage ${id} на проверку`);
  result=await client.query(`UPDATE public.project_stages SET status='completed',actual_completed_at=now(),reviewed_at=now(),reviewed_by=$2::uuid,updated_at=now() WHERE id=$1::uuid AND status='awaiting_review' RETURNING id`,[id,CUSTOMER_ID]);
  if(!result.rowCount)throw new Error(`Не удалось принять finance stage ${id}`);
}
