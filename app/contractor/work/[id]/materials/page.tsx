import { ProjectMaterialsPage } from "@/features/materials/components/project-materials-page";
import { MaterialOrderPanel } from "@/features/materials/components/material-order-panel";
import { MaterialDeliveryPanel } from "@/features/materials/components/material-delivery-panel";
type Props={params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
export default async function ContractorMaterialsPage({params,searchParams}:Props){const [{id},query]=await Promise.all([params,searchParams]);return <><ProjectMaterialsPage projectId={id} role="contractor" query={query}/><MaterialOrderPanel projectId={id} role="contractor" query={query}/><MaterialDeliveryPanel projectId={id} role="contractor" query={query}/></>}
