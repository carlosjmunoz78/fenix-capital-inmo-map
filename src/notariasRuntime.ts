import { IS_PRODUCTION, fetchEnvironmentApi } from './supabase';

export async function fetchNotariasRuntime<T>(path='',init?:RequestInit):Promise<{status:number;data:T|null}>{
  const method=String(init?.method||'GET').toUpperCase();
  if(IS_PRODUCTION){
    if(method!=='GET')return{status:503,data:null};
    const target=path||'/notarias';
    const normalized=target.startsWith('/notarias')?target:`/notarias${target}`;
    return fetchEnvironmentApi<T>('fenix-directory-api',normalized,init);
  }
  return fetchEnvironmentApi<T>('fenix-notarias-runtime',path,init,{productionAvailable:false});
}
