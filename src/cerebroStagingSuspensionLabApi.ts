/** Live suspension observation and durable evidence; owner-only Vercel Preview LAB. */
import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
import {canPreviewUniversalOperativa} from './cerebroUniversalOperativaLabApi';

export type StagingLiveSnapshot={
 status:'OK';state:'SUSPENDED_BY_OWNER';observed_at:string;
 known_controls_closed:boolean;global_isolation_verified:false;
 external_hostinger_verified:false;staging_probed:false;executed_external_actions:false;
 gateway_job001:{total:number;paused:number;active:number};
 staging_job001:{expected:15;found:number;paused:number;active:number};
 staging_cron:{expected:8;found:number;paused:number;active:number};
 sql_guard:{expected:4;found:number;protected:number};
 bridge_health:{last_recorded_at:string|null;rows_total:number};
};
export type StagingLiveResult={
 kind:'observed'|'unavailable'|'denied';
 snapshot:StagingLiveSnapshot|null;
 evidence_id?:string;replayed?:boolean;message:string
};
const blocked=(kind:'unavailable'|'denied',message:string):StagingLiveResult=>({kind,snapshot:null,message});
const integer=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0;
function validate(snapshot:unknown):snapshot is StagingLiveSnapshot{
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))return false;
 const r=snapshot as Record<string,any>;
 return r.state==='SUSPENDED_BY_OWNER'&&r.status==='OK'&&r.host==='staging.fenixcapital.es'&&
  r.company_id==='fenix'&&r.environment==='LAB'&&r.source_environment==='PREPROD'&&
  r.global_isolation_verified===false&&r.external_hostinger_verified===false&&
  r.staging_probed===false&&r.executed_external_actions===false&&
  typeof r.known_controls_closed==='boolean'&&
  typeof r.observed_at==='string'&&Number.isFinite(Date.parse(r.observed_at))&&
  r.staging_job001?.expected===15&&['paused','active','found'].every(k=>integer(r.staging_job001[k]))&&
  r.staging_cron?.expected===8&&['paused','active','found'].every(k=>integer(r.staging_cron[k]))&&
  r.sql_guard?.expected===4&&['found','protected'].every(k=>integer(r.sql_guard[k]))&&
  ['total','paused','active'].every(k=>integer(r.gateway_job001?.[k]))&&
  integer(r.bridge_health?.rows_total);
}
async function call(action:'get_staging_suspension_live'|'capture_staging_suspension',idempotency_key?:string):Promise<StagingLiveResult>{
 if(typeof window==='undefined'||!canPreviewUniversalOperativa(window.location))
  return blocked('denied','Acceso disponible solo desde Operativa LAB autenticada');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return blocked('denied','Sesión del propietario no verificada');
 try{
  const response=await fetch(new URL('/api/cerebro-universal-preview',window.location.origin),{
   method:'POST',cache:'no-store',
   headers:{authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,
    'content-type':'application/json'},
   body:JSON.stringify({action,params:{company_id:'fenix',environment:'LAB',
    ...(idempotency_key?{idempotency_key}:{})}})
  });
  if(response.status===401||response.status===403)return blocked('denied','Autorización denegada');
  if(response.status!==200)return blocked('unavailable','La lectura o la evidencia no ha sido confirmada');
  const r=await response.json() as Record<string,any>;
  const capture=action==='capture_staging_suspension';
  if(r.transport!=='PREVIEW_ONLY_SERVER_VERIFIED'||r.prod_execution_enabled!==false||
     r.executed_external_actions!==false||!validate(r.observation)||
     r.status!==(capture?'EVIDENCE_PERSISTED':'OBSERVED')||
     r.source!==(capture?'PREPROD_LAB_DURABLE_EVIDENCE':'LIVE_STAGING_SUSPENSION_PREPROD'))
   return blocked('unavailable','El contrato de evidencia no ha superado la validación');
  if(capture){
   if(typeof r.evidence_id!=='string'||!/^[0-9a-f-]{36}$/i.test(r.evidence_id)||
      typeof r.replayed!=='boolean')return blocked('unavailable','La persistencia de evidencia no está acreditada');
   return {kind:'observed',snapshot:r.observation,evidence_id:r.evidence_id,replayed:r.replayed,
    message:r.replayed?'Evidencia anterior recuperada por idempotencia.':'Evidencia real registrada en PREPROD LAB. Sin acceso a staging.'};
  }
  return {kind:'observed',snapshot:r.observation,message:'Lectura SQL real actualizada; aislamiento global aún no certificado.'};
 }catch{return blocked('unavailable','No se pudo verificar la conexión del Gateway')}
}
export const readStagingSuspensionLab=()=>call('get_staging_suspension_live');
export const captureStagingSuspensionLab=()=>call('capture_staging_suspension','lab-observe-'+crypto.randomUUID());
