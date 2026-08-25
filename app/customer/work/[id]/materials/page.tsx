import { AdSlot } from "@/features/ads/components/ad-slot";
import { ProjectMaterialsPage } from "@/features/materials/components/project-materials-page";
import { MaterialOrderPanel } from "@/features/materials/components/material-order-panel";
import { MaterialDeliveryPanel } from "@/features/materials/components/material-delivery-panel";

type Props={params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};

export default async function CustomerMaterialsPage({params,searchParams}:Props){
  const [{id},query]=await Promise.all([params,searchParams]);
  return <>
    <ProjectMaterialsPage projectId={id} role="customer" query={query}/>
    <div className="app-container space-y-4 pb-4">
      <AdSlot placement="materials" />
      <AdSlot placement="supplier_boost" />
    </div>
    <MaterialOrderPanel projectId={id} role="customer" query={query}/>
    <MaterialDeliveryPanel projectId={id} role="customer" query={query}/>
  </>;
}
