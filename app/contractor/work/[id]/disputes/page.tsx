import { ProjectDisputes } from "@/features/workspace/components/project-disputes";
import { getProjectDisputes } from "@/features/workspace/queries/get-project-disputes";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const data=await getProjectDisputes(id);return <ProjectDisputes data={data}/>}
