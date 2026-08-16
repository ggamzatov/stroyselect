import { VerifyEmailForm } from "@/features/auth/components/account-email-forms";

type Props={searchParams:Promise<{token?:string;email?:string}>};
export default async function VerifyEmailPage({searchParams}:Props){const {token,email}=await searchParams;return <VerifyEmailForm token={token??""} defaultEmail={email}/>}
