"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";

export async function saveMaterialSupplierLocation(formData:FormData):Promise<never>{
  const {profile}=await requireStaffUser();
  const supplierId=uuid(formData.get("supplierId"));
  if(profile.role!=="admin"||!supplierId)redirect("/admin/suppliers?error=forbidden");
  const locationId=uuid(formData.get("locationId"));
  const name=text(formData.get("name"),160);const address=text(formData.get("address"),1000);const region=text(formData.get("region"),160);const city=text(formData.get("city"),160);const phone=text(formData.get("phone"),40);const loadingNotes=text(formData.get("loadingNotes"),2000);
  const latitude=number(formData.get("latitude"));const longitude=number(formData.get("longitude"));const active=String(formData.get("active")??"")==="on";
  if(!name||!address||latitude===null||longitude===null||latitude<-90||latitude>90||longitude<-180||longitude>180)redirect(`/admin/suppliers/${supplierId}/delivery?error=location`);
  if(locationId){
    await db.query(`UPDATE public.material_supplier_locations SET name=$3,address=$4,region=$5,city=$6,latitude=$7,longitude=$8,phone=$9,loading_notes=$10,is_active=$11,updated_at=now() WHERE id=$1::uuid AND supplier_id=$2::uuid`,[locationId,supplierId,name,address,region||null,city||null,latitude,longitude,phone||null,loadingNotes||null,active]);
  }else{
    await db.query(`INSERT INTO public.material_supplier_locations(supplier_id,name,address,region,city,latitude,longitude,phone,loading_notes,is_active) VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[supplierId,name,address,region||null,city||null,latitude,longitude,phone||null,loadingNotes||null,active]);
  }
  revalidatePath(`/admin/suppliers/${supplierId}/delivery`);redirect(`/admin/suppliers/${supplierId}/delivery?saved=1`);
}
function uuid(value:FormDataEntryValue|null){const v=String(value??"").trim();return/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)?v:null}
function text(value:FormDataEntryValue|null,max:number){return String(value??"").trim().slice(0,max)}
function number(value:FormDataEntryValue|null){const raw=String(value??"").trim();if(!raw)return null;const n=Number(raw);return Number.isFinite(n)?n:null}
