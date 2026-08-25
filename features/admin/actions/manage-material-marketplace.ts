"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";

const modes=new Set(["manual","csv","api","xml","yml","1c","moysklad"]);

export async function createMaterialSupplier(formData:FormData):Promise<never>{
 const {profile}=await requireStaffUser();if(profile.role!=="admin")redirect("/admin/suppliers?error=forbidden");
 const publicName=String(formData.get("publicName")??"").trim();const legalName=String(formData.get("legalName")??"").trim();const inn=String(formData.get("inn")??"").trim();const email=String(formData.get("email")??"").trim();const phone=String(formData.get("phone")??"").trim();const mode=String(formData.get("integrationMode")??"manual");const commissionPercent=Number(formData.get("commissionPercent"));
 if(!publicName||publicName.length>200||!modes.has(mode)||!Number.isFinite(commissionPercent)||commissionPercent<0||commissionPercent>100)redirect("/admin/suppliers?error=supplier");
 try{await db.query(`INSERT INTO public.material_suppliers(public_name,legal_name,inn,status,commission_bps,integration_mode,contact_email,contact_phone) VALUES($1,$2,$3,'active',$4,$5,$6,$7)`,[publicName,legalName||null,inn||null,Math.round(commissionPercent*100),mode,email||null,phone||null])}catch(error){console.error("Ошибка создания поставщика:",error);redirect("/admin/suppliers?error=supplier")}
 revalidatePath("/admin/suppliers");redirect("/admin/suppliers?created=1");
}

export async function updateMaterialSupplier(formData:FormData):Promise<never>{
 const {profile}=await requireStaffUser();if(profile.role!=="admin")redirect("/admin/suppliers?error=forbidden");const supplierId=uuid(formData.get("supplierId"));const status=String(formData.get("status")??"");const mode=String(formData.get("integrationMode")??"");const commissionPercent=Number(formData.get("commissionPercent"));
 if(!supplierId||!["pending","active","suspended","archived"].includes(status)||!modes.has(mode)||!Number.isFinite(commissionPercent)||commissionPercent<0||commissionPercent>100)redirect("/admin/suppliers?error=update");
 await db.query(`UPDATE public.material_suppliers SET status=$2,commission_bps=$3,integration_mode=$4,updated_at=now() WHERE id=$1::uuid`,[supplierId,status,Math.round(commissionPercent*100),mode]);revalidatePath("/admin/suppliers");redirect("/admin/suppliers?saved=1");
}

export async function createMaterialProduct(formData:FormData):Promise<never>{
 const {profile}=await requireStaffUser();if(profile.role!=="admin")redirect("/admin/materials?error=forbidden");const name=String(formData.get("name")??"").trim();const category=String(formData.get("category")??"").trim();const brand=String(formData.get("brand")??"").trim();const model=String(formData.get("model")??"").trim();const unit=String(formData.get("unit")??"шт").trim();
 if(!name||name.length>320||!unit||unit.length>40)redirect("/admin/materials?error=product");const key=normalizeProductKey(name,brand,model,unit);
 try{await db.query(`INSERT INTO public.material_products(normalized_key,canonical_name,category_name,brand,model,unit) VALUES($1,$2,$3,$4,$5,$6)`,[key,name,category||null,brand||null,model||null,unit])}catch(error){console.error("Ошибка создания материала:",error);redirect("/admin/materials?error=product")}
 revalidatePath("/admin/materials");redirect("/admin/materials?product=1");
}

export async function upsertMaterialOffer(formData:FormData):Promise<never>{
 const {profile}=await requireStaffUser();if(profile.role!=="admin")redirect("/admin/materials?error=forbidden");const supplierId=uuid(formData.get("supplierId"));const productId=uuid(formData.get("productId"));const sku=String(formData.get("sku")??"").trim();const rawName=String(formData.get("rawName")??"").trim();const priceRub=Number(formData.get("priceRub"));const stock=Number(formData.get("stock"));const lead=Number(formData.get("leadTimeDays"));
 if(!supplierId||!productId||!sku||!rawName||!Number.isFinite(priceRub)||priceRub<0||!Number.isFinite(stock)||stock<0||!Number.isInteger(lead)||lead<0)redirect("/admin/materials?error=offer");
 await db.query(`INSERT INTO public.material_supplier_offers(supplier_id,product_id,supplier_sku,raw_name,price_minor,stock_qty,lead_time_days,is_active,source,external_updated_at) VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,true,'manual',now()) ON CONFLICT(supplier_id,supplier_sku) DO UPDATE SET product_id=EXCLUDED.product_id,raw_name=EXCLUDED.raw_name,price_minor=EXCLUDED.price_minor,stock_qty=EXCLUDED.stock_qty,lead_time_days=EXCLUDED.lead_time_days,is_active=true,source='manual',external_updated_at=now(),updated_at=now()`,[supplierId,productId,sku,rawName,Math.round(priceRub*100),stock,lead]);
 revalidatePath("/admin/materials");redirect("/admin/materials?offer=1");
}

