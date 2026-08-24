import { expect, test } from "@playwright/test";

import { credentials, login, logout, requiredProjectId } from "./helpers/auth";

const customer=credentials("CUSTOMER");
const contractor=credentials("CONTRACTOR");
const workspaceProjectId=requiredProjectId("WORKSPACE");
const fixtureAvailable=Boolean(customer&&contractor&&workspaceProjectId);

test.describe("material delivery",()=>{
  test.describe.configure({mode:"serial"});
  test.beforeEach(()=>test.skip(!fixtureAvailable,"Run npm run e2e:seed to provision material delivery fixture"));

  test("customer books Yandex delivery and contractor sees pickup state",async({page})=>{
    await login(page,customer!);
    await page.goto(`/customer/work/${workspaceProjectId}/materials`);
    await expect(page.getByRole("heading",{name:"Яндекс Доставка",exact:true})).toBeVisible();

    const inDelivery=page.getByRole("heading",{name:"В доставке",exact:true});
    if(!(await inDelivery.isVisible().catch(()=>false))){
      const calculate=page.getByRole("button",{name:"Рассчитать доставку",exact:true});
      if(await calculate.isVisible().catch(()=>false)){
        await page.getByLabel("Широта объекта").fill("42.9850000");
        await page.getByLabel("Долгота объекта").fill("47.5100000");
        await calculate.click();
        await expect(page.getByRole("heading",{name:"Варианты доставки",exact:true})).toBeVisible();
        await expect(page.getByText(/1\s*450\s*₽/).first()).toBeVisible();
      }

      const createClaim=page.getByRole("button",{name:"Создать заявку",exact:true}).first();
      if(await createClaim.isVisible().catch(()=>false)){
        await createClaim.click();
        await expect(page.getByRole("heading",{name:"Заявка создана, но ещё не подтверждена",exact:true})).toBeVisible();
      }

      const accept=page.getByRole("button",{name:"Подтвердить доставку",exact:true});
      if(await accept.isVisible().catch(()=>false)){
        await accept.click();
        await expect(page.getByRole("heading",{name:"Ожидает забора",exact:true})).toBeVisible();
      }

      const refresh=page.getByRole("button",{name:"Обновить статус",exact:true});
      if(await refresh.isVisible().catch(()=>false))await refresh.click();
    }

    await expect(page.getByRole("heading",{name:"В доставке",exact:true})).toBeVisible();
    await expect(page.getByText("Материалы забраны у поставщика и едут на объект.",{exact:true})).toBeVisible();

    await logout(page);
    await login(page,contractor!);
    await page.goto(`/contractor/work/${workspaceProjectId}/materials`);
    await expect(page.getByRole("heading",{name:"Яндекс Доставка",exact:true})).toBeVisible();
    await expect(page.getByRole("heading",{name:"В доставке",exact:true})).toBeVisible();
  });
});
