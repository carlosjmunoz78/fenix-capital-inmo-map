import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ENGINE_REGISTRY=path.resolve(HERE,'../registry/engine-registry.seed.json');

export const CANONICAL_HUMAN_REQUIRED=Object.freeze([
  'LEGAL_REQUIRED',
  'SIGNATURE_REQUIRED',
  'LOW_CONFIDENCE',
  'HIGH_RISK',
  'POLICY_CONFLICT',
  'SECURITY_INCIDENT',
  'MONEY_LIMIT',
  'CUSTOMER_HUMAN_REQUEST'
]);
const CANONICAL_SET=new Set(CANONICAL_HUMAN_REQUIRED);
const SAFE_SOURCE_RE=/^[A-Z0-9_.:/-]{1,160}$/i;
const SECRET_HINT_RE=/(password|passwd|secret|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization|bearer)\s*[:=]/i;

function clone(v){return JSON.parse(JSON.stringify(v??{}));}
function req(v,label,max=1000){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const x=v.trim();if(x.length>max)throw new Error(`${label} too long`);return x;}
function safeText(v,label,max=1200){const x=req(v,label,max).replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim();if(SECRET_HINT_RE.test(x))throw new Error(`${label} contains secret-like material`);return x;}
function optText(v,label,max=1200){if(v==null||v==='')return null;return safeText(v,label,max);}
function iso(v,label){const x=req(v,label,100);const t=Date.parse(x);if(Number.isNaN(t))throw new Error(`${label} invalid`);return new Date(t).toISOString();}
function finiteNonNegative(v,label,def=0){if(v==null||v==='')return def;const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error(`${label} invalid`);return n;}
function readJson(file,label){let v;try{v=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){throw new Error(`${label} unreadable:${e.message}`);}return v;}
function hash(value){return crypto.createHash('sha256').update(String(value)).digest('hex');}
function bool(v){return v===true;}
function freezeSafety(v){return Object.freeze({...v,prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_eur:0});}
function safeList(v,label,{maxItems=20,maxLen=300}={}){if(v==null)return [];if(!Array.isArray(v))throw new Error(`${label} must be array`);if(v.length>maxItems)throw new Error(`${label} too many items`);return v.map((x,i)=>safeText(x,`${label}[${i}]`,maxLen));}

export function initialHumanExceptionSupervisorState(now=new Date().toISOString()){
  return {
    schema_version:'1.0.0',state_type:'CEREBRO_HUMAN_EXCEPTION_SUPERVISOR_STATE',company_id:'fenix',engine_id:'HEX-001',environment:'PROD_CONTROL_PLANE',version:'1.0.0',
    updated_at:now,waiting_human:{},processed_event_ids:[],stats:{accepted_total:0,deduped_total:0,rejected_total:0},human_exception_policy:[...CANONICAL_HUMAN_REQUIRED],
    prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_eur:0
  };
}

export function validateSupervisorState(state){
  if(!state||typeof state!=='object'||Array.isArray(state))throw new Error('supervisor state invalid');
  if(state.state_type!=='CEREBRO_HUMAN_EXCEPTION_SUPERVISOR_STATE'||state.company_id!=='fenix'||state.engine_id!=='HEX-001')throw new Error('supervisor state identity drift');
  if(state.environment!=='PROD_CONTROL_PLANE')throw new Error('supervisor state environment drift');
  if(state.prod_authorized!==false||state.prod_write_authorized!==false||state.trading_access!==false||state.multicompany_continuation!==false||Number(state.additional_cost_eur)!==0)throw new Error('supervisor state authority/cost drift');
  const policy=Array.isArray(state.human_exception_policy)?state.human_exception_policy:[];
  if(policy.length!==CANONICAL_HUMAN_REQUIRED.length||CANONICAL_HUMAN_REQUIRED.some(x=>!policy.includes(x)))throw new Error('supervisor human exception policy drift');
  return state;
}

function loadEngineIds(engineRegistryPath=DEFAULT_ENGINE_REGISTRY){
  const r=readJson(engineRegistryPath,'engine registry');
  if(!Array.isArray(r?.engine_ids)||!r.engine_ids.includes('HEX-001'))throw new Error('canonical engine registry invalid');
  return new Set(r.engine_ids);
}

