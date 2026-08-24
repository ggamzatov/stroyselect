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

test.describe("UI regression",()=>{test.describe.configure({mode:"serial"});test.beforeEach(()=>test.skip(!fixtureAvailable,"Run npm run e2e:seed to provision fixtures"));
 test("public pages keep text inside viewport and Russian UI",async({page})=>{await page.context().clearCookies();await verify(page,"/contractors");await verify(page,"/legal/privacy");await verify(page,"/legal/terms")});
 test("customer workspace tabs keep layout and localization",async({page})=>{await login(page,customer!);for(const suffix of ["","/appointments","/contract","/changes","/documents","/issues","/disputes","/materials"]){await verify(page,`/customer/work/${workspaceProjectId}${suffix}`)}});
 test("contractor workspace and company pages keep layout and localization",async({page})=>{await login(page,contractor!);for(const path of [`/contractor/work/${workspaceProjectId}`,`/contractor/work/${workspaceProjectId}/appointments`,`/contractor/work/${workspaceProjectId}/contract`,`/contractor/work/${workspaceProjectId}/changes`,`/contractor/work/${workspaceProjectId}/materials`,`/contractor/projects`,`/contractor/company`,`/contractor/company/trust`]){await verify(page,path)}});
 test("admin release and operations pages keep layout and localization",async({page})=>{await login(page,{email:adminEmail!,password:adminPassword!});await verify(page,"/admin/operations");await verify(page,"/admin/release");await logout(page)});
});
