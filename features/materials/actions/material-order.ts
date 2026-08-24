"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { getMaterialProjectParticipant } from "@/lib/materials/get-material-project-participant";

type SelectedQuoteRow={
  list_id:string;quote_id:string;supplier_id:string;goods_subtotal_minor:string|number;currency:string;
  commission_bps:number;public_name:string;legal_name:string|null;inn:string|null;
};
type OrderRow={id:string;project_id:string;status:string;goods_subtotal_minor:string|number;currency:string};
type PaymentRow={id:string;status:string;confirmation_url:string|null};
type YooPayment={id:string;status:string;confirmation?:{confirmation_url?:string}};
type PgError=Error&{code?:string};

export async function createMaterialOrder(formData:FormData):Promise<never>{
  const projectId=uuid(formData.get("projectId"));
  const listId=uuid(formData.get("listId"));
  const quoteId=uuid(formData.get("quoteId"));
  if(!projectId||!listId||!quoteId)redirect("/dashboard");

  const activeUser=await requireActiveUser();
  if(!activeUser.success)redirect("/login");
  if(activeUser.profile.role!=="customer")redirect("/dashboard");
  const ctx=await getMaterialProjectParticipant(projectId,activeUser.user.id,activeUser.profile.role);
  if(!ctx.success)redirect("/dashboard");
  if(!["contractor_selected","in_progress"].includes(ctx.project.status))redirect(materialUrl(projectId,"order_error=status"));

  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const existing=await client.query<{id:string}>(`SELECT id FROM public.material_orders WHERE list_id=$1::uuid LIMIT 1 FOR UPDATE`,[listId]);
    if(existing.rows[0]){
      await client.query("COMMIT");
      revalidateMaterials(projectId);
      redirect(materialUrl(projectId,"order=existing"));
    }

    const selectedResult=await client.query<SelectedQuoteRow>(`
      SELECT l.id AS list_id,q.id AS quote_id,q.supplier_id,q.goods_subtotal_minor,q.currency,
             s.commission_bps,s.public_name,s.legal_name,s.inn
      FROM public.project_material_lists l
      JOIN public.material_procurement_requests r ON r.list_id=l.id
      JOIN public.material_procurement_quotes q ON q.request_id=r.id AND q.id=l.selected_quote_id
      JOIN public.material_suppliers s ON s.id=q.supplier_id
      WHERE l.id=$1::uuid AND l.project_id=$2::uuid AND q.id=$3::uuid
        AND l.status='selected' AND q.status='selected' AND q.missing_item_count=0
        AND (q.valid_until IS NULL OR q.valid_until>now())
      LIMIT 1
      FOR UPDATE OF l,q
    `,[listId,projectId,quoteId]);
    const selected=selectedResult.rows[0];
    if(!selected){await client.query("ROLLBACK");redirect(materialUrl(projectId,"order_error=quote"));}

    const counts=await client.query<{total_count:string|number;usable_count:string|number}>(`
      SELECT COUNT(*) AS total_count,
             COUNT(*) FILTER (WHERE availability_status='available' AND unit_price_minor IS NOT NULL AND line_total_minor IS NOT NULL) AS usable_count
      FROM public.material_procurement_quote_items
      WHERE quote_id=$1::uuid
    `,[quoteId]);
    const totalCount=Number(counts.rows[0]?.total_count??0);
    const usableCount=Number(counts.rows[0]?.usable_count??0);
    if(totalCount===0||totalCount!==usableCount){await client.query("ROLLBACK");redirect(materialUrl(projectId,"order_error=incomplete"));}

    const subtotal=Number(selected.goods_subtotal_minor);
    const commission=Math.round(subtotal*selected.commission_bps/10000);
    const supplierNet=subtotal-commission;
    const orderResult=await client.query<{id:string}>(`
      INSERT INTO public.material_orders(
        project_id,list_id,quote_id,supplier_id,created_by,status,goods_subtotal_minor,
        platform_commission_bps,platform_commission_minor,supplier_net_minor,currency,
        supplier_name_snapshot,supplier_legal_name_snapshot,supplier_inn_snapshot
      ) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,'awaiting_payment',$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id
    `,[projectId,listId,quoteId,selected.supplier_id,activeUser.user.id,subtotal,selected.commission_bps,commission,supplierNet,selected.currency,selected.public_name,selected.legal_name,selected.inn]);
    const orderId=orderResult.rows[0]?.id;
    if(!orderId)throw new Error("Material order was not created");

    const copied=await client.query<{id:string}>(`
      INSERT INTO public.material_order_items(
        order_id,quote_item_id,product_id,supplier_sku_snapshot,product_name_snapshot,
        quantity,unit_price_minor,line_total_minor,lead_time_days
      )
      SELECT $1::uuid,qi.id,qi.product_id,qi.supplier_sku_snapshot,qi.product_name_snapshot,
             qi.quantity_requested,qi.unit_price_minor,qi.line_total_minor,qi.lead_time_days
      FROM public.material_procurement_quote_items qi
      WHERE qi.quote_id=$2::uuid
        AND qi.availability_status='available'
        AND qi.unit_price_minor IS NOT NULL
        AND qi.line_total_minor IS NOT NULL
      RETURNING id
    `,[orderId,quoteId]);
    if(copied.rows.length!==totalCount)throw new Error("Material order snapshot is incomplete");

    await client.query(`UPDATE public.project_material_lists SET status='ordered',updated_at=now() WHERE id=$1::uuid AND project_id=$2::uuid`,[listId,projectId]);
    await client.query("COMMIT");
  }catch(error){
    if(isRedirect(error))throw error;
    await client.query("ROLLBACK");
    if((error as PgError).code==="23505")redirect(materialUrl(projectId,"order=existing"));
    console.error("Ошибка оформления заказа материалов:",error);
    redirect(materialUrl(projectId,"order_error=create"));
  }finally{client.release();}

  revalidateMaterials(projectId);
  redirect(materialUrl(projectId,"order=created"));
}

