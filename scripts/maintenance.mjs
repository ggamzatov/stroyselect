import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(2);
}

const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 5000 });
try {
  await pool.query("SELECT public.stroyselect_housekeeping()");
  const reminders = await createDueReminders(pool);
  const email = await deliverQueuedEmail(pool);
  const payouts = await releaseAcceptedStagePayouts(pool);
  const stats = await pool.query(`
    SELECT
      (SELECT count(*) FROM public.auth_sessions WHERE revoked_at IS NULL AND expires_at > now()) AS active_sessions,
      (SELECT count(*) FROM public.application_errors WHERE resolved_at IS NULL) AS open_errors,
      (SELECT count(*) FROM public.action_rate_limits) AS rate_limit_rows,
      (SELECT count(*) FROM public.notification_delivery_queue WHERE status IN ('pending','failed')) AS pending_email,
      (SELECT count(*) FROM public.project_payment_intents WHERE status='release_ready') AS pending_payouts
  `);
  console.log("Housekeeping complete", { ...stats.rows[0], reminders, email, payouts });
} finally {
  await pool.end();
}

async function createDueReminders(db) {
  let created = 0;
  const appointments = await db.query(`
    SELECT pa.id,pa.project_id,pa.title,pa.scheduled_start,p.customer_id,cc.owner_id AS contractor_user_id
    FROM public.project_appointments pa
    JOIN public.projects p ON p.id=pa.project_id
    LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id
    WHERE pa.reminder_at IS NOT NULL AND pa.reminder_at<=now() AND pa.reminder_sent_at IS NULL
      AND pa.status IN ('proposed','confirmed')
    ORDER BY pa.reminder_at ASC LIMIT 100
  `);
  for (const row of appointments.rows) {
    for (const userId of [row.customer_id,row.contractor_user_id].filter(Boolean)) {
      const inserted = await insertNotification(db, {
        userId,
        projectId: row.project_id,
        type: "appointment_reminder",
        title: "Напоминание о встрече",
        body: `«${row.title}» запланирована на ${new Date(row.scheduled_start).toLocaleString("ru-RU",{timeZone:"Europe/Moscow"})}`,
        url: userId===row.customer_id?`/customer/work/${row.project_id}/appointments`:`/contractor/work/${row.project_id}/appointments`,
        key: `appointment-reminder:${row.id}:${userId}`,
      });
      if (inserted) created += 1;
    }
    await db.query(`UPDATE public.project_appointments SET reminder_sent_at=now(),updated_at=now() WHERE id=$1::uuid`,[row.id]);
  }

  const stages = await db.query(`
    SELECT ps.id,ps.project_id,ps.title,ps.planned_end_date,ps.status,p.customer_id,cc.owner_id AS contractor_user_id
    FROM public.project_stages ps
    JOIN public.projects p ON p.id=ps.project_id
    LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id
    WHERE ps.planned_end_date IS NOT NULL AND ps.status NOT IN ('completed','cancelled')
      AND ps.planned_end_date<=current_date+1
      AND (ps.due_reminder_sent_at IS NULL OR (ps.planned_end_date<current_date AND ps.overdue_notified_at IS NULL))
    ORDER BY ps.planned_end_date ASC LIMIT 100
  `);
  for (const row of stages.rows) {
    const overdue = new Date(row.planned_end_date).getTime() < Date.now()-24*60*60*1000;
    for (const userId of [row.customer_id,row.contractor_user_id].filter(Boolean)) {
      const inserted=await insertNotification(db,{
        userId,projectId:row.project_id,type:overdue?"stage_overdue":"stage_due_soon",
        title:overdue?"Этап просрочен":"Срок этапа приближается",
        body:`Этап «${row.title}»: плановая дата завершения ${new Date(row.planned_end_date).toLocaleDateString("ru-RU")}.`,
        url:userId===row.customer_id?`/customer/work/${row.project_id}`:`/contractor/work/${row.project_id}`,
        key:`stage-${overdue?"overdue":"due"}:${row.id}:${userId}`,
      });
      if(inserted)created+=1;
    }
    await db.query(`UPDATE public.project_stages SET due_reminder_sent_at=COALESCE(due_reminder_sent_at,now()),overdue_notified_at=CASE WHEN $2 THEN COALESCE(overdue_notified_at,now()) ELSE overdue_notified_at END,updated_at=now() WHERE id=$1::uuid`,[row.id,overdue]);
  }
  return created;
}

