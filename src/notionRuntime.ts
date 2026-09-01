import { IS_PRODUCTION, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, fetchAppApi, supabase } from './supabase';

function filterContactResponse<T>(data:T|null,mode:'clientes'|'inmobiliarias'):T|null{
  if(!data||typeof data!=='object')return data;
  const raw=data as Record<string,unknown>;
  if(!Array.isArray(raw.items))return data;
  const items=raw.items.filter(item=>{
    if(!item||typeof item!=='object')return false;
    const row=item as Record<string,unknown>;
    const tipo=String(row.tipo||'').toLowerCase();
    const fuente=String(row.fuente||'').toLowerCase();
    return mode==='clientes'
      ? tipo==='cliente'||fuente==='clientes'
      : tipo==='inmobiliaria'||fuente==='inmobiliarias';
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
  const passthrough=['/expedientes','/firmas','/inmobiliarias','/bancos','/tasaciones','/contactos','/tareas','/documentos'];
  if(passthrough.includes(pathname))return fetchAppApi<T>(`${pathname}${url.search}`);
  return{status:503,data:null};
}

export async function fetchNotionRuntime<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
  if(IS_PRODUCTION)return fetchProductionRead<T>(path,init);
  const {data:{session}}=await supabase.auth.getSession();
  const token=session?.access_token;
  if(!token)return{status:401,data:null};
  let res:Response;
  try{
    res=await fetch(`${SUPABASE_URL}/functions/v1/fenix-notion-runtime-test${path}`,{
      ...init,
      headers:{
        'content-type':'application/json',
        ...(init?.headers||{}),
        Authorization:`Bearer ${token}`,
        apikey:SUPABASE_PUBLISHABLE_KEY
      }
    });
  }catch{return{status:0,data:null}}
  let data:unknown=null;
  try{data=await res.json()}catch{data=null}
  return{status:res.status,data:data as T|null};
}