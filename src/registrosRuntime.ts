import {SUPABASE_URL,supabase} from './supabase';

export async function fetchRegistrosRuntime<T>(path:string){
  const{data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return{status:401,data:null as T|null};
  const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-registros-runtime-test${path}`,{
    headers:{Authorization:`Bearer ${session.access_token}`}
  });
  let data:T|null=null;
  try{data=await r.json() as T}catch{}
  return{status:r.status,data};
}
