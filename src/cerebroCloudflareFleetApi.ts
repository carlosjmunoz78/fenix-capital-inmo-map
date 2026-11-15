import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
export type CloudflareWorkerObservation={
 id:string;modified_on:string|null;cron:string[]|null;cron_observed_at:string|null;
 scheduled:boolean|null;active_execution_verified:false;worker_agent_id:null;
};
export type CloudflareFleetSnapshot={
 status:'OK'|'PARTIAL';source:'CLOUDFLARE_REST_ACCOUNT_WORKERS_LIVE_V1';
 account_id:'e39a57e1ac42650ca5a6d5307cf0ac8e';company_id:'fenix';
 environment:'LAB_OBSERVATION';observed_at:string;worker_count:number;
 cron_verified_count:number;with_cron:number;without_cron:number;
 cron_unknown_count:number;active_agent_count:null;active_execution_verified:false;
 read_only:true;controls_enabled:false;workers:CloudflareWorkerObservation[];
 cache_status:'FRESH'|'HOT_60S';
};
export type CloudflareFleetRead={kind:'ready'|'unavailable'|'denied';snapshot:CloudflareFleetSnapshot|null;reason:string};
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const unavailable=(kind:'unavailable'|'denied',reason:string):CloudflareFleetRead=>({kind,reason,snapshot:null});
export function validateCloudflareFleet(raw:unknown):raw is CloudflareFleetSnapshot{
 if(!raw||typeof raw!=='object')return false;
 const x=raw as Partial<CloudflareFleetSnapshot>;
 if(!['OK','PARTIAL'].includes(String(x.status))||x.source!=='CLOUDFLARE_REST_ACCOUNT_WORKERS_LIVE_V1'||
 x.account_id!=='e39a57e1ac42650ca5a6d5307cf0ac8e'||x.company_id!=='fenix'||x.environment!=='LAB_OBSERVATION'||
 x.active_agent_count!==null||x.active_execution_verified!==false||x.read_only!==true||x.controls_enabled!==false||
 !Array.isArray(x.workers)||x.workers.length>300||
 typeof x.observed_at!=='string'||!Number.isFinite(Date.parse(x.observed_at))||
 !Number.isSafeInteger(x.worker_count)||x.worker_count!==x.workers.length||
 !Number.isSafeInteger(x.cron_verified_count)||!Number.isSafeInteger(x.with_cron)||!Number.isSafeInteger(x.without_cron)||
 !Number.isSafeInteger(x.cron_unknown_count)||
 typeof x.with_cron!=='number'||typeof x.without_cron!=='number'||typeof x.cron_unknown_count!=='number'||
 x.with_cron<0||x.without_cron<0||x.cron_unknown_count<0||
 x.cron_verified_count!==x.with_cron+x.without_cron||
 x.worker_count!==x.cron_verified_count+x.cron_unknown_count||
 (x.status==='OK'&&x.cron_unknown_count!==0)||
 !['FRESH','HOT_60S'].includes(String(x.cache_status)))return false;
 const names=new Set<string>();
 for(const s of x.workers){
  if(!s||typeof s.id!=='string'||!(/^[a-z0-9][a-z0-9_-]{2,127}$/).test(s.id)||names.has(s.id)||
   ![true,false,null].includes(s.scheduled)||s.worker_agent_id!==null||s.active_execution_verified!==false||
   (s.scheduled===null?s.cron!==null:
    !Array.isArray(s.cron)||s.cron.length>12||s.cron.some(c=>typeof c!=='string'||c.length>80)||
    s.scheduled!==(s.cron.length>0))||
   (s.modified_on!==null&&(typeof s.modified_on!=='string'||!Number.isFinite(Date.parse(s.modified_on)))))
   return false;
  names.add(s.id);
 }
 return true;
}
export async function readCloudflareFleet({refresh=false,signal}:{refresh?:boolean;signal?:AbortSignal}={}):Promise<CloudflareFleetRead>{
 if(typeof window==='undefined'||!HOST.test(window.location.hostname)||new URLSearchParams(window.location.search).get('visual_lab')!=='cockpit-v3')
  return unavailable('denied','OWNER_PREVIEW_ONLY');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return unavailable('denied','OWNER_SESSION_REQUIRED');
 try{
  const res=await fetch('/api/cerebro-cloudflare-fleet?company_id=fenix'+(refresh?'&refresh=1':''),{
   method:'GET',headers:{authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,
    accept:'application/json'},cache:'no-store',signal});
  if(res.status===401||res.status===403)return unavailable('denied','OWNER_DENIED');
  if(res.status!==200)return unavailable('unavailable','CLOUDFLARE_SOURCE_HTTP_'+res.status);
  const data:unknown=await res.json();
  if(!validateCloudflareFleet(data))return unavailable('unavailable','CLOUDFLARE_SOURCE_CONTRACT_INVALID');
  return{kind:'ready',snapshot:data,reason:''};
 }catch{return unavailable('unavailable','CLOUDFLARE_SOURCE_NETWORK_UNAVAILABLE')}
}
export function answerCloudflareFleet(read:CloudflareFleetRead,worker?:string):string{
 if(read.kind!=='ready'||!read.snapshot)return 'Cloudflare no disponible para lectura actual ('+read.reason+'). No se inventan estados ni cantidades.';
 const s=read.snapshot;
 if(worker){
  const match=s.workers.find(x=>x.id===worker);
  if(!match)return 'No se observa el Worker '+worker+' en el inventario consultado. No significa que sea seguro crearlo o borrarlo.';
  return 'Worker '+worker+' en Cloudflare: existe en inventario; último cambio de script: '+(match.modified_on||'sin fecha')+
   '; crons: '+(match.cron===null?'NO VERIFICADOS':match.cron.length?match.cron.join(', '):'ninguno')+
   '. Ejecuciones y agentes activos: NO VERIFICADOS. Lectura: '+s.observed_at+'. Control de escritura: NO CONECTADO.';
 }
 return 'Cloudflare cuenta Fénix: '+s.worker_count+' Workers registrados; '+s.with_cron+' con cron, '+
 s.without_cron+' sin cron, '+s.cron_unknown_count+' sin verificación de cron. '+
 'Agentes/subagentes ejecutándose: DESCONOCIDO, estos números no son agentes activos. Fuente Cloudflare API leída '+
 new Date(s.observed_at).toLocaleString('es-ES')+'. Los controles de pausa/reanudación de Workers todavía NO están conectados.';
}