async function insertNotification(db,{userId,projectId,type,title,body,url,key}){
  const result=await db.query(`
    INSERT INTO public.notifications(user_id,notification_type,title,body,project_id,url,metadata,deduplication_key)
    VALUES($1::uuid,$2,$3,$4,$5::uuid,$6,'{}'::jsonb,$7)
    ON CONFLICT DO NOTHING RETURNING id
  `,[userId,type,title,body,projectId,url,key]);
  const id=result.rows[0]?.id;
  if(!id)return false;
  const pref=await db.query(`SELECT COALESCE(np.email_enabled,true) AS email_enabled,p.email FROM public.profiles p LEFT JOIN public.notification_preferences np ON np.user_id=p.id WHERE p.id=$1::uuid`,[userId]);
  const settings=pref.rows[0];
  if(settings?.email_enabled&&settings.email){
    await db.query(`INSERT INTO public.notification_delivery_queue(notification_id,channel,recipient) VALUES($1::uuid,'email',$2) ON CONFLICT DO NOTHING`,[id,settings.email]);
  }
  return true;
}

async function deliverQueuedEmail(db){
  const rows=await db.query(`
    SELECT q.id,q.notification_id,q.recipient,q.attempts,n.title,n.body,n.url
    FROM public.notification_delivery_queue q
    JOIN public.notifications n ON n.id=q.notification_id
    WHERE q.status IN ('pending','failed') AND q.next_attempt_at<=now() AND q.attempts<6
    ORDER BY q.created_at ASC LIMIT 50
  `);
  let sent=0,failed=0;
  for(const row of rows.rows){
    await db.query(`UPDATE public.notification_delivery_queue SET status='processing',attempts=attempts+1 WHERE id=$1::uuid`,[row.id]);
    try{
      const result=await sendEmail({to:row.recipient,subject:row.title,body:row.body,url:row.url});
      if(!result.ok)throw new Error(result.error);
      await db.query(`UPDATE public.notification_delivery_queue SET status='sent',sent_at=now(),provider_message_id=$2,last_error=NULL WHERE id=$1::uuid`,[row.id,result.id??null]);
      sent+=1;
    }catch(error){
      const delayMinutes=Math.min(360,Math.max(5,2**Math.min(8,Number(row.attempts)||0)));
      await db.query(`UPDATE public.notification_delivery_queue SET status='failed',last_error=$2,next_attempt_at=now()+($3::text||' minutes')::interval WHERE id=$1::uuid`,[row.id,error instanceof Error?error.message:String(error),delayMinutes]);
      failed+=1;
    }
  }
  return{sent,failed};
}

async function sendEmail({to,subject,body,url}){
  const apiKey=process.env.RESEND_API_KEY?.trim();
  const from=process.env.EMAIL_FROM?.trim();
  const base=(process.env.APP_BASE_URL||"").trim().replace(/\/$/,"");
  if(!apiKey||!from)return{ok:false,error:"Email provider is not configured"};
  const link=url?`${base}${url}`:"";
  const html=`<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>${escapeHtml(subject)}</h2>${body?`<p>${escapeHtml(body)}</p>`:""}${link?`<p><a href="${escapeHtml(link)}">Открыть в СтройВыбор</a></p>`:""}<p style="color:#777;font-size:12px">Это автоматическое уведомление СтройВыбор.</p></div>`;
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[to],subject,html})});
  if(!response.ok)return{ok:false,error:`Resend HTTP ${response.status}: ${await response.text()}`};
  const data=await response.json();return{ok:true,id:data.id};
}

