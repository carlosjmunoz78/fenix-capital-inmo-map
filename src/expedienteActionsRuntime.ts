import {SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';

export type ExpedienteBulkItem={expediente_code:string;expected_version:number};
export type ExpedienteBulkResponse={ok?:boolean;status?:number;error?:string;count?:number;items?:Array<{expediente_code:string;version:number;stage?:string}>};

export async function runExpedienteBulkStage(input:{items:ExpedienteBulkItem[];target_stage:string;comment?:string|null}):Promise<{status:number;data:ExpedienteBulkResponse|null}>{
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null};
 try{
  const response=await fetch(`${SUPABASE_URL}/functions/v1/fenix-expediente-actions`,{
   method:'POST',
   headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY},
   body:JSON.stringify({items:input.items,action:'stage',target_stage:input.target_stage,comment:input.comment??null})
  });
  let data:ExpedienteBulkResponse|null=null;try{data=await response.json()}catch{}
  return{status:response.status,data};
 }catch{return{status:0,data:null};}
}
