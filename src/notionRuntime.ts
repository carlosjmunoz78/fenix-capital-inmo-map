import {IS_PRODUCTION,supabase,SUPABASE_URL} from './supabase';

export async function fetchNotionRuntime<T=unknown>(path:string):Promise<{status:number;data:T|null}>{
  // The legacy Notion runtime is PRE-PROD-only. Never let a PROD browser
  // probe the `*-test` Edge Function namespace: fail closed locally until a
  // dedicated PROD contract is explicitly introduced and validated.
  if(IS_PRODUCTION)return {status:503,data:null};
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return {status:401,data:null};
  const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-notion-runtime-test${path}`,{
    headers:{Authorization:`Bearer ${session.access_token}`}
  });
  let data:T|null=null;
  try{data=await r.json()}catch{data=null}
  return {status:r.status,data};
}
