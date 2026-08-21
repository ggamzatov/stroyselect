import { getProjectIssues } from "@/features/workspace/queries/get-project-issues";
import { ProjectIssuesBoard } from "@/features/workspace/components/project-issues-board";

type Props={params:Promise<{id:string}>};
export default async function CustomerProjectIssuesPage({params}:Props){const{id}=await params;const data=await getProjectIssues(id);return <ProjectIssuesBoard data={data} backHref={`/customer/work/${id}`}/>;}
