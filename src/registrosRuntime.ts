import {IS_PRODUCTION,SUPABASE_URL,supabase} from './supabase';

function prodPath(path:string){
  const m=path.match(/^\/registros-propiedad(?:\/(.+))?$/);
  if(!m)return'/registros-propiedad';
  return m[1]?`/registros-propiedad/${m[1]}`:'/registros-propiedad';
}

export async function fetchRegistrosRuntime<T>(path:string){
  const{data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return{status:401,data:null as T|null};
  if(IS_PRODUCTION){
    const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-directory-api${prodPath(path)}`,{
      headers:{Authorization:`Bearer ${session.access_token}`}
    });
    let data:T|null=null;
    try{data=await r.json() as T}catch{}
    return{status:r.status,data};
  }
  const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-registros-runtime-test${path}`,{
    headers:{Authorization:`Bearer ${session.access_token}`}
  });
  let data:T|null=null;
  try{data=await r.json() as T}catch{}
  return{status:r.status,data};
}
