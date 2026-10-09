import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildUniversalLearningEventReport} from './universal-learning-ingress.mjs';
import {loadDomainPolicyRegistry} from './rsi-domain-policy-registry.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOURCE_REGISTRY=path.resolve(HERE,'../registry/rsi-domain-evidence-sources.v0.json');
const SOURCE_KINDS=new Set(['GITHUB_WORKFLOW_RUN','PUBLIC_HTTP_PROBE']);
const SIGNAL_TYPES=new Set(['ENGINE_RESULT','ENGINE_ERROR','ENGINE_EVENT','METRIC_OBSERVATION','COST_OBSERVATION','HUMAN_CORRECTION','TRIBUNAL_DECISION','OBSERVABILITY_ALERT']);

function req(v,label,max=1000){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const x=v.trim();if(x.length>max)throw new Error(`${label} too long`);return x;}
function finite(v,label){const n=Number(v);if(!Number.isFinite(n))throw new Error(`${label} must be finite`);return n;}
function iso(v,label){const s=req(v,label,100);if(Number.isNaN(Date.parse(s)))throw new Error(`${label} invalid`);return new Date(s).toISOString();}
function readJson(file,label){let v;try{v=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){throw new Error(`${label} unreadable:${e.message}`);}if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(`${label} invalid`);return v;}
function frozen(v){return Object.freeze({...v,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,multicompany_continuation:false});}
function tuple(x){return `${x.company_id}::${x.engine_id}::${x.domain_id}`;}

export function loadRealDomainEvidenceRegistry({source_registry_path=DEFAULT_SOURCE_REGISTRY,policy_registry=null}={}){
  const src=readJson(source_registry_path,'real-domain evidence registry');
  const policies=policy_registry??loadDomainPolicyRegistry();
  if(src.company_id!=='fenix'||src.environment!=='PREPROD') throw new Error('evidence registry must remain fenix PREPROD');
  if(src.prod_authorized!==false||src.prod_write_authorized!==false||src.trading_access!==false||src.additional_cost_eur!==0||src.multicompany_continuation!==false) throw new Error('evidence registry authority/cost drift');
  if(src.default_unregistered_source_decision!=='HOLD') throw new Error('unregistered evidence source must HOLD');
  if(!Array.isArray(src.bindings)||src.bindings.length===0) throw new Error('evidence bindings required');
  const policyKeys=new Set(policies.policies.map(tuple));
  const ids=new Set();
  const bindings=src.bindings.map((raw)=>{
    const source_id=req(raw.source_id,'source_id',240);
    if(ids.has(source_id)) throw new Error(`duplicate source_id:${source_id}`); ids.add(source_id);
    if(!policyKeys.has(tuple(raw))) throw new Error(`evidence source lacks registered domain policy:${source_id}`);
    const source_kind=req(raw.source_kind,'source_kind',60).toUpperCase();
    if(!SOURCE_KINDS.has(source_kind)) throw new Error(`unsupported source_kind:${source_kind}`);
    if(!['LAB','PREPROD','SHADOW','CANARY','PROD'].includes(raw.source_environment)) throw new Error(`invalid source_environment:${source_id}`);
    const confidence=finite(raw.confidence,'confidence'); if(confidence<0.60||confidence>1) throw new Error(`confidence out of range:${source_id}`);
    if(raw.state!=='LIVE_CONNECTED') throw new Error(`non-live binding cannot be active:${source_id}`);
    if(source_kind==='GITHUB_WORKFLOW_RUN'&&(!Array.isArray(raw.workflow_names)||raw.workflow_names.length===0)) throw new Error(`workflow_names required:${source_id}`);
    if(source_kind==='PUBLIC_HTTP_PROBE'&&(!Array.isArray(raw.probe_urls)||raw.probe_urls.length===0)) throw new Error(`probe_urls required:${source_id}`);
    return Object.freeze({...raw,source_id,source_kind,confidence});
  });
  const policyDomains=new Set(policies.policies.map(tuple));
  const boundDomains=new Set(bindings.map(tuple));
  const uncovered=[...policyDomains].filter((x)=>!boundDomains.has(x)).sort();
  if(uncovered.length) throw new Error(`registered domains without automatic evidence source:${uncovered.join(',')}`);
  const dispatch=src.external_dispatch??{};
  if(dispatch.event_type!=='cerebro-domain-evidence-v0'||dispatch.enabled!==true||dispatch.allowed_company_id!=='fenix'||dispatch.requires_registered_domain_policy!==true||dispatch.contains_customer_data!==false||dispatch.contains_secrets!==false||dispatch.prod_authorized!==false||dispatch.prod_write_authorized!==false||dispatch.trading_access!==false||dispatch.additional_cost_eur!==0) throw new Error('external dispatch contract drift');
  return frozen({schema_version:req(src.schema_version,'schema_version'),state_type:req(src.state_type,'state_type'),company_id:'fenix',environment:'PREPROD',bindings:Object.freeze(bindings),binding_count:bindings.length,covered_domain_count:boundDomains.size,policy_domain_count:policyDomains.size,external_dispatch:Object.freeze({...dispatch})});
}