export function normalizeHumanException(payload,{engine_registry_path=DEFAULT_ENGINE_REGISTRY}={}){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('human exception payload object required');
  if(payload.company_id!=='fenix')throw new Error('human exception company_id denied');
  if(payload.contains_customer_data!==false||payload.contains_secrets!==false)throw new Error('human exception payload must explicitly contain no customer data or secrets');
  if(payload.prod_authorized!==false||payload.prod_write_authorized!==false||payload.trading_access!==false||Number(payload.additional_cost_eur)!==0)throw new Error('human exception payload cannot grant authority or cost');
  const event_id=req(payload.event_id,'event_id',240);
  if(!SAFE_SOURCE_RE.test(event_id))throw new Error('event_id contains unsupported characters');
  const engine_id=req(payload.engine_id,'engine_id',120);
  if(!loadEngineIds(engine_registry_path).has(engine_id))throw new Error(`non-canonical engine_id:${engine_id}`);
  const human_required=req(payload.human_required,'human_required',80).toUpperCase();
  const observed_at=iso(payload.observed_at,'observed_at');
  const source=req(payload.source,'source',160);
  if(!SAFE_SOURCE_RE.test(source))throw new Error('source contains unsupported characters');
  const stage=req(payload.stage,'stage',160);
  const human_alias=optText(payload.human_alias,'human_alias',160)??`Motor ${engine_id}`;
  const plain_language=optText(payload.plain_language,'plain_language',600)??`CEREBRO ha detenido una acción porque requiere intervención humana: ${human_required}.`;
  const purpose=optText(payload.purpose,'purpose',600)??`Resolver de forma acotada la excepción ${human_required} del motor ${engine_id}.`;
  const requested_change=optText(payload.requested_change,'requested_change',600)??`Revisar la excepción ${human_required} en la etapa ${stage} y decidir el siguiente paso permitido.`;
  const evidence_refs=safeList(payload.evidence_refs,'evidence_refs',{maxItems:20,maxLen:300});
  const resource_scope=safeList(payload.resource_scope,'resource_scope',{maxItems:20,maxLen:160});
  const reason_summary=optText(payload.reason_summary,'reason_summary',600)??plain_language;
  const requested_capability=optText(payload.requested_capability,'requested_capability',160)??stage;
  const max_money_eur=finiteNonNegative(payload.max_money_eur,'max_money_eur',0);
  const candidate_id=`human-exception:${hash(`${event_id}|${engine_id}|${human_required}`).slice(0,24)}`;
  const canonical=CANONICAL_SET.has(human_required);
  return freezeSafety({
    canonical,event_id,candidate_id,company_id:'fenix',engine_id,human_required,observed_at,updated_at:observed_at,source,stage,human_alias,
    plain_language,purpose,requested_change,authorization_class:'CANONICAL_HUMAN_EXCEPTION',requested_capability,resource_scope,max_money_eur,
    rollback_green:payload.rollback_green===true,prod_write_requested:bool(payload.prod_write_requested),destructive_delete_requested:bool(payload.destructive_delete_requested),unbounded_prod_write_requested:bool(payload.unbounded_prod_write_requested),
    customer_data_requested:false,external_skill_code_execution_requested:false,trading_requested:false,paid_fallback_requested:false,
    evidence:{source_event_id:event_id,source,observed_at,evidence_refs,reason_summary,source_run_id:Number.isInteger(Number(payload.source_run_id))?Number(payload.source_run_id):null,source_head_sha:typeof payload.source_head_sha==='string'&&/^[0-9a-f]{40}$/i.test(payload.source_head_sha)?payload.source_head_sha.toLowerCase():null,rollback_green:payload.rollback_green===true,prod_write:bool(payload.prod_write_requested),customer_data_used:false,external_skill_code_executed:false,trading_access:false,paid_fallback:false}
  });
}

