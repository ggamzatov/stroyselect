import "server-only";

type Input={to:string;subject:string;html:string};

export async function sendTransactionalEmail(input:Input){
  const apiKey=process.env.RESEND_API_KEY?.trim();
  const from=process.env.EMAIL_FROM?.trim();
  if(!apiKey||!from){
    if(process.env.NODE_ENV!=="production"){
      console.info("[email:dev]",{to:input.to,subject:input.subject,html:input.html});
      return {success:true as const,development:true as const};
    }
    console.error("Transactional email is not configured");
    return {success:false as const,message:"Email delivery is not configured"};
  }
  try{
    const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[input.to],subject:input.subject,html:input.html}),cache:"no-store"});
    if(!response.ok){console.error("Email provider error",response.status,await response.text());return{success:false as const,message:"Email provider rejected request"}}
    return{success:true as const,development:false as const};
  }catch(error){console.error("Email delivery failed",error);return{success:false as const,message:"Email delivery failed"}}
}

export function getAppBaseUrl(){
  const configured=(process.env.APP_BASE_URL||process.env.NEXT_PUBLIC_APP_URL||"").trim().replace(/\/$/,"");
  if(configured)return configured;
  if(process.env.NODE_ENV!=="production")return "http://localhost:3000";
  throw new Error("APP_BASE_URL is required in production");
}
