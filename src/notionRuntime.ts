import {supabase,SUPABASE_URL} from './supabase';

export async function fetchNotionRuntime<T=unknown>(path:string):Promise<{status:number;data:T|null}>{
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return {status:401,data:null};
  const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-notion-runtime-test${path}`,{
    headers:{Authorization:`Bearer ${session.access_token}`}
  });
  let data:T|null=null;
  try{data=await r.json()}catch{data=null}
  return {status:r.status,data};
}
