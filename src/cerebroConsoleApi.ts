import {supabase} from './supabase';
import {cerebroConsoleEndpoint} from './cerebroConsoleAccess';

export type CerebroConsoleHealth={
  status?:string;
  service?:string;
  environment?:string;
  version?:string;
  authenticated_transport?:boolean;
  direct_model_access?:boolean;
  prod_execution_enabled?:boolean;
  live_writes?:boolean;
};

export async function fetchCerebroConsole<T>(path:string):Promise<{status:number;data:T|null}>{
  const endpoint=cerebroConsoleEndpoint(path);
  if(!endpoint)return{status:0,data:null};
  const {data:{session}}=await supabase.auth.getSession();
  const token=session?.access_token;
  if(!token)return{status:401,data:null};
  try{
    const response=await fetch(endpoint,{
      method:'GET',
      headers:{Authorization:`Bearer ${token}`,'content-type':'application/json'},
      cache:'no-store'
    });
    let data:T|null=null;
    try{data=await response.json() as T}catch{data=null}
    return{status:response.status,data};
  }catch{return{status:0,data:null}}
}

export function fetchCerebroConsoleHealth(){
  return fetchCerebroConsole<CerebroConsoleHealth>('health');
}