function baseSignal(binding,{signal_id,signal_type,version,observed_at,severity='INFO',risk_class='LOW',reason,metric,payload,evidence_refs}){
  return {
    signal_id,signal_type,company_id:binding.company_id,engine_id:binding.engine_id,source_environment:binding.source_environment,version,observed_at,
    severity,risk_class,confidence:binding.confidence,reason,
    hypothesis:`Real evidence for ${binding.domain_id} should be evaluated against prior evidence before any controlled improvement candidate is allowed to advance.`,
    metric,evidence_refs,payload:{source_id:binding.source_id,domain_id:binding.domain_id,evidence_depth:binding.evidence_depth,...payload},
    contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  };
}

export function signalsFromWorkflowRun(snapshot,{registry=null}={}){
  const reg=registry??loadRealDomainEvidenceRegistry();
  const name=req(snapshot?.name,'workflow_run.name',240);
  const run_id=Number(snapshot?.run_id??snapshot?.id); if(!Number.isInteger(run_id)||run_id<=0) throw new Error('workflow_run.run_id positive integer required');
  const head_sha=req(snapshot?.head_sha,'workflow_run.head_sha',80); if(!/^[0-9a-f]{40}$/i.test(head_sha)) throw new Error('workflow_run.head_sha invalid');
  const conclusion=req(snapshot?.conclusion,'workflow_run.conclusion',40).toLowerCase();
  const observed_at=iso(snapshot?.updated_at??snapshot?.observed_at,'workflow_run.updated_at');
  const attempt=Number(snapshot?.run_attempt??1); if(!Number.isInteger(attempt)||attempt<1) throw new Error('workflow_run.run_attempt invalid');
  const bindings=reg.bindings.filter((b)=>b.source_kind==='GITHUB_WORKFLOW_RUN'&&b.workflow_names.includes(name));
  return Object.freeze(bindings.map((binding)=>baseSignal(binding,{
    signal_id:`domain:${binding.engine_id}:${run_id}:${attempt}`,
    signal_type:conclusion==='success'?'ENGINE_RESULT':'ENGINE_ERROR',
    version:`git-${head_sha.slice(0,12)}`,
    observed_at,
    severity:conclusion==='success'?'INFO':'HIGH',
    risk_class:conclusion==='success'?'LOW':'MEDIUM',
    reason:`GitHub workflow ${name} completed with conclusion ${conclusion}.`,
    metric:{name:'workflow_success',direction:'HIGHER',measurement:'IMMUTABLE_GITHUB_WORKFLOW_RUN_CONCLUSION'},
    evidence_refs:[`github-actions-run:${run_id}`,`git:${head_sha.toLowerCase()}`],
    payload:{workflow_name:name,run_id,run_attempt:attempt,conclusion,head_sha:head_sha.toLowerCase(),head_branch:String(snapshot?.head_branch??''),event:String(snapshot?.event??'')}
  })));
}

export function signalsFromPublicProbes(probes,{registry=null,version='public-probe-v0'}={}){
  const reg=registry??loadRealDomainEvidenceRegistry();
  if(!Array.isArray(probes)||probes.length===0) throw new Error('public probes required');
  const signals=[];
  for(const probe of probes){
    const url=req(probe?.url,'probe.url',1000);
    const status=Number(probe?.http_status); if(!Number.isInteger(status)||status<0||status>599) throw new Error('probe.http_status invalid');
    const latency=finite(probe?.latency_ms??0,'probe.latency_ms'); if(latency<0) throw new Error('probe.latency_ms invalid');
    const observed_at=iso(probe?.observed_at,'probe.observed_at');
    const bindings=reg.bindings.filter((b)=>b.source_kind==='PUBLIC_HTTP_PROBE'&&b.probe_urls.includes(url));
    for(const binding of bindings){
      const pass=status>=200&&status<400;
      signals.push(baseSignal(binding,{
        signal_id:`domain:${binding.engine_id}:probe:${Buffer.from(`${url}|${observed_at}`).toString('base64url').slice(0,32)}`,
        signal_type:pass?'METRIC_OBSERVATION':'OBSERVABILITY_ALERT',version,observed_at,severity:pass?'INFO':'HIGH',risk_class:pass?'LOW':'MEDIUM',
        reason:`Public read-only probe ${url} returned HTTP ${status} in ${Math.round(latency)} ms.`,
        metric:{name:'http_availability',direction:'HIGHER',measurement:'PUBLIC_READONLY_HTTP_PROBE'},
        evidence_refs:[`http-probe:${url}`,`observed-at:${observed_at}`],
        payload:{url,http_status:status,latency_ms:latency}
      }));
    }
  }
  return Object.freeze(signals);
}

