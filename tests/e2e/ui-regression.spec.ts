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
 test("brandbook logo uses the supplied vector artwork",async({page,request})=>{
  const vectorResponse=await request.get("/brand/stroyvybor-logo.svg");expect(vectorResponse.status(),"SVG-логотип должен отдаваться приложением").toBe(200);expect(vectorResponse.headers()["content-type"]??"").toContain("image/svg+xml");expect(await vectorResponse.text()).toContain('viewBox="0 0 645 92"');
  const markResponse=await request.get("/brand/stroyvybor-mark-hq.png");expect(markResponse.status(),"Растровая версия mark должна отдаваться приложением").toBe(200);expect(markResponse.headers()["content-type"]??"").toContain("image/png");
  await page.goto("/login");
  const visibleLogos=page.locator('img[data-brand-logo="horizontal"][data-brand-quality="vector"]:visible');
  await expect(visibleLogos.first()).toBeVisible();
  const rendered=await visibleLogos.first().evaluate((image)=>{const img=image as HTMLImageElement;const canvas=document.createElement("canvas");canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const context=canvas.getContext("2d");if(!context)return {complete:false,naturalWidth:0,naturalHeight:0,opaquePixels:0,totalPixels:0};context.drawImage(img,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;let opaquePixels=0;for(let index=3;index<pixels.length;index+=4){if(pixels[index]>32)opaquePixels+=1}return {complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,opaquePixels,totalPixels:canvas.width*canvas.height}});
  expect(rendered.complete,"Логотип должен завершить загрузку").toBeTruthy();expect(rendered.naturalWidth,"SVG должен иметь видимые intrinsic-габариты").toBeGreaterThan(0);expect(rendered.naturalHeight,"SVG должен иметь видимые intrinsic-габариты").toBeGreaterThan(0);expect(rendered.opaquePixels,"Логотип должен содержать реально видимые пиксели").toBeGreaterThan(rendered.totalPixels*0.05);
 });
});

test.describe("UI regression",()=>{test.describe.configure({mode:"serial"});test.beforeEach(()=>test.skip(!fixtureAvailable,"Run npm run e2e:seed to provision fixtures"));
 test("public pages keep text inside viewport and Russian UI",async({page})=>{await page.context().clearCookies();await verify(page,"/contractors");await verify(page,"/legal/privacy");await verify(page,"/legal/terms")});
 test("customer workspace tabs keep layout and localization",async({page})=>{await login(page,customer!);for(const suffix of ["","/appointments","/chat","/contract","/changes","/documents","/issues","/disputes","/materials"]){await verify(page,`/customer/work/${workspaceProjectId}${suffix}`)}});
 test("contractor workspace and company pages keep layout and localization",async({page})=>{await login(page,contractor!);for(const path of [`/contractor/work/${workspaceProjectId}`,`/contractor/work/${workspaceProjectId}/appointments`,`/contractor/work/${workspaceProjectId}/chat`,`/contractor/work/${workspaceProjectId}/contract`,`/contractor/work/${workspaceProjectId}/changes`,`/contractor/work/${workspaceProjectId}/materials`,`/contractor/projects`,`/contractor/company`,`/contractor/company/trust`]){await verify(page,path)}});
 test("workspace keeps one conceptual project navigation",async({page})=>{await login(page,contractor!);await page.goto(`/contractor/work/${workspaceProjectId}`);const nav=page.locator('nav[aria-label="Разделы рабочего пространства"]');await expect(nav).toContainText("Обзор");await expect(nav).toContainText("Работа");await expect(nav).toContainText("Общение");await expect(nav).toContainText("Документы");await expect(nav).toContainText("Ещё");await expect(page.getByText("На странице",{exact:true})).toHaveCount(0);await page.setViewportSize({width:390,height:844});await expect(nav.locator('select[aria-label="Раздел рабочего пространства"]')).toBeVisible();});
 test("admin release and operations pages keep layout and localization",async({page})=>{await login(page,{email:adminEmail!,password:adminPassword!});await verify(page,"/admin/operations");await verify(page,"/admin/release");await logout(page)});
});
