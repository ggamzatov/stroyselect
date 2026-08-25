import { expect, test } from "@playwright/test";

import { login, type E2ECredentials } from "./helpers/auth";

const adminEmail=process.env.E2E_ADMIN_EMAIL?.trim();
const adminPassword=process.env.E2E_ADMIN_PASSWORD;
const admin:E2ECredentials|null=adminEmail&&adminPassword?{email:adminEmail,password:adminPassword}:null;
const payoutProviderId=process.env.E2E_FINANCE_PAYOUT_PROVIDER_ID?.trim();
const refundProviderId=process.env.E2E_FINANCE_REFUND_PROVIDER_ID?.trim();
const fixtureAvailable=Boolean(admin&&payoutProviderId&&refundProviderId);
const payoutStageTitle="Завершённый этап E2E";
const refundStageTitle="E2E принятый этап для платежа";

test.describe("production finance lifecycle",()=>{
  test.describe.configure({mode:"serial"});
  test.beforeEach(()=>test.skip(!fixtureAvailable,"Run npm run e2e:seed to provision finance fixtures"));

  test("authoritative webhook funds safe deals before admin payout or refund",async({page,request})=>{
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
    await expect(payoutArticle).toBeVisible();
    await expect(payoutArticle.getByText("Готово к выплате",{exact:true})).toBeVisible();
    await payoutArticle.getByRole("button",{name:"Выплатить подрядчику"}).click();
    await expect(page).toHaveURL(/\/admin\/finance\?payout=1/);
    payoutArticle=page.locator("article").filter({hasText:payoutStageTitle}).first();
    await expect(payoutArticle.getByText("Выплачено",{exact:true})).toBeVisible();
    await expect(payoutArticle.getByText("Выплата: Успешно",{exact:true})).toBeVisible();

    let refundArticle=page.locator("article").filter({hasText:refundStageTitle}).first();
    await expect(refundArticle).toBeVisible();
    await expect(refundArticle.getByText("Готово к выплате",{exact:true})).toBeVisible();
    await refundArticle.getByLabel("Причина возврата").fill("E2E полный возврат до выплаты подрядчику");
    await refundArticle.getByRole("button",{name:"Полный возврат"}).click();
    await expect(page).toHaveURL(/\/admin\/finance\?refunded=1/);
    refundArticle=page.locator("article").filter({hasText:refundStageTitle}).first();
    await expect(refundArticle.getByText("Возвращено",{exact:true})).toBeVisible();
    await expect(refundArticle.getByText("Возврат: Успешно",{exact:true})).toBeVisible();
  });
});
