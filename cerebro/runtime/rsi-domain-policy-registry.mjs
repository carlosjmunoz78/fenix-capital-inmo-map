import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineDomainAutonomyPolicy,evaluateDomainAdoptionPolicy} from './rsi-domain-autonomy-policy.mjs';
import {runPreprodAdoptionMonitoringLoop} from './rsi-preprod-adoption-monitoring-loop.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_POLICY_PATH=path.resolve(HERE,'../registry/rsi-domain-autonomy-policies.v0.json');
const DEFAULT_ENGINE_REGISTRY_PATH=path.resolve(HERE,'../registry/engine-registry.seed.json');

function frozen(value){return Object.freeze({...value,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});}
function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function readJson(file,label){let parsed;try{parsed=JSON.parse(fs.readFileSync(file,'utf8'));}catch(error){throw new Error(`${label} unreadable:${error.message}`);}if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)) throw new Error(`${label} invalid`);return parsed;}
function keyOf({company_id,engine_id,domain_id}){return `${req(company_id,'company_id')}::${req(engine_id,'engine_id')}::${req(domain_id,'domain_id')}`;}

export function loadDomainPolicyRegistry({policy_path=DEFAULT_POLICY_PATH,engine_registry_path=DEFAULT_ENGINE_REGISTRY_PATH}={}){
  const source=readJson(policy_path,'domain policy registry');const engines=readJson(engine_registry_path,'engine registry');
  if(source.environment!=='PREPROD') throw new Error('domain policy registry must remain PREPROD');
  if(source.prod_authorized!==false||source.prod_write_authorized!==false||source.trading_access!==false) throw new Error('domain policy registry cannot grant PROD or Trading authority');
  if(source.additional_cost_eur!==0) throw new Error('domain policy registry incremental cost must remain zero');
  if(source.multicompany_continuation!==false) throw new Error('MULTIEMPRESA must remain frozen in this registry');
  if(source.default_policy_mode!=='ASSISTED_FAIL_CLOSED') throw new Error('default policy mode must remain fail-closed');
  if(!Array.isArray(source.policies)||source.policies.length===0) throw new Error('domain policy registry requires explicit policies');
  if(!Array.isArray(engines.engine_ids)||engines.engine_ids.length===0) throw new Error('canonical engine registry invalid');
  const engineIds=new Set(engines.engine_ids),seen=new Set(),policies=[];
  for(const raw of source.policies){
    if(raw.company_id!==source.company_id) throw new Error(`policy ${raw.policy_id??'unknown'} company mismatch`);
    if(!engineIds.has(raw.engine_id)) throw new Error(`policy ${raw.policy_id??'unknown'} references non-canonical engine ${raw.engine_id}`);
    const key=keyOf(raw);if(seen.has(key)) throw new Error(`duplicate domain policy:${key}`);seen.add(key);
    const policy=defineDomainAutonomyPolicy(raw);
    policies.push(Object.freeze({...policy,evidence_state:req(raw.evidence_state,'evidence_state'),autonomy_reason:typeof raw.autonomy_reason==='string'?raw.autonomy_reason:null,promotion_note:typeof raw.promotion_note==='string'?raw.promotion_note:null}));
  }
  return Object.freeze({schema_version:req(source.schema_version,'schema_version'),state_type:req(source.state_type,'state_type'),company_id:req(source.company_id,'company_id'),environment:'PREPROD',default_policy_mode:'ASSISTED_FAIL_CLOSED',policies:Object.freeze(policies),policy_count:policies.length,autonomous_count:policies.filter((p)=>p.autonomy_mode==='PREPROD_AUTONOMOUS').length,assisted_count:policies.filter((p)=>p.autonomy_mode==='ASSISTED').length,capability_autonomous_count:policies.filter((p)=>p.capability_autonomy_mode==='PREPROD_AUTONOMOUS').length,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,multicompany_continuation:false});
}

