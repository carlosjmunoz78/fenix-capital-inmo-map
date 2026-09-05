import { IS_PRODUCTION, fetchEnvironmentApi } from './supabase';

export async function fetchRegistrosRuntime<T>(path='',init?:RequestInit):Promise<{status:number;data:T|null}>{
  const method=String(init?.method||'GET').toUpperCase();
  if(IS_PRODUCTION){
    if(method!=='GET')return{status:503,data:null};
    const target=path||'/registros-propiedad';
    const normalized=target.startsWith('/registros-propiedad')?target:`/registros-propiedad${target}`;
    return fetchEnvironmentApi<T>('fenix-directory-api',normalized,init);
  }
  return fetchEnvironmentApi<T>('fenix-registros-runtime',path,init,{productionAvailable:false});
}
