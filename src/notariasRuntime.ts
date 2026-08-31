import {IS_PRODUCTION,SUPABASE_URL,supabase} from './supabase';
export async function fetchNotariasRuntime<T>(path:string){
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null as T|null};
 const target=IS_PRODUCTION
  ?`${SUPABASE_URL}/functions/v1/fenix-directory-api/notarias`
  :`${SUPABASE_URL}/functions/v1/fenix-notarias-runtime-test${path}`;
 const r=await fetch(target,{headers:{Authorization:`Bearer ${session.access_token}`}});
 let data:T|null=null;
 try{data=await r.json() as T}catch{}
 return{status:r.status,data};
}