export function resolveDomainAutonomyPolicy({company_id,engine_id,domain_id,registry=null}={}){
  const reg=registry??loadDomainPolicyRegistry();const key=keyOf({company_id,engine_id,domain_id});const match=reg.policies.find((p)=>keyOf(p)===key)??null;
  if(match){const canAdopt=match.autonomy_mode==='PREPROD_AUTONOMOUS'||match.capability_autonomy_mode==='PREPROD_AUTONOMOUS';return frozen({ok:true,decision:'POLICY_RESOLVED',policy:match,policy_id:match.policy_id,policy_version:match.policy_version,domain_id:match.domain_id,next_gate:canAdopt?'DOMAIN_ADOPTION_POLICY':'DOMAIN_EVIDENCE_WIRING_REQUIRED'});}
  return frozen({ok:false,decision:'HOLD',human_required:null,reasons:['EXPLICIT_DOMAIN_POLICY_REQUIRED'],company_id:req(company_id,'company_id'),engine_id:req(engine_id,'engine_id'),domain_id:req(domain_id,'domain_id'),policy:null,policy_id:null,next_gate:'REGISTER_DOMAIN_POLICY_FAIL_CLOSED'});
}

export function evaluateRegisteredDomainAdoption({company_id,engine_id,domain_id,candidate,promotion_plan,registry=null}={}){const resolved=resolveDomainAutonomyPolicy({company_id,engine_id,domain_id,registry});if(!resolved.ok)return resolved;const policyDecision=evaluateDomainAdoptionPolicy({policy:resolved.policy,candidate,promotion_plan});return frozen({...policyDecision,domain_id:resolved.policy.domain_id,policy_id:resolved.policy.policy_id,policy_version:resolved.policy.policy_version});}

export function runRegisteredDomainPreprodLoop({company_id,engine_id,domain_id,candidate,promotion_plan,shadow_evidence,canary_evidence,observed_metrics,observed_at,evidence_refs=[],registry=null}={}){
  const policyDecision=evaluateRegisteredDomainAdoption({company_id,engine_id,domain_id,candidate,promotion_plan,registry});if(policyDecision.decision!=='ALLOW_PREPROD_CANARY')return frozen({...policyDecision,loop_started:false});
  const loop=runPreprodAdoptionMonitoringLoop({promotion_plan,shadow_evidence,canary_evidence,observed_metrics,observed_at,evidence_refs});
  return frozen({...loop,loop_started:true,domain_id,policy_id:policyDecision.policy_id,policy_version:policyDecision.policy_version,policy_decision_id:policyDecision.decision_id,domain_autonomy_mode:policyDecision.autonomy_mode,requested_capability:policyDecision.requested_capability??null,current_domain_promotion_authority_required:true});
}

export function domainPolicyCoverage({registry=null}={}){const reg=registry??loadDomainPolicyRegistry();return frozen({company_id:reg.company_id,environment:reg.environment,policy_count:reg.policy_count,autonomous_count:reg.autonomous_count,assisted_count:reg.assisted_count,capability_autonomous_count:reg.capability_autonomous_count,autonomous_domains:Object.freeze(reg.policies.filter((p)=>p.autonomy_mode==='PREPROD_AUTONOMOUS').map((p)=>p.domain_id).sort()),capability_autonomous_domains:Object.freeze(reg.policies.filter((p)=>p.capability_autonomy_mode==='PREPROD_AUTONOMOUS').map((p)=>p.domain_id).sort()),assisted_domains:Object.freeze(reg.policies.filter((p)=>p.autonomy_mode==='ASSISTED').map((p)=>p.domain_id).sort()),default_unregistered_domain_decision:'HOLD',multicompany_continuation:false});}

export const RSI_DOMAIN_POLICY_REGISTRY_CONTRACT=Object.freeze({registry:'cerebro/registry/rsi-domain-autonomy-policies.v0.json',environment:'PREPROD',default_unregistered_domain_decision:'HOLD',policy_modes:['ASSISTED','PREPROD_AUTONOMOUS'],capability_autonomy_mode:'PREPROD_AUTONOMOUS',loop_entry:'runRegisteredDomainPreprodLoop',requires:['explicit policy','canonical engine id','kill switch','blast radius','automatic rollback','zero incremental cost'],prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_target_eur:0});
