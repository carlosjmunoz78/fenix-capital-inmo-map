import { IS_PRODUCTION, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from './supabase';

export async function fetchRegistrosRuntime<T>(path='',init?:RequestInit):Promise<{status:number;data:T|null}>{
  const {data:{session}}=await supabase.auth.getSession();
  const token=session?.access_token;
  if(!token)return{status:401,data:null};
  const method=String(init?.method||'GET').toUpperCase();
  if(IS_PRODUCTION){
    if(method!=='GET')return{status:503,data:null};
    const target=path||'/registros-propiedad';
    const normalized=target.startsWith('/registros-propiedad')?target:`/registros-propiedad${target}`;
    let res:Response;
    try{
      res=await fetch(`${SUPABASE_URL}/functions/v1/fenix-directory-api${normalized}`,{
        ...init,
        headers:{'content-type':'application/json',...(init?.headers||{}),Authorization:`Bearer ${token}`,apikey:SUPABASE_PUBLISHABLE_KEY}
      });
    }catch{return{status:0,data:null}}
    let data:unknown=null;try{data=await res.json()}catch{data=null}
    return{status:res.status,data:data as T|null};
  }
  let res:Response;
  try{
    res=await fetch(`${SUPABASE_URL}/functions/v1/fenix-registros-runtime-test${path}`,{
      ...init,
      headers:{'content-type':'application/json',...(init?.headers||{}),Authorization:`Bearer ${token}`,apikey:SUPABASE_PUBLISHABLE_KEY}
    });
  }catch{return{status:0,data:null}}
  let data:unknown=null;try{data=await res.json()}catch{data=null}
  return{status:res.status,data:data as T|null};
}