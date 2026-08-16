import { ResetPasswordForm } from "@/features/auth/components/account-email-forms";

type Props={searchParams:Promise<{token?:string}>};
export default async function ResetPasswordPage({searchParams}:Props){const {token}=await searchParams;return <ResetPasswordForm token={token??""}/>}
