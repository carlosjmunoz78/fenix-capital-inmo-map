import {IS_PRODUCTION,SUPABASE_URL,supabase} from './supabase';

function prodPath(path:string){
 const m=path.match(/^\/notarias(?:\/(.+))?$/);
 if(!m)return'/notarias';
 return m[1]?`/notarias/${m[1]}`:'/notarias';
}

export async function fetchNotariasRuntime<T>(path:string){
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null as T|null};
 if(IS_PRODUCTION){
  const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-directory-api${prodPath(path)}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
  let data:T|null=null;
  try{data=await r.json() as T}catch{}
  return{status:r.status,data};
 }
 const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-notarias-runtime-test${path}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
 let data:T|null=null;
 try{data=await r.json() as T}catch{}
 return{status:r.status,data};
}
