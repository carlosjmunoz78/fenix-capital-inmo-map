import {fetchEnvironmentApi} from './supabase';

export async function fetchNotariasRuntime<T>(path='',init?:RequestInit):Promise<{status:number;data:T|null}>{
  const method=String(init?.method||'GET').toUpperCase();
  if(method!=='GET')return{status:503,data:null};
  const target=path||'/notarias';
  const normalized=target.startsWith('/notarias')?target:`/notarias${target.startsWith('/')?'':'/'}${target}`;
  return fetchEnvironmentApi<T>('fenix-directory-api',normalized,init);
}