async function releaseAcceptedStagePayouts(db){
  const shopId=process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey=process.env.YOOKASSA_SECRET_KEY?.trim();
  if(!shopId||!secretKey)return{processed:0,skipped:"ЮKassa не настроена"};
  const rows=await db.query(`
    SELECT pi.id,pi.amount::numeric AS amount,pi.provider_deal_id,pi.project_id,pi.stage_id,ps.title,
           cpp.payout_token,p.customer_id,cc.owner_id AS contractor_user_id
    FROM public.project_payment_intents pi
    JOIN public.project_stages ps ON ps.id=pi.stage_id
    JOIN public.projects p ON p.id=pi.project_id
    JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id
    LEFT JOIN public.contractor_payout_profiles cpp ON cpp.contractor_id=cc.id AND cpp.disabled_at IS NULL
    WHERE pi.status='release_ready' AND ps.status='completed' AND pi.provider='yookassa'
    ORDER BY pi.release_ready_at ASC NULLS LAST LIMIT 20
  `);
  let processed=0;
  for(const row of rows.rows){
    if(!row.provider_deal_id||!row.payout_token){
      await db.query(`INSERT INTO public.payment_release_failures(payment_intent_id,reason) SELECT $1::uuid,$2 WHERE NOT EXISTS(SELECT 1 FROM public.payment_release_failures WHERE payment_intent_id=$1::uuid AND resolved_at IS NULL)`,[row.id,!row.provider_deal_id?"У платежа отсутствует идентификатор безопасной сделки ЮKassa":"Подрядчик не настроил способ получения выплаты"]);
      continue;
    }
    try{
      await db.query(`UPDATE public.project_payment_intents SET status='payout_processing',updated_at=now() WHERE id=$1::uuid AND status='release_ready'`,[row.id]);
      const response=await fetch("https://api.yookassa.ru/v3/payouts",{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,"Idempotence-Key":`release-${row.id}`,"Content-Type":"application/json"},body:JSON.stringify({amount:{value:Number(row.amount).toFixed(2),currency:"RUB"},payout_token:row.payout_token,description:`Выплата по этапу «${String(row.title).slice(0,80)}»`,deal:{id:row.provider_deal_id},metadata:{payment_intent_id:row.id,project_id:row.project_id,stage_id:row.stage_id}})});
      const data=await response.json();
      if(!response.ok)throw new Error(data?.description||`ЮKassa HTTP ${response.status}`);
      const next=data.status==="succeeded"?"paid":data.status==="canceled"?"release_ready":"payout_processing";
      await db.query(`UPDATE public.project_payment_intents SET provider_payout_id=$2,provider_status=$3,status=$4,failure_reason=CASE WHEN $4='release_ready' THEN $5 ELSE NULL END,updated_at=now() WHERE id=$1::uuid`,[row.id,data.id,data.status,next,data?.cancellation_details?.reason??null]);
      if(next==="paid"){
        for(const userId of [row.customer_id,row.contractor_user_id].filter(Boolean)){
          await insertNotification(db,{userId,projectId:row.project_id,type:"stage_payment_paid",title:"Выплата по этапу завершена",body:`Расчёт по этапу «${row.title}» завершён.`,url:userId===row.customer_id?`/customer/work/${row.project_id}/changes`:`/contractor/work/${row.project_id}/changes`,key:`stage-payment-paid:${row.id}:${userId}`});
        }
      }
      processed+=1;
    }catch(error){
      await db.query(`UPDATE public.project_payment_intents SET status='release_ready',failure_reason=$2,updated_at=now() WHERE id=$1::uuid`,[row.id,error instanceof Error?error.message:String(error)]);
      await db.query(`INSERT INTO public.payment_release_failures(payment_intent_id,reason) VALUES($1::uuid,$2)`,[row.id,error instanceof Error?error.message:String(error)]);
    }
  }
  return{processed};
}

function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));}
