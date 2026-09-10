import { createClient } from '@supabase/supabase-js';

export const IS_PRODUCTION=true;

export const SUPABASE_URL=String(import.meta.env.VITE_SUPABASE_URL||'');
export const SUPABASE_PUBLISHABLE_KEY=String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'');

if(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY){
  throw new Error('FENIX PROD runtime requires dedicated Supabase URL and publishable key.');
}

const AUTH_STORAGE_KEY='fenix-prod-auth-v1';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: AUTH_STORAGE_KEY
  }
});

const NAV_LABELS:Record<string,string>={
 '/inicio':'Inicio','/expedientes':'Expedientes','/bancos':'Bancos','/contactos':'Contactos','/inmobiliarias':'Inmobiliarias','/tasaciones':'Tasaciones','/firmas':'Firmas','/documentacion':'Documentación','/financieros':'Financieros','/visitadores':'Visitadores','/agenda':'Agenda','/economia':'Economía','/informes':'Informes','/notarias':'Notarías','/registros-propiedad':'Registros de la Propiedad','/notificaciones':'Avisos','/comunicaciones':'Comunicaciones','/visitas':'Visitas','/buscar':'Buscar'
};
function normalizeNavigation(raw:unknown){
 if(!raw||typeof raw!=='object')return raw;
 const obj=raw as Record<string,unknown>,items=Array.isArray(obj.items)?obj.items:null;
 if(!items)return raw;
 const normalized=items.map((item:any)=>{
  if(typeof item==='string')return{route:item,label:NAV_LABELS[item]??item.replace(/^\//,'')};
  if(item&&typeof item==='object'&&typeof item.route==='string')return{...item,label:typeof item.label==='string'&&item.label.trim()?item.label:(NAV_LABELS[item.route]??item.route.replace(/^\//,''))};
  return null;
 }).filter(Boolean);
 return{...obj,items:normalized};
}
function normalizeSessionContext(raw:unknown){
 if(!raw||typeof raw!=='object')return raw;
 const obj=raw as Record<string,unknown>;
 const nested=obj.context;
 return nested&&typeof nested==='object'?nested:raw;
}
function safeNavigationFallback(){return{items:[{route:'/inicio',label:'Inicio'}],degraded:true};}

function authenticatedContextFallback(session:Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']){
 const metadata=session?.user?.user_metadata as Record<string,unknown>|undefined;
 const actorCode=typeof metadata?.actor_code==='string'?metadata.actor_code:'';
 if(!actorCode)return null;
 const explicitRole=typeof metadata?.role==='string'?metadata.role:'';
 const role=explicitRole||((actorCode==='CARLOS-ADMIN')?'Dirección':actorCode.startsWith('FIN-')?'Financiero':actorCode.startsWith('VIS-')?'Visitador':'Usuario');
 return{actor_code:actorCode,role,context_source:'authenticated-user-metadata'};
}

async function authenticatedEdgeFetch<T>(baseFunctionName:string,path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
  const {data:{session}}=await supabase.auth.getSession();
  const token=session?.access_token;
  if(!token)return{status:401,data:null};
  let response:Response;
  try{
    response=await fetch(`${SUPABASE_URL}/functions/v1/${baseFunctionName}${path}`,{
      ...init,
      headers:{
        'content-type':'application/json',
        ...(init?.headers||{}),
        Authorization:`Bearer ${token}`,
        apikey:SUPABASE_PUBLISHABLE_KEY
      }
    });
  }catch{return{status:0,data:null};}
  let raw:unknown=null;
  try{raw=await response.json();}catch{raw=null;}
  return{status:response.status,data:raw as T|null};
}

export async function fetchEnvironmentApi<T>(baseFunctionName:string,path:string,init?:RequestInit,options?:{productionAvailable?:boolean}):Promise<{status:number;data:T|null}>{
  if(options?.productionAvailable===false)return{status:503,data:null};
  return authenticatedEdgeFetch<T>(baseFunctionName,path,init);
}

export async function fetchAnaApi<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
  return authenticatedEdgeFetch<T>('fenix-ana-api',path,init);
}

export async function fetchAnaKnowledgeApi<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
  return authenticatedEdgeFetch<T>('fenix-ana-knowledge',path,init);
}

export async function fetchAnaCanonicalApi<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
  return authenticatedEdgeFetch<T>('fenix-ana-canonical',path,init);
}

export async function fetchEvidenceApi<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
  return authenticatedEdgeFetch<T>('fenix-evidence-api',path,init);
}

export async function fetchMemoryApi<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
  return authenticatedEdgeFetch<T>('fenix-memory-api',path,init);
}

export async function fetchB2BActions<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
  return authenticatedEdgeFetch<T>('fenix-b2b-actions',path,init);
}

export async function fetchB2BActionsApi<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
  return fetchB2BActions<T>(path,init);
}

export async function fetchDirectionKpisApi<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
  return authenticatedEdgeFetch<T>('fenix-direction-kpis',path,init);
}

export async function fetchAppApi<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
  const result=await authenticatedEdgeFetch<T>('fenix-app-gateway',path,init);
  if(path==='/navigation'&&(result.status===0||result.status>=500))return{status:200,data:safeNavigationFallback() as T};
  if(path==='/session/context'&&(result.status===0||result.status>=500)){
    const {data:{session}}=await supabase.auth.getSession();
    const fallback=authenticatedContextFallback(session);
    if(fallback)return{status:200,data:fallback as T};
  }
  if(path==='/navigation'&&result.status===200&&result.data)return{status:200,data:normalizeNavigation(result.data) as T};
  if(path==='/session/context'&&result.status===200&&result.data)return{status:200,data:normalizeSessionContext(result.data) as T};
  return result;
}
