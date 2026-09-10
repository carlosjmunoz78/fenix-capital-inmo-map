import {fetchEnvironmentApi} from './supabase';

export async function fetchRegistrosRuntime<T>(path='',init?:RequestInit):Promise<{status:number;data:T|null}>{
  const method=String(init?.method||'GET').toUpperCase();
  if(method!=='GET')return{status:503,data:null};
  const target=path||'/registros-propiedad';
  const normalized=target.startsWith('/registros-propiedad')?target:`/registros-propiedad${target.startsWith('/')?'':'/'}${target}`;
  return fetchEnvironmentApi<T>('fenix-directory-api',normalized,init);
}