export function ingestHumanException(state,payload,{now=new Date().toISOString(),engine_registry_path=DEFAULT_ENGINE_REGISTRY}={}){
  validateSupervisorState(state);
  const out=clone(state);out.waiting_human=out.waiting_human??{};out.processed_event_ids=out.processed_event_ids??[];out.stats=out.stats??{accepted_total:0,deduped_total:0,rejected_total:0};
  const item=normalizeHumanException(payload,{engine_registry_path});
  if(out.processed_event_ids.includes(item.event_id)){
    out.stats.deduped_total=(out.stats.deduped_total??0)+1;out.updated_at=now;
    return freezeSafety({state:out,result:{accepted:false,notified:false,decision:'DEDUPED_EXISTING_EVENT',event_id:item.event_id,human_required:item.human_required}});
  }
  out.processed_event_ids=[...out.processed_event_ids,item.event_id].slice(-5000);
  if(!item.canonical){
    out.stats.rejected_total=(out.stats.rejected_total??0)+1;out.updated_at=now;
    return freezeSafety({state:out,result:{accepted:false,notified:false,decision:'REJECT_NON_CANONICAL_HUMAN_REQUIRED',event_id:item.event_id,human_required:item.human_required}});
  }
  out.waiting_human[item.candidate_id]=item;
  out.stats.accepted_total=(out.stats.accepted_total??0)+1;out.updated_at=now;
  return freezeSafety({state:out,result:{accepted:true,notified:false,decision:'QUEUED_FOR_EXISTING_HUMAN_COMMUNICATION',event_id:item.event_id,candidate_id:item.candidate_id,human_required:item.human_required,next_gate:'CEREBRO_HUMAN_COMMUNICATION_V1'}});
}

export function ingestHumanExceptionBatch(state,payloads,options={}){
  if(!Array.isArray(payloads))throw new Error('payload batch must be array');
  let current=state;const results=[];
  for(const payload of payloads){const step=ingestHumanException(current,payload,options);current=step.state;results.push(step.result);}
  return freezeSafety({state:current,results,accepted_total:results.filter(x=>x.accepted).length,rejected_total:results.filter(x=>x.decision==='REJECT_NON_CANONICAL_HUMAN_REQUIRED').length,deduped_total:results.filter(x=>x.decision==='DEDUPED_EXISTING_EVENT').length});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){
  try{
    const statePath=path.resolve(req(arg('--state'),'--state',1000));
    const inputPath=path.resolve(req(arg('--input'),'--input',1000));
    const outputPath=path.resolve(req(arg('--output'),'--output',1000));
    const reportPath=path.resolve(req(arg('--report'),'--report',1000));
    const state=readJson(statePath,'supervisor state');
    const raw=readJson(inputPath,'human exception input');
    const payloads=Array.isArray(raw)?raw:[raw];
    const report=ingestHumanExceptionBatch(state,payloads);
    fs.mkdirSync(path.dirname(outputPath),{recursive:true});fs.mkdirSync(path.dirname(reportPath),{recursive:true});
    fs.writeFileSync(outputPath,`${JSON.stringify(report.state,null,2)}\n`,'utf8');
    fs.writeFileSync(reportPath,`${JSON.stringify({schema_version:'1.0.0',state_type:'CEREBRO_HUMAN_EXCEPTION_SUPERVISOR_REPORT',results:report.results,accepted_total:report.accepted_total,rejected_total:report.rejected_total,deduped_total:report.deduped_total,prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_eur:0},null,2)}\n`,'utf8');
    console.log(JSON.stringify({accepted_total:report.accepted_total,rejected_total:report.rejected_total,deduped_total:report.deduped_total,waiting_human:Object.keys(report.state.waiting_human??{}).length,prod_authorized:false,trading_access:false,additional_cost_eur:0}));
  }catch(error){console.error(error?.stack??String(error));process.exitCode=4;}
}

export const HUMAN_EXCEPTION_SUPERVISOR_V0_CONTRACT=Object.freeze({
  engine_id:'HEX-001',company_id:'fenix',state_branch:'cerebro-human-exception-state-v0',state_path:'cerebro/runtime/human-exception-supervisor-state.v0.json',
  input_event:'cerebro-human-required-v0',canonical_human_required:[...CANONICAL_HUMAN_REQUIRED],noncanonical_decision:'REJECT_NO_NOTIFICATION',dedupe:'event_id',
  notification_executor:'CEREBRO Human Communication V1',mail_transport:'REUSE_EXISTING_PRIVATE_MAIL_CONNECTOR',quiet_hours:'REUSE_EXISTING_EUROPE_MADRID_POLICY',
  prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_target_eur:0
});
