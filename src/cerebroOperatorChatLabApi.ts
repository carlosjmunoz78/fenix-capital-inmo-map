/** Owner-only, preview-only command planner. Does not contain any engine executor. */
import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
import {canPreviewUniversalOperativa} from './cerebroUniversalOperativaLabApi';
export type OperatorIntent='HELP'|'REGISTRY_STATUS'|'JOB001_STATUS'|'STAGING_STATUS'|'FACT_LATEST'|'FACT_DRY_RUN'|'FACT_ATTEST'|'ENGINE_STATUS';
export type OperatorPlan={kind:'planned'|'unsupported'|'denied'|'unavailable';intent?:OperatorIntent;label:string;requiresConfirmation:boolean;message:string;engineId?:string;runtime?:'NOT_VERIFIED';definitionEnvironment?:'SCAFFOLD'};
const reject=(kind:Exclude<OperatorPlan['kind'],'planned'>,message:string):OperatorPlan=>({kind,label:'',requiresConfirmation:false,message});
export async function planOwnerInstructionLab(instruction:string):Promise<OperatorPlan>{
 if(typeof window==='undefined'||!canPreviewUniversalOperativa(window.location))return reject('denied','Solo disponible en la Operativa LAB');
 if(typeof instruction!=='string'||instruction.trim().length<2||instruction.length>240)return reject('unsupported','La orden debe tener entre 2 y 240 caracteres.');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return reject('denied','Sesión de propietario no verificada.');
 try{
  const r=await fetch(new URL('/api/cerebro-universal-preview',window.location.origin),{
   method:'POST',cache:'no-store',
   headers:{authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'},
   body:JSON.stringify({action:'plan_instruction',params:{company_id:'fenix',environment:'LAB',instruction}})
  });
  if(r.status===401||r.status===403)return reject('denied','El Gateway ha denegado la orden.');
  if(r.status!==200)return reject('unavailable','El planificador no ha respondido con un contrato verificable.');
  const v=await r.json() as Record<string,unknown>;
  if(v.transport!=='PREVIEW_ONLY_SERVER_VERIFIED'||v.source!=='DETERMINISTIC_OWNER_LAB_ROUTER'||
     v.executed!==false||v.prod_execution_enabled!==false||v.staging_probed!==false||
     v.durable_audit!==false||v.conversation_persisted!==false)
   return reject('unavailable','Planificación no acreditada; no se ha ejecutado nada.');
  if(v.status!=='PLAN_READY')return reject('unsupported','Esta orden todavía no está disponible. No se ha ejecutado nada. Escribe «ayuda» para ver las órdenes permitidas.');
  const allowed:OperatorIntent[]=['HELP','REGISTRY_STATUS','JOB001_STATUS','STAGING_STATUS','FACT_LATEST','FACT_DRY_RUN','FACT_ATTEST','ENGINE_STATUS'];
  if(!allowed.includes(v.intent as OperatorIntent)||v.company_id!=='fenix'||v.environment!=='LAB'||
    v.production_allowed!==false||v.external_destination_allowed!==false||v.staging_allowed!==false||
    v.additional_cost_eur!==0||typeof v.label!=='string'||v.label.length>135||
    typeof v.requires_confirmation!=='boolean'||(v.intent==='FACT_ATTEST')!==v.requires_confirmation)
   return reject('unavailable','El Gateway ha enviado un plan incompatible; ejecución bloqueada.');
  if(v.intent==='ENGINE_STATUS'&&(
     typeof v.target_engine_id!=='string'||!/^[A-Z][A-Z0-9-]{2,70}$/.test(v.target_engine_id)||
     v.engine_runtime!=='NOT_VERIFIED'||v.engine_definition_environment!=='SCAFFOLD'||
     v.engine_status_source!=='REPOSITORY_SNAPSHOT_NOT_LIVE'
    ))return reject('unavailable','El estado del motor no ha superado el control del registro.');
  return {kind:'planned',intent:v.intent as OperatorIntent,label:v.label,
   requiresConfirmation:v.requires_confirmation,message:'Plan validado por Gateway LAB.',
   ...(v.intent==='ENGINE_STATUS'?{engineId:v.target_engine_id as string,
    runtime:'NOT_VERIFIED' as const,definitionEnvironment:'SCAFFOLD' as const}:{})};
 }catch{return reject('unavailable','No se pudo verificar la planificación con el Gateway.')}
}
