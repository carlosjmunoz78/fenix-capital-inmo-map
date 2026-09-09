import { IS_PRODUCTION, fetchAppApi, fetchEnvironmentApi } from './supabase';

function filterContactResponse<T>(data:T|null,mode:'clientes'|'inmobiliarias'|'bancos'):T|null{
  if(!data||typeof data!=='object')return data;
  const raw=data as Record<string,unknown>;
  if(!Array.isArray(raw.items))return data;
  const items=raw.items.filter(item=>{
    if(!item||typeof item!=='object')return false;
    const row=item as Record<string,unknown>;
    const tipo=String(row.tipo||'').toLowerCase();
    const fuente=String(row.fuente||'').toLowerCase();
    if(mode==='clientes')return tipo==='cliente'||fuente==='clientes';
    if(mode==='inmobiliarias')return tipo.includes('inmobiliaria')||fuente.includes('contactos inmobiliaria');
    return tipo.includes('bancario')||fuente.includes('contactos bancarios');
  });
  return {...raw,items} as T;
}

async function fetchProductionRead<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
  const method=String(init?.method||'GET').toUpperCase();
  if(method!=='GET')return{status:503,data:null};
  const url=new URL(path,'https://fenix.local');
  const pathname=url.pathname;
  if(pathname==='/clientes'){
    const r=await fetchAppApi<T>('/contactos');
    return{status:r.status,data:r.status===200?filterContactResponse(r.data,'clientes'):r.data};
  }
  if(pathname==='/contactos-inmobiliaria'){
    const r=await fetchAppApi<T>('/contactos');
    return{status:r.status,data:r.status===200?filterContactResponse(r.data,'inmobiliarias'):r.data};
  }
  if(pathname==='/contactos-bancarios'){
    const r=await fetchAppApi<T>('/contactos');
    return{status:r.status,data:r.status===200?filterContactResponse(r.data,'bancos'):r.data};
  }
  if(/^\/expedientes\/[^/]+$/.test(pathname))return fetchAppApi<T>(pathname);
  if(/^\/documentos\/[^/]+(?:\/(?:view|versions))?$/.test(pathname))return fetchAppApi<T>(`${pathname}${url.search}`);
  const passthrough=['/expedientes','/firmas','/inmobiliarias','/bancos','/tasaciones','/contactos','/tareas','/documentos'];
  if(passthrough.includes(pathname))return fetchAppApi<T>(`${pathname}${url.search}`);
  return{status:503,data:null};
}

export async function fetchNotionRuntime<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
  if(IS_PRODUCTION)return fetchProductionRead<T>(path,init);
  const pathname=new URL(path,'https://fenix.local').pathname;
  if(/^\/expedientes\/[0-9a-fA-F-]{32,36}\/compradores$/.test(pathname)){
    return fetchEnvironmentApi<T>('fenix-expediente-people',pathname,init,{productionAvailable:false});
  }
  return fetchEnvironmentApi<T>('fenix-notion-runtime',path,init,{productionAvailable:false});
}
