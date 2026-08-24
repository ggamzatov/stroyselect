import { ProjectMaterialsPage } from "@/features/materials/components/project-materials-page";
type Props={params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
export default async function ContractorMaterialsPage({params,searchParams}:Props){const [{id},query]=await Promise.all([params,searchParams]);return <ProjectMaterialsPage projectId={id} role="contractor" query={query}/>}
