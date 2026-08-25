import { notFound,redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getProjectContract } from "@/features/workspace/queries/get-project-contract";
import { ContractPrintDocument } from "@/features/workspace/components/contract-print-document";

type Props={params:Promise<{id:string}>};
export default async function ContractorContractPrintPage({params}:Props){const {id}=await params;const {profile}=await getCurrentProfile();if(profile.role!=="contractor")redirect("/dashboard");const contract=await getProjectContract(id);if(!contract||contract.viewerRole!=="contractor")notFound();return <ContractPrintDocument contract={contract}/>}