export async function createMaterialOrderCheckout(formData:FormData):Promise<never>{
  const orderId=uuid(formData.get("orderId"));
  if(!orderId)redirect("/dashboard");
  const activeUser=await requireActiveUser();
  if(!activeUser.success)redirect("/login");
  if(activeUser.profile.role!=="customer")redirect("/dashboard");

  const orderResult=await db.query<OrderRow>(`
    SELECT mo.id,mo.project_id,mo.status,mo.goods_subtotal_minor,mo.currency
    FROM public.material_orders mo
    JOIN public.projects p ON p.id=mo.project_id
    WHERE mo.id=$1::uuid AND p.customer_id=$2::uuid AND p.is_admin_blocked=false
    LIMIT 1
  `,[orderId,activeUser.user.id]);
  const order=orderResult.rows[0];
  if(!order)redirect("/dashboard");
  const ctx=await getMaterialProjectParticipant(order.project_id,activeUser.user.id,activeUser.profile.role);
  if(!ctx.success)redirect("/dashboard");
  if(!["contractor_selected","in_progress"].includes(ctx.project.status))redirect(materialUrl(order.project_id,"order_error=status"));
  if(order.status==="paid"||order.status==="supplier_confirmed"||order.status==="delivery_pending"||order.status==="in_delivery"||order.status==="delivered"||order.status==="completed")redirect(materialUrl(order.project_id,"payment=confirmed"));
  if(order.status!=="awaiting_payment")redirect(materialUrl(order.project_id,"order_error=payment_state"));

  const existingResult=await db.query<PaymentRow>(`
    SELECT id,status,confirmation_url
    FROM public.material_order_payments
    WHERE order_id=$1::uuid AND status IN ('pending','succeeded')
    ORDER BY created_at DESC LIMIT 1
  `,[orderId]);
  const existing=existingResult.rows[0];
  if(existing?.status==="succeeded")redirect(materialUrl(order.project_id,"payment=confirmed"));
  if(existing?.status==="pending"&&existing.confirmation_url)redirect(existing.confirmation_url);

  const shopId=process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey=process.env.YOOKASSA_SECRET_KEY?.trim();
  if(!shopId||!secretKey)redirect(materialUrl(order.project_id,"order_error=provider"));

  const requestHeaders=await headers();
  const host=requestHeaders.get("x-forwarded-host")??requestHeaders.get("host");
  const proto=requestHeaders.get("x-forwarded-proto")??(process.env.NODE_ENV==="production"?"https":"http");
  const configuredOrigin=process.env.APP_URL?.trim().replace(/\/$/,"");
  const origin=configuredOrigin||(host?`${proto}://${host}`:null);
  if(!origin)redirect(materialUrl(order.project_id,"order_error=origin"));

  const localPaymentId=randomUUID();
  const idempotencyKey=randomUUID();
  const amountMinor=Number(order.goods_subtotal_minor);
  try{
    await db.query(`
      INSERT INTO public.material_order_payments(
        id,order_id,payer_id,provider,idempotency_key,status,amount_minor,currency,metadata
      ) VALUES($1::uuid,$2::uuid,$3::uuid,'yookassa',$4::uuid,'pending',$5,$6,$7::jsonb)
    `,[localPaymentId,orderId,activeUser.user.id,idempotencyKey,amountMinor,order.currency,JSON.stringify({project_id:order.project_id})]);
  }catch(error){
    if((error as PgError).code==="23505"){
      const concurrent=await db.query<PaymentRow>(`SELECT id,status,confirmation_url FROM public.material_order_payments WHERE order_id=$1::uuid AND status IN ('pending','succeeded') ORDER BY created_at DESC LIMIT 1`,[orderId]);
      if(concurrent.rows[0]?.status==="succeeded")redirect(materialUrl(order.project_id,"payment=confirmed"));
      if(concurrent.rows[0]?.confirmation_url)redirect(concurrent.rows[0].confirmation_url);
    }
    console.error("Ошибка создания локального платежа материалов:",error);
    redirect(materialUrl(order.project_id,"order_error=payment"));
  }

  let provider:YooPayment;
  try{
    const response=await fetch("https://api.yookassa.ru/v3/payments",{
      method:"POST",
      headers:{Authorization:`Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,"Idempotence-Key":idempotencyKey,"Content-Type":"application/json"},
      body:JSON.stringify({
        amount:{value:(amountMinor/100).toFixed(2),currency:order.currency},
        capture:true,
        confirmation:{type:"redirect",return_url:`${origin}/customer/work/${order.project_id}/materials?payment=return`},
        description:`StroySelect: оплата заказа материалов ${orderId.slice(0,8)}`,
        metadata:{payment_scope:"material_order",local_material_payment_id:localPaymentId,material_order_id:orderId,project_id:order.project_id},
      }),
      cache:"no-store",
    });
    if(!response.ok)throw new Error(`YooKassa create material payment failed: ${response.status}`);
    provider=await response.json() as YooPayment;
  }catch(error){
    console.error("Ошибка создания платежа заказа материалов:",error);
    await db.query(`UPDATE public.material_order_payments SET status='failed',updated_at=now() WHERE id=$1::uuid AND status='pending'`,[localPaymentId]);
    redirect(materialUrl(order.project_id,"order_error=payment"));
  }

  const confirmationUrl=provider.confirmation?.confirmation_url;
  if(!confirmationUrl){
    await db.query(`UPDATE public.material_order_payments SET provider_payment_id=$2,status='failed',updated_at=now() WHERE id=$1::uuid AND status='pending'`,[localPaymentId,provider.id]);
    redirect(materialUrl(order.project_id,"order_error=confirmation"));
  }
  await db.query(`UPDATE public.material_order_payments SET provider_payment_id=$2,confirmation_url=$3,updated_at=now() WHERE id=$1::uuid AND status='pending'`,[localPaymentId,provider.id,confirmationUrl]);
  redirect(confirmationUrl);
}

function uuid(value:FormDataEntryValue|null){const v=String(value??"").trim();return/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)?v:null;}
function materialUrl(projectId:string,query:string){return`/customer/work/${projectId}/materials?${query}`;}
function revalidateMaterials(projectId:string){revalidatePath(`/customer/work/${projectId}/materials`);revalidatePath(`/contractor/work/${projectId}/materials`);}
function isRedirect(error:unknown){return typeof error==="object"&&error!==null&&"digest" in error&&String((error as {digest?:unknown}).digest).startsWith("NEXT_REDIRECT");}