export function signalsFromExternalDispatch(payload,{registry=null}={}){
  const reg=registry??loadRealDomainEvidenceRegistry();
  if(!payload||typeof payload!=='object'||Array.isArray(payload)) throw new Error('dispatch payload object required');
  if(payload.company_id!=='fenix') throw new Error('dispatch company_id denied');
  if(payload.contains_customer_data!==false||payload.contains_secrets!==false||payload.prod_authorized!==false||payload.prod_write_authorized!==false||payload.trading_access!==false||Number(payload.additional_cost_eur)!==0) throw new Error('dispatch authority/data/cost violation');
  const engine_id=req(payload.engine_id,'dispatch.engine_id',160),domain_id=req(payload.domain_id,'dispatch.domain_id',240);
  const binding=reg.bindings.find((b)=>b.company_id==='fenix'&&b.engine_id===engine_id&&b.domain_id===domain_id);
  if(!binding) throw new Error('dispatch domain is not registered');
  const signal_type=req(payload.signal_type,'dispatch.signal_type',80).toUpperCase(); if(!SIGNAL_TYPES.has(signal_type)) throw new Error('dispatch signal_type invalid');
  return Object.freeze([baseSignal(binding,{
    signal_id:req(payload.signal_id,'dispatch.signal_id',240),signal_type,version:req(payload.version,'dispatch.version',80),observed_at:iso(payload.observed_at,'dispatch.observed_at'),
    severity:req(payload.severity??'INFO','dispatch.severity',20).toUpperCase(),risk_class:req(payload.risk_class??'LOW','dispatch.risk_class',20).toUpperCase(),
    reason:req(payload.reason,'dispatch.reason',2000),metric:payload.metric??{name:'operational_quality',direction:'HIGHER',measurement:'AUTHORIZED_EXTERNAL_DOMAIN_EVIDENCE'},
    evidence_refs:Array.isArray(payload.evidence_refs)?payload.evidence_refs:[],payload:{external_source:req(payload.external_source,'dispatch.external_source',240),value:payload.value??null}
  })]);
}

export function buildRealDomainEvidenceReport({mode,input,registry=null}={}){
  const reg=registry??loadRealDomainEvidenceRegistry();
  let signals;
  if(mode==='workflow_run') signals=signalsFromWorkflowRun(input,{registry:reg});
  else if(mode==='public_probe') signals=signalsFromPublicProbes(input,{registry:reg});
  else if(mode==='external_dispatch') signals=signalsFromExternalDispatch(input,{registry:reg});
  else throw new Error('evidence wiring mode invalid');
  if(signals.length===0) return frozen({schema_version:'1.0.0',state_type:'CEREBRO_RSI_REAL_DOMAIN_EVIDENCE_REPORT',events_total:0,events:[],status:'NO_REGISTERED_SIGNAL_FOR_SOURCE'});
  const report=buildUniversalLearningEventReport(signals);
  return frozen({...report,state_type:'CEREBRO_RSI_REAL_DOMAIN_EVIDENCE_REPORT',status:'REAL_DOMAIN_EVIDENCE_GREEN'});
}

export function realDomainEvidenceCoverage({registry=null}={}){
  const reg=registry??loadRealDomainEvidenceRegistry();
  return frozen({company_id:'fenix',environment:'PREPROD',binding_count:reg.binding_count,policy_domain_count:reg.policy_domain_count,covered_domain_count:reg.covered_domain_count,coverage_complete:reg.covered_domain_count===reg.policy_domain_count,live_bindings:reg.bindings.map((b)=>({source_id:b.source_id,engine_id:b.engine_id,domain_id:b.domain_id,source_kind:b.source_kind,evidence_depth:b.evidence_depth})),next_gate:'HUMAN_EXCEPTION_SUPERVISOR_V0'});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){
  try{
    const mode=req(arg('--mode'),'--mode',40);
    const input=readJson(path.resolve(req(arg('--input'),'--input',1000)),'evidence input');
    const output=path.resolve(req(arg('--output'),'--output',1000));
    const report=buildRealDomainEvidenceReport({mode,input});
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
    console.log(JSON.stringify({status:report.status,events_total:report.events_total,output,prod_authorized:false,trading_access:false,additional_cost_eur:0}));
  }catch(error){console.error(error?.stack??String(error));process.exitCode=4;}
}

export const RSI_REAL_DOMAIN_EVIDENCE_WIRING_CONTRACT=Object.freeze({
  environment:'PREPROD',company_id:'fenix',modes:['workflow_run','public_probe','external_dispatch'],
  universal_ingress:'universal-learning-ingress.mjs',outbox:'rsi-event-outbox.mjs',
  unregistered_source:'HOLD',contains_customer_data:false,contains_secrets:false,
  prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_target_eur:0,multicompany_continuation:false,
  next_gate:'HUMAN_EXCEPTION_SUPERVISOR_V0'
});
