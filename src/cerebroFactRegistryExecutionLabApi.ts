/** Owner-only deterministic FACT-001 command; never launches an engine or visits staging. */
import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
import {canPreviewUniversalOperativa} from './cerebroUniversalOperativaLabApi';
export type FactAttestationLab={
 status:'FACT_ATTESTATION_EXECUTED';receipt_id:string;created_at:string;
 company_id:'fenix';environment:'LAB';engine_id:'FACT-001';capability_id:'fact.registry.attest';
 registry_count:179;base_count:177;registry_digest:string;
 executed:true;external_actions_executed:false;prod_execution_enabled:false;additional_cost_eur:0;
 operational_engines_verified:false;replayed:boolean;
 durable_audit?:true;other_engines_executed?:false;staging_probed?:false;
};
export type FactResult={kind:'verified'|'unavailable'|'denied'|'not_recorded';latest:FactAttestationLab|null;message:string};
const unavailable=(kind:'unavailable'|'denied'|'not_recorded',message:string):FactResult=>({kind,latest:null,message});
function valid(x:any):x is FactAttestationLab{
 return x&&typeof x==='object'&&x.status==='FACT_ATTESTATION_EXECUTED'&&
  x.source==='PREPROD_LAB_DETERMINISTIC_RECEIPT'&&x.engine_id==='FACT-001'&&
  x.capability_id==='fact.registry.attest'&&x.version==='0.1.0-lab'&&
  x.company_id==='fenix'&&x.environment==='LAB'&&x.registry_count===179&&
  x.base_count===177&&x.executed===true&&x.external_actions_executed===false&&
  x.prod_execution_enabled===false&&x.additional_cost_eur===0&&
  x.operational_engines_verified===false&&typeof x.replayed==='boolean'&&
  typeof x.created_at==='string'&&Number.isFinite(Date.parse(x.created_at))&&
  typeof x.receipt_id==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(x.receipt_id)&&
  typeof x.registry_digest==='string'&&/^[a-f0-9]{64}$/.test(x.registry_digest);
}
async function call(action:'get_fact_attestation_latest'|'submit_command',idempotencyKey?:string):Promise<FactResult>{
 if(typeof window==='undefined'||!canPreviewUniversalOperativa(window.location))
  return unavailable('denied','Disponible únicamente en Operativa LAB con sesión de propietario');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return unavailable('denied','Sesión de propietario no verificada');
 const execute=action==='submit_command';
 if(execute&&(typeof idempotencyKey!=='string'||!/^lab-fact-attest-[a-z0-9-]{12,48}$/.test(idempotencyKey)))
  return unavailable('denied','Idempotencia no válida');
 try{
  const r=await fetch(new URL('/api/cerebro-universal-preview',window.location.origin),{
   method:'POST',cache:'no-store',
   headers:{authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,
    'content-type':'application/json'},
   body:JSON.stringify({action,params:{company_id:'fenix',environment:'LAB',
    ...(execute?{engine_id:'FACT-001',capability_id:'fact.registry.attest',version:'0.1.0-lab',
      idempotency_key:idempotencyKey,dry_run:false,payload:{},estimated_additional_cost_eur:0,risk:'LOW'}:{})}})
  });
  if(r.status===401||r.status===403)return unavailable('denied','El Gateway ha denegado el acceso');
  if(r.status!==200)return unavailable('unavailable','El ejecutor no confirmó una operación duradera');
  const raw=await r.json();
  if(raw.transport!=='PREVIEW_ONLY_SERVER_VERIFIED'||raw.prod_execution_enabled!==false)
   return unavailable('unavailable','Contrato del Gateway no acreditado');
  if(!execute){
   if(raw.status!=='OK'||raw.source!=='PREPROD_LAB_DETERMINISTIC_RECEIPT'||raw.executed_external_actions!==false)
    return unavailable('unavailable','Fuente de ejecución no acreditada');
   if(raw.latest===null)return unavailable('not_recorded','Sin certificaciones persistidas');
   if(!valid(raw.latest))return unavailable('unavailable','Justificante inválido');
   return {kind:'verified',latest:raw.latest,message:'Última certificación FACT-001 leída del registro privado.'};
  }
  if(!valid(raw)||raw.durable_audit!==true||raw.other_engines_executed!==false||raw.staging_probed!==false)
   return unavailable('unavailable','La ejecución determinista no está acreditada');
  return {kind:'verified',latest:raw,message:raw.replayed?
   'Certificación anterior recuperada: idempotencia demostrada.':
   'Certificación FACT-001 ejecutada y persistida en LAB. No se han ejecutado otros motores.'};
 }catch{return unavailable('unavailable','El Gateway no confirmó la operación')}
}
export const readFactRegistryAttestationLab=()=>call('get_fact_attestation_latest');
export const executeFactRegistryAttestationLab=(key?:string)=>call('submit_command',key||'lab-fact-attest-'+crypto.randomUUID());
