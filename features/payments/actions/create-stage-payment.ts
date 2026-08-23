"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireActiveUser } from "@/lib/auth/require-active-user";
import { requireActiveContract } from "@/lib/projects/require-active-contract";
import { db } from "@/lib/db/pool";
import { createSafeDeal, createSafeDealPayment, isYooKassaConfigured } from "@/lib/payments/yookassa";
import { getAppBaseUrl } from "@/lib/email/send-transactional-email";

export type CreateStagePaymentResult = { success: boolean; message: string; confirmationUrl?: string };

type StageRow = { id: string; title: string; price: string | null; project_title: string; customer_id: string; selected_contractor_id: string | null };
type IntentRow = { id: string; amount: string; provider_deal_id: string | null; provider_payment_id: string | null; status: string; confirmation_url: string | null };

export async function createStagePayment(projectId: string, stageId: string): Promise<CreateStagePaymentResult> {
  const activeUser = await requireActiveUser();
  if (!activeUser.success) return { success: false, message: activeUser.message };
  if (activeUser.profile.role !== "customer") return { success: false, message: "Оплатить этап может только заказчик" };
  if (!isYooKassaConfigured()) return { success: false, message: "Онлайн-оплата ещё не подключена администратором" };

  const contract = await requireActiveContract(projectId);
  if (!contract.success) return { success: false, message: contract.message };

  const stageResult = await db.query<StageRow>(`
    SELECT ps.id,ps.title,ps.price::text,p.title AS project_title,p.customer_id,p.selected_contractor_id
    FROM public.project_stages ps
    JOIN public.projects p ON p.id=ps.project_id
    WHERE ps.id=$1::uuid AND ps.project_id=$2::uuid AND p.is_admin_blocked=false
    LIMIT 1
  `,[stageId,projectId]);
  const stage=stageResult.rows[0];
  if(!stage||stage.customer_id!==activeUser.user.id)return{success:false,message:"Этап не найден"};
  const amount=Number(stage.price??0);
  if(!Number.isFinite(amount)||amount<=0)return{success:false,message:"Для этапа не указана стоимость"};

  const existing=await db.query<IntentRow>(`
    SELECT id,amount::text,provider_deal_id,provider_payment_id,status,confirmation_url
    FROM public.project_payment_intents WHERE project_id=$1::uuid AND stage_id=$2::uuid LIMIT 1
  `,[projectId,stageId]);
  let intent=existing.rows[0];
  if(intent&&["funded","stage_submitted","release_ready","payout_processing","paid"].includes(intent.status)){
    return{success:false,message:"Этот этап уже оплачен или находится в расчёте"};
  }
  if(intent?.confirmation_url&&intent.status==="awaiting_payment")return{success:true,message:"Платёж уже создан",confirmationUrl:intent.confirmation_url};

  const client=await db.connect();
  try{
    await client.query("BEGIN");
    if(!intent){
      const created=await client.query<IntentRow>(`
        INSERT INTO public.project_payment_intents(id,project_id,stage_id,amount,provider,provider_mode,status,metadata)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4,'yookassa','safe_deal','planned',$5::jsonb)
        RETURNING id,amount::text,provider_deal_id,provider_payment_id,status,confirmation_url
      `,[randomUUID(),projectId,stageId,amount,JSON.stringify({contract_id:contract.contractId,contract_version:contract.versionNo})]);
      intent=created.rows[0];
    }
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");console.error("Ошибка создания платёжного намерения:",error);return{success:false,message:"Не удалось подготовить оплату"};}finally{client.release();}
  if(!intent)return{success:false,message:"Не удалось подготовить оплату"};

  try{
    let dealId=intent.provider_deal_id;
    if(!dealId){
      const deal=await createSafeDeal({projectId,stageId,description:`СтройВыбор: ${stage.project_title} / ${stage.title}`});
      dealId=deal.id;
      await db.query(`UPDATE public.project_payment_intents SET provider_deal_id=$2,provider_status=$3,updated_at=now() WHERE id=$1::uuid`,[intent.id,deal.id,deal.status]);
    }
    const feePercent=Math.max(0,Math.min(100,Number(process.env.YOOKASSA_PLATFORM_FEE_PERCENT??0)));
    const payoutAmount=Math.max(0.01,Math.round(amount*(1-feePercent/100)*100)/100);
    const baseUrl=getAppBaseUrl();
    const payment=await createSafeDealPayment({projectId,stageId,paymentIntentId:intent.id,dealId,amount,payoutAmount,returnUrl:`${baseUrl}/customer/work/${projectId}/changes?payment=return`,description:`Оплата этапа «${stage.title}»`});
    const confirmationUrl=payment.confirmation?.confirmation_url;
    if(!confirmationUrl)throw new Error("ЮKassa не вернула ссылку подтверждения платежа");
    await db.query(`
      UPDATE public.project_payment_intents
      SET provider_payment_id=$2,provider_status=$3,confirmation_url=$4,status='awaiting_payment',updated_at=now()
      WHERE id=$1::uuid
    `,[intent.id,payment.id,payment.status,confirmationUrl]);
    revalidatePath(`/customer/work/${projectId}/changes`);
    return{success:true,message:"Платёж создан",confirmationUrl};
  }catch(error){
    console.error("Ошибка ЮKassa при создании оплаты этапа:",error);
    await db.query(`UPDATE public.project_payment_intents SET failure_reason=$2,updated_at=now() WHERE id=$1::uuid`,[intent.id,error instanceof Error?error.message:"Ошибка платёжного провайдера"]);
    return{success:false,message:error instanceof Error?error.message:"Не удалось создать платёж"};
  }
}
