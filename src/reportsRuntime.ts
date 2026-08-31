import {IS_PRODUCTION,SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';

export async function fetchReportsRuntime<T=unknown>():Promise<{status:number;data:T|null}>{
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return {status:401,data:null};
 const endpoint=IS_PRODUCTION?'fenix-reports-api/reports':'fenix-reports-api-test/reports';
 try{
  const r=await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`,{headers:{Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY}});
  let data:T|null=null;try{data=await r.json()}catch{data=null}
  return {status:r.status,data};
 }catch{return {status:0,data:null};}
}
