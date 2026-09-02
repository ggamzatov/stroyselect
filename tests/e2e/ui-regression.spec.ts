import {expect,test,type Page} from "@playwright/test";
import {credentials,login,logout,requiredProjectId} from "./helpers/auth";

const customer=credentials("CUSTOMER");
const contractor=credentials("CONTRACTOR");
const workspaceProjectId=requiredProjectId("WORKSPACE");
const adminEmail=process.env.E2E_ADMIN_EMAIL?.trim();
const adminPassword=process.env.E2E_ADMIN_PASSWORD;
const fixtureAvailable=Boolean(customer&&contractor&&workspaceProjectId&&adminEmail&&adminPassword);

async function expectNoHorizontalOverflow(page:Page){const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth-document.documentElement.clientWidth,body:document.body.scrollWidth-document.body.clientWidth}));expect(overflow.page,"Страница не должна иметь горизонтальный overflow").toBeLessThanOrEqual(2);expect(overflow.body,"body не должен выходить за viewport").toBeLessThanOrEqual(2)}
async function expectNoLegacyEnglish(page:Page){const text=await page.locator("body").innerText();for(const phrase of ["Trust Center","Trust profile","Audit Trail","Audit trail","Change orders","Milestones & Budget Control"]){expect(text,`В интерфейсе осталась английская надпись: ${phrase}`).not.toContain(phrase)}}
async function verify(page:Page,path:string){await page.goto(path);await expect(page.locator("body")).toBeVisible();await expectNoHorizontalOverflow(page);await expectNoLegacyEnglish(page)}

test.describe("Brand assets",()=>{
 test("brandbook logo is actually loaded and rendered",async({page,request})=>{
  for(const asset of ["/brand/stroyvybor-logo-v3.png","/brand/stroyvybor-mark-v3.png"]){const response=await request.get(asset);expect(response.status(),`${asset} должен отдаваться приложением`).toBe(200);expect(response.headers()["content-type"]??"").toContain("image/png")}
  await page.goto("/login");
  const visibleLogos=page.locator('img[alt="СтройВыбор"]:visible');
  await expect(visibleLogos.first()).toBeVisible();
  const loaded=await visibleLogos.evaluateAll((images)=>images.map((image)=>{const img=image as HTMLImageElement;return {complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}}));
  expect(loaded.length,"На странице входа должен быть видимый логотип").toBeGreaterThan(0);
  for(const image of loaded){expect(image.complete,"Логотип должен завершить загрузку").toBeTruthy();expect(image.naturalWidth,"Логотип не должен быть битым изображением").toBeGreaterThan(0);expect(image.naturalHeight,"Логотип не должен быть битым изображением").toBeGreaterThan(0)}
 });
});

test.describe("UI regression",()=>{test.describe.configure({mode:"serial"});test.beforeEach(()=>test.skip(!fixtureAvailable,"Run npm run e2e:seed to provision fixtures"));
 test("public pages keep text inside viewport and Russian UI",async({page})=>{await page.context().clearCookies();await verify(page,"/contractors");await verify(page,"/legal/privacy");await verify(page,"/legal/terms")});
 test("customer workspace tabs keep layout and localization",async({page})=>{await login(page,customer!);for(const suffix of ["","/appointments","/contract","/changes","/documents","/issues","/disputes","/materials"]){await verify(page,`/customer/work/${workspaceProjectId}${suffix}`)}});
 test("contractor workspace and company pages keep layout and localization",async({page})=>{await login(page,contractor!);for(const path of [`/contractor/work/${workspaceProjectId}`,`/contractor/work/${workspaceProjectId}/appointments`,`/contractor/work/${workspaceProjectId}/contract`,`/contractor/work/${workspaceProjectId}/changes`,`/contractor/work/${workspaceProjectId}/materials`,`/contractor/projects`,`/contractor/company`,`/contractor/company/trust`]){await verify(page,path)}});
 test("workspace page navigator keeps one item per DOM section",async({page})=>{await login(page,contractor!);await page.goto(`/contractor/work/${workspaceProjectId}/materials`);const labels=["E2E раздел навигатора","E2E вложенный заголовок"] as const;await page.evaluate(([first,second])=>{const main=document.querySelector("main");if(!main)throw new Error("main not found");const section=document.createElement("section");const firstHeading=document.createElement("h2");const secondHeading=document.createElement("h2");firstHeading.textContent=first;secondHeading.textContent=second;section.append(firstHeading,secondHeading);main.prepend(section)},labels);const nav=page.locator("aside nav");await expect(nav.locator("button").filter({hasText:labels[0]})).toHaveCount(1);await expect(nav.locator("button").filter({hasText:labels[1]})).toHaveCount(0)});
 test("admin release and operations pages keep layout and localization",async({page})=>{await login(page,{email:adminEmail!,password:adminPassword!});await verify(page,"/admin/operations");await verify(page,"/admin/release");await logout(page)});
});