export async function importSupplierCatalogCsv(formData:FormData):Promise<never>{
 const {profile}=await requireStaffUser();if(profile.role!=="admin")redirect("/admin/suppliers?error=forbidden");const supplierId=uuid(formData.get("supplierId"));const file=formData.get("catalog");if(!supplierId||!(file instanceof File)||file.size===0||file.size>5_000_000)redirect("/admin/suppliers?error=csv");
 const importResult=await db.query<{id:string}>(`INSERT INTO public.material_catalog_imports(supplier_id,source_type,file_name,status) VALUES($1::uuid,'csv',$2,'processing') RETURNING id`,[supplierId,file.name]);const importId=importResult.rows[0].id;
 try{
  const rows=parseCsv(await file.text());if(rows.length<2)throw new Error("CSV пуст");const headers=rows[0].map(v=>v.trim().toLowerCase());const required=["supplier_sku","canonical_name","unit","price","stock"];for(const key of required)if(!headers.includes(key))throw new Error(`Нет колонки ${key}`);
  let imported=0;let rejected=0;for(const row of rows.slice(1)){if(row.every(v=>!v.trim()))continue;const value=(name:string)=>row[headers.indexOf(name)]?.trim()??"";try{const sku=value("supplier_sku"),name=value("canonical_name"),unit=value("unit")||"шт",brand=value("brand"),model=value("model"),category=value("category"),rawName=value("raw_name")||name,price=Number(value("price").replace(",",".")),stock=Number(value("stock").replace(",",".")),lead=Number(value("lead_time_days")||0);if(!sku||!name||!Number.isFinite(price)||price<0||!Number.isFinite(stock)||stock<0||!Number.isInteger(lead)||lead<0)throw new Error("bad row");const key=normalizeProductKey(name,brand,model,unit);const product=await db.query<{id:string}>(`INSERT INTO public.material_products(normalized_key,canonical_name,category_name,brand,model,unit) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(normalized_key) DO UPDATE SET canonical_name=EXCLUDED.canonical_name,category_name=COALESCE(EXCLUDED.category_name,public.material_products.category_name),brand=COALESCE(EXCLUDED.brand,public.material_products.brand),model=COALESCE(EXCLUDED.model,public.material_products.model),unit=EXCLUDED.unit,updated_at=now() RETURNING id`,[key,name,category||null,brand||null,model||null,unit]);await db.query(`INSERT INTO public.material_supplier_offers(supplier_id,product_id,supplier_sku,raw_name,price_minor,stock_qty,lead_time_days,is_active,source,external_updated_at) VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,true,'csv',now()) ON CONFLICT(supplier_id,supplier_sku) DO UPDATE SET product_id=EXCLUDED.product_id,raw_name=EXCLUDED.raw_name,price_minor=EXCLUDED.price_minor,stock_qty=EXCLUDED.stock_qty,lead_time_days=EXCLUDED.lead_time_days,is_active=true,source='csv',external_updated_at=now(),updated_at=now()`,[supplierId,product.rows[0].id,sku,rawName,Math.round(price*100),stock,lead]);imported+=1}catch{rejected+=1}}
  await db.query(`UPDATE public.material_catalog_imports SET status=$2,rows_total=$3,rows_imported=$4,rows_rejected=$5,completed_at=now() WHERE id=$1::uuid`,[importId,rejected?"partial":"completed",imported+rejected,imported,rejected]);
 }catch(error){console.error("Ошибка CSV импорта:",error);await db.query(`UPDATE public.material_catalog_imports SET status='failed',error_summary=$2,completed_at=now() WHERE id=$1::uuid`,[importId,error instanceof Error?error.message:"Ошибка импорта"]);redirect("/admin/suppliers?error=csv")}
 revalidatePath("/admin/suppliers");revalidatePath("/admin/materials");redirect("/admin/suppliers?imported=1");
}

function normalizeProductKey(name:string,brand:string,model:string,unit:string){return[name,brand,model,unit].map(v=>v.trim().toLowerCase().replace(/\s+/g," ")).join("|")}
function uuid(value:FormDataEntryValue|null){const v=String(value??"");return/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)?v:null}
function parseCsv(text:string){const rows:string[][]=[];let row:string[]=[];let cell="";let quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===","&&!quoted){row.push(cell);cell=""}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=""}else cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
