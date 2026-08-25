import { expect, test } from "@playwright/test";

import { login, type E2ECredentials } from "./helpers/auth";

const adminEmail=process.env.E2E_ADMIN_EMAIL?.trim();
const adminPassword=process.env.E2E_ADMIN_PASSWORD;
const admin:E2ECredentials|null=adminEmail&&adminPassword?{email:adminEmail,password:adminPassword}:null;
const payoutProviderId=process.env.E2E_FINANCE_PAYOUT_PROVIDER_ID?.trim();
const refundProviderId=process.env.E2E_FINANCE_REFUND_PROVIDER_ID?.trim();
const payoutResultId=process.env.E2E_FINANCE_PAYOUT_RESULT_ID?.trim();
const refundResultId=process.env.E2E_FINANCE_REFUND_RESULT_ID?.trim();
const fixtureAvailable=Boolean(admin&&payoutProviderId&&refundProviderId&&payoutResultId&&refundResultId);
const payoutStageTitle="Завершённый этап E2E";
const refundStageTitle="E2E принятый этап для платежа";

test.describe("production finance lifecycle",()=>{
  test.describe.configure({mode:"serial"});
  test.beforeEach(()=>test.skip(!fixtureAvailable,"Run npm run e2e:seed to provision finance fixtures"));

  test("authoritative webhooks fund, pay out and refund safe deals asynchronously",async({page,request})=>{
    const fundedPayout=await request.post("/api/payments/yookassa/webhook",{data:{event:"payment.succeeded",object:{id:payoutProviderId}}});
    expect(fundedPayout.status()).toBe(200);
    expect(await fundedPayout.json()).toMatchObject({ok:true,status:"release_ready"});

    const fundedRefund=await request.post("/api/payments/yookassa/webhook",{data:{event:"payment.succeeded",object:{id:refundProviderId}}});
    expect(fundedRefund.status()).toBe(200);
    expect(await fundedRefund.json()).toMatchObject({ok:true,status:"release_ready"});

    await login(page,admin!);
    await page.goto("/admin/finance");
    await expect(page.getByRole("heading",{name:"Платежи и расчёты"})).toBeVisible();

    let payoutArticle=page.locator("article").filter({hasText:payoutStageTitle}).first();
    await expect(payoutArticle.getByText("Готово к выплате",{exact:true})).toBeVisible();
    await payoutArticle.getByRole("button",{name:"Выплатить подрядчику"}).click();
    await expect(page).toHaveURL(/\/admin\/finance\?payout=1/);
    payoutArticle=page.locator("article").filter({hasText:payoutStageTitle}).first();
    await expect(payoutArticle.getByText("Выплата обрабатывается",{exact:true})).toBeVisible();
    await expect(payoutArticle.getByText("Выплата: Обрабатывается",{exact:true})).toBeVisible();

    const payoutDone=await request.post("/api/payments/yookassa/webhook",{data:{event:"payout.succeeded",object:{id:payoutResultId}}});
    expect(payoutDone.status()).toBe(200);
    expect(await payoutDone.json()).toMatchObject({ok:true,status:"paid"});
    await page.reload();
    payoutArticle=page.locator("article").filter({hasText:payoutStageTitle}).first();
    await expect(payoutArticle.getByText("Выплачено",{exact:true})).toBeVisible();
    await expect(payoutArticle.getByText("Выплата: Успешно",{exact:true})).toBeVisible();

    let refundArticle=page.locator("article").filter({hasText:refundStageTitle}).first();
    await expect(refundArticle.getByText("Готово к выплате",{exact:true})).toBeVisible();
    await refundArticle.getByLabel("Причина возврата").fill("E2E полный возврат до выплаты подрядчику");
    await refundArticle.getByRole("button",{name:"Полный возврат"}).click();
    await expect(page).toHaveURL(/\/admin\/finance\?refunded=1/);
    refundArticle=page.locator("article").filter({hasText:refundStageTitle}).first();
    await expect(refundArticle.getByText("Возврат: Ожидает",{exact:true})).toBeVisible();

    const refundDone=await request.post("/api/payments/yookassa/webhook",{data:{event:"refund.succeeded",object:{id:refundResultId}}});
    expect(refundDone.status()).toBe(200);
    expect(await refundDone.json()).toMatchObject({ok:true,status:"refunded"});
    await page.reload();
    refundArticle=page.locator("article").filter({hasText:refundStageTitle}).first();
    await expect(refundArticle.getByText("Возвращено",{exact:true})).toBeVisible();
    await expect(refundArticle.getByText("Возврат: Успешно",{exact:true})).toBeVisible();

    const duplicateRefund=await request.post("/api/payments/yookassa/webhook",{data:{event:"refund.succeeded",object:{id:refundResultId}}});
    expect(duplicateRefund.status()).toBe(200);
    expect(await duplicateRefund.json()).toMatchObject({ok:true,idempotent:true});
  });
});
