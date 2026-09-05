import { createClient } from '@supabase/supabase-js';

const runtimeEnv=import.meta.env.VITE_FENIX_ENV||'preprod';
export const IS_PRODUCTION=runtimeEnv==='production'||runtimeEnv==='prod';

const PREPROD_SUPABASE_URL='https://hnqlnvakzaywtafeiybt.supabase.co';
const PREPROD_SUPABASE_PUBLISHABLE_KEY='sb_publishable_uvtiidkBBkFRt2K34so27g_JpCbMUZw';

export const SUPABASE_URL=IS_PRODUCTION
  ? String(import.meta.env.VITE_SUPABASE_URL||'')
  : String(import.meta.env.VITE_SUPABASE_URL||PREPROD_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY=IS_PRODUCTION
  ? String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'')
  : String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||PREPROD_SUPABASE_PUBLISHABLE_KEY);

if(IS_PRODUCTION&&(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY)){
  throw new Error('FENIX PROD runtime requires dedicated Supabase URL and publishable key.');
}

const FUNCTION_SUFFIX=IS_PRODUCTION?'':'-test';
const functionName=(base:string)=>`${base}${FUNCTION_SUFFIX}`;
const AUTH_STORAGE_KEY=IS_PRODUCTION?'fenix-prod-auth-v1':'fenix-preprod-auth-v2';
const LEGACY_AUTH_STORAGE_KEY='fenix-preprod-auth';
const authStorage={
  getItem(key:string){
    const current=window.localStorage.getItem(key);
    if(current!==null)return current;
    if(IS_PRODUCTION||key!==AUTH_STORAGE_KEY)return null;
    const legacy=window.localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
    if(!legacy)return null;
    try{
      const parsed=JSON.parse(legacy) as {user?:{email?:string};refresh_token?:string};
      const isQaSession=parsed.user?.email?.endsWith('@fenix.test')||parsed.refresh_token?.startsWith('qa-refresh-');
      return isQaSession?legacy:null;
    }catch{return null;}
  },
  setItem(key:string,value:string){window.localStorage.setItem(key,value)},
  removeItem(key:string){window.localStorage.removeItem(key)}
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: AUTH_STORAGE_KEY,
    storage: authStorage
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
 const actorCode=typeof metadata?.actor_code==='string'
   ?metadata.actor_code
   :!IS_PRODUCTION&&typeof metadata?.fenix_test_actor==='string'
     ?metadata.fenix_test_actor
     :'';
 if(!actorCode)return null;
 const explicitRole=typeof metadata?.role==='string'?metadata.role:'';
 const role=explicitRole||((actorCode==='DIR-TEST'||actorCode==='CARLOS-ADMIN')?'Dirección':actorCode.startsWith('FIN-')?'Financiero':actorCode.startsWith('VIS-')?'Visitador':'Usuario');
 return{actor_code:actorCode,role,context_source:'authenticated-user-metadata'};
}

async function authenticatedEdgeFetch<T>(baseFunctionName:string,path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
  const {data:{session}}=await supabase.auth.getSession();
  const token=session?.access_token;
  if(!token)return{status:401,data:null};
  let response:Response;
  try{
    response=await fetch(`${SUPABASE_URL}/functions/v1/${functionName(baseFunctionName)}${path}`,{
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
