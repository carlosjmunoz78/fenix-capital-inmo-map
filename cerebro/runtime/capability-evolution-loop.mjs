import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stableIdempotencyKey,HUMAN_REQUIRED_CODES,RISK_CLASSES} from './continuous-improvement-contract.mjs';
import {buildUniversalLearningEventReport} from './universal-learning-ingress.mjs';
import {loadDomainPolicyRegistry} from './rsi-domain-policy-registry.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ENGINE_REGISTRY=path.resolve(HERE,'../registry/engine-registry.seed.json');
const DEFAULT_CAPABILITY_REGISTRY=path.resolve(HERE,'../registry/capability-evolution-registry.v0.json');
const SOURCE_TYPES=new Set(['SKILL','PLUGIN','TOOL','ENGINE_COMPONENT','RULESET','CONNECTOR']);
const SAFE_ENVS=new Set(['LAB','PREPROD']);
const HUMAN_SET=new Set(HUMAN_REQUIRED_CODES);
const SECRET_HINT=/(password|passwd|secret|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization|bearer)\s*[:=]/i;
const TAG_STOP=new Set(['fenix','cerebro','continuous','evolution','control','plane','domain']);

function clone(v){return structuredClone(v);}
function req(v,label,max=1000){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const x=v.trim();if(x.length>max)throw new Error(`${label} too long`);if(SECRET_HINT.test(x))throw new Error(`${label} contains secret-like material`);return x;}
function opt(v,label,max=1000){if(v==null||v==='')return null;return req(v,label,max);}
function finite(v,label){const n=Number(v);if(!Number.isFinite(n))throw new Error(`${label} must be finite`);return n;}
function nonneg(v,label){const n=finite(v,label);if(n<0)throw new Error(`${label} must be >=0`);return n;}
function bounded(v,label,min,max){const n=finite(v,label);if(n<min||n>max)throw new Error(`${label} out of range`);return n;}
function uniqStrings(v,label,{maxItems=100,maxLen=160,allowEmpty=true}={}){if(v==null&&allowEmpty)return [];if(!Array.isArray(v))throw new Error(`${label} must be array`);if(v.length>maxItems)throw new Error(`${label} too many items`);const out=[...new Set(v.map((x,i)=>req(x,`${label}[${i}]`,maxLen)))].sort((a,b)=>a.localeCompare(b));if(!allowEmpty&&out.length===0)throw new Error(`${label} required`);return out;}
function readJson(file,label){let x;try{x=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){throw new Error(`${label} unreadable:${e.message}`);}if(!x||typeof x!=='object'||Array.isArray(x))throw new Error(`${label} invalid`);return x;}
function safe(v){return Object.freeze({...v,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});}
function human(code){return code&&HUMAN_SET.has(code)?code:null;}
function failDecision(decision,reasons,human_required=null,extra={}){return safe({ok:false,decision,reasons:[...new Set(reasons)],human_required:human(human_required),...extra});}
function metricDirection(name){return ['cost_eur','latency_ms','error_rate'].includes(name)?'LOWER':'HIGHER';}
function canonicalTags(domainId){return [...new Set(String(domainId??'').toLowerCase().split(/[^a-z0-9]+/).filter(x=>x&&x.length>2&&!TAG_STOP.has(x)))];}
function validateRegistryEnvelope(x){
  if(!x||typeof x!=='object'||Array.isArray(x)||x.state_type!=='CEREBRO_CAPABILITY_EVOLUTION_REGISTRY'||x.environment!=='PREPROD_CONTROL_PLANE')throw new Error('capability registry identity drift');
  if(x.prod_authorized!==false||x.prod_write_authorized!==false||x.trading_access!==false||Number(x.additional_cost_eur)!==0)throw new Error('capability registry authority/cost drift');
  if(x.direct_prod_binding_allowed!==false||x.multicompany_runtime_activation!==false||x.multi_company_ready!==true)throw new Error('capability registry policy drift');
  if(!Array.isArray(x.records)||!Array.isArray(x.bindings)||!Array.isArray(x.binding_history))throw new Error('capability registry collections invalid');
  return x;
}

export function loadCapabilityEvolutionRegistry(file=DEFAULT_CAPABILITY_REGISTRY){
  return clone(validateRegistryEnvelope(readJson(file,'capability evolution registry')));
}

export function normalizeCapabilityManifest(raw,{engine_registry_path=DEFAULT_ENGINE_REGISTRY}={}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('capability manifest object required');
  const engines=readJson(engine_registry_path,'engine registry');
  const canonical=new Set(engines.engine_ids??[]);
  const capability_id=req(raw.capability_id,'capability_id',160);
  if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,159}$/.test(capability_id))throw new Error('capability_id format invalid');
  const version=req(raw.version,'version',80);
  if(!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version))throw new Error('version must be semantic');
  const source_type=req(raw.source_type??'SKILL','source_type',40).toUpperCase();
  if(!SOURCE_TYPES.has(source_type))throw new Error('source_type unsupported');
  const environment=req(raw.environment??'LAB','environment',20).toUpperCase();
  if(!SAFE_ENVS.has(environment))throw new Error('capability manifest must remain LAB/PREPROD');
  const company_scope=uniqStrings(raw.company_scope,'company_scope',{maxItems:100,maxLen:80,allowEmpty:false});
  const capability_tags=uniqStrings(raw.capability_tags,'capability_tags',{maxItems:100,maxLen:100,allowEmpty:false}).map(x=>x.toLowerCase());
  const capabilities_provided=uniqStrings(raw.capabilities_provided,'capabilities_provided',{maxItems:100,maxLen:160,allowEmpty:false});
  const compatible_engine_ids=uniqStrings(raw.compatible_engine_ids,'compatible_engine_ids',{maxItems:177,maxLen:80});
  for(const id of compatible_engine_ids)if(!canonical.has(id))throw new Error(`non-canonical compatible_engine_id:${id}`);
  const compatible_domain_ids=uniqStrings(raw.compatible_domain_ids,'compatible_domain_ids',{maxItems:100,maxLen:200});
  const risk_class=req(raw.risk_class??'LOW','risk_class',20).toUpperCase();
  if(!RISK_CLASSES.includes(risk_class))throw new Error('risk_class invalid');
  const confidence=bounded(raw.confidence??0.75,'confidence',0,1);
  const evidence_refs=uniqStrings(raw.evidence_refs,'evidence_refs',{maxItems:50,maxLen:500,allowEmpty:false});
  const rollback_ref=req(raw.rollback_ref,'rollback_ref',500);
  const rebuild_ref=req(raw.rebuild_ref,'rebuild_ref',500);
  const source_ref=req(raw.source_ref,'source_ref',1000);
  const options=Array.isArray(raw.execution_options)?raw.execution_options:[];
  if(options.length===0||options.length>50)throw new Error('execution_options required');
  const routeIds=new Set();
  const execution_options=options.map((o,i)=>{
    if(!o||typeof o!=='object'||Array.isArray(o))throw new Error(`execution_options[${i}] invalid`);
    const route_id=req(o.route_id,`execution_options[${i}].route_id`,160);
    if(routeIds.has(route_id))throw new Error(`duplicate route_id:${route_id}`);routeIds.add(route_id);
    return Object.freeze({route_id,kind:req(o.kind??'LOCAL',`execution_options[${i}].kind`,40).toUpperCase(),cost_eur:nonneg(o.cost_eur??0,`execution_options[${i}].cost_eur`),deterministic:o.deterministic===true,existing_tool:o.existing_tool===true,priority:Number.isInteger(Number(o.priority))?Number(o.priority):100});
  }).sort((a,b)=>a.route_id.localeCompare(b.route_id));
  const permissions=raw.permissions&&typeof raw.permissions==='object'&&!Array.isArray(raw.permissions)?raw.permissions:{};
  if(permissions.prod_write===true||permissions.trading_access===true||permissions.permission_elevation===true)throw new Error('capability authority expansion forbidden');
  const manifest={schema_version:'1.0.0',capability_id,version,source_type,source_ref,environment,company_scope,capability_tags,capabilities_provided,compatible_engine_ids,compatible_domain_ids,risk_class,confidence,evidence_refs,rollback_ref,rebuild_ref,permissions:{read_scopes:uniqStrings(permissions.read_scopes,'permissions.read_scopes',{maxItems:50,maxLen:160}),write_scopes:uniqStrings(permissions.write_scopes,'permissions.write_scopes',{maxItems:50,maxLen:160}),prod_write:false,trading_access:false,permission_elevation:false},execution_options,contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  return Object.freeze({...manifest,manifest_fingerprint:stableIdempotencyKey(manifest)});
}

export function registerCapability(registryRaw,rawManifest,options={}){
  const registry=clone(validateRegistryEnvelope(registryRaw));
  const manifest=normalizeCapabilityManifest(rawManifest,options);
  const scopeKey=manifest.company_scope.join(',');
  const sameVersion=registry.records.find(x=>x.capability_id===manifest.capability_id&&x.version===manifest.version&&Array.isArray(x.company_scope)&&x.company_scope.join(',')===scopeKey);
  if(sameVersion){
    if(sameVersion.manifest_fingerprint!==manifest.manifest_fingerprint)return failDecision('HOLD_VERSION_IMMUTABILITY_CONFLICT',['SAME_CAPABILITY_VERSION_DIFFERENT_PAYLOAD'],'POLICY_CONFLICT',{registry,manifest});
    return safe({ok:true,decision:'DUPLICATE_NOOP',duplicate:true,registry,manifest,registration_id:sameVersion.registration_id});
  }
  const registration_id=`capreg:${stableIdempotencyKey({capability_id:manifest.capability_id,version:manifest.version,company_scope:manifest.company_scope,manifest_fingerprint:manifest.manifest_fingerprint}).slice(0,24)}`;
  registry.records=[...registry.records,{...manifest,registration_id,state:'REGISTERED',registered_at_evidence:'MANIFEST_VERSIONED'}].sort((a,b)=>`${a.capability_id}:${a.version}:${a.registration_id}`.localeCompare(`${b.capability_id}:${b.version}:${b.registration_id}`));
  return safe({ok:true,decision:'REGISTERED',duplicate:false,registry,manifest,registration_id});
}

export function capabilitiesForCompany(registryRaw,company_id){
  const registry=validateRegistryEnvelope(registryRaw);
  const company=req(company_id,'company_id',80);
  const records=registry.records.filter(x=>Array.isArray(x.company_scope)&&(x.company_scope.includes(company)||x.company_scope.includes('*'))).map(clone);
  return Object.freeze(records);
}

export function chooseZeroCostRoute(manifestRaw,options={}){
  const manifest=manifestRaw?.manifest_fingerprint?manifestRaw:normalizeCapabilityManifest(manifestRaw,options);
  const free=manifest.execution_options.filter(x=>x.cost_eur===0).sort((a,b)=>Number(b.deterministic)-Number(a.deterministic)||Number(b.existing_tool)-Number(a.existing_tool)||a.priority-b.priority||a.route_id.localeCompare(b.route_id));
  if(free.length===0)return failDecision('HOLD_MONEY_LIMIT',['NO_ZERO_COST_EXECUTION_ROUTE'],'MONEY_LIMIT',{capability_id:manifest.capability_id});
  return safe({ok:true,decision:'ZERO_COST_ROUTE_SELECTED',route:free[0],alternatives_considered:manifest.execution_options.length,human_required:null});
}

export function analyzeCapabilityImpact(manifestRaw,{company_id,engine_registry_path=DEFAULT_ENGINE_REGISTRY,policy_registry=null}={}){
  const company=req(company_id,'company_id',80);
  const manifest=manifestRaw?.manifest_fingerprint?manifestRaw:normalizeCapabilityManifest(manifestRaw,{engine_registry_path});
  if(!(manifest.company_scope.includes(company)||manifest.company_scope.includes('*')))return failDecision('HOLD_COMPANY_SCOPE',['CAPABILITY_NOT_AUTHORIZED_FOR_COMPANY'],null,{company_id:company,impacts:[]});
  const engines=readJson(engine_registry_path,'engine registry');
  const canonical=new Set(engines.engine_ids??[]);
  const policies=policy_registry??loadDomainPolicyRegistry();
  const policyRows=Array.isArray(policies?.policies)?policies.policies:[];
  const explicit=new Set(manifest.compatible_engine_ids);
  const explicitDomains=new Set(manifest.compatible_domain_ids);
  const tags=new Set(manifest.capability_tags);
  const inferredPolicyEngines=new Set(policyRows.filter(p=>p.company_id===company&&(explicitDomains.has(p.domain_id)||canonicalTags(p.domain_id).some(t=>tags.has(t)))).map(p=>p.engine_id));
  const targets=[...new Set([...explicit,...inferredPolicyEngines])].filter(id=>canonical.has(id)).sort();
  const impacts=targets.map(engine_id=>{
    const p=policyRows.find(x=>x.company_id===company&&x.engine_id===engine_id)??null;
    return Object.freeze({company_id:company,engine_id,domain_id:p?.domain_id??null,route:'EXTEND_EXISTING',policy_mode:p?.autonomy_mode??'UNREGISTERED_FAIL_CLOSED',policy_id:p?.policy_id??null,min_confidence:p?.min_confidence??null,allowed_risk_classes:p?.allowed_risk_classes??[],automatic_rollback_allowed:p?.automatic_rollback_allowed===true,kill_switch_enabled:p?.kill_switch_enabled===true});
  });
  if(impacts.length>0)return safe({ok:true,decision:'EXTEND_EXISTING',company_id:company,capability_id:manifest.capability_id,impacts:Object.freeze(impacts),fact001_gap_candidate:null,human_required:null});
  const gap_id=`fact001-gap:${stableIdempotencyKey({company_id:company,capability_id:manifest.capability_id,version:manifest.version,capabilities_provided:manifest.capabilities_provided}).slice(0,24)}`;
  return safe({ok:true,decision:'FACT001_GAP_CANDIDATE',company_id:company,capability_id:manifest.capability_id,impacts:[],human_required:null,fact001_gap_candidate:Object.freeze({gap_id,company_id:company,environment:'PREPROD',capability_id:manifest.capability_id,capability_version:manifest.version,capabilities_provided:manifest.capabilities_provided,decision:'GAP_REQUIRES_FACTORY_ASSESSMENT',engine_creation_authorized:false,registry_mutation_authorized:false,next_gate:'FACT001_EXISTING_ENGINE_OR_COMPOSITION_REVIEW'})});
}

export function buildCapabilityTrialPlan(manifestRaw,{company_id,requested_environment='PREPROD',engine_registry_path=DEFAULT_ENGINE_REGISTRY,policy_registry=null}={}){
  const manifest=manifestRaw?.manifest_fingerprint?manifestRaw:normalizeCapabilityManifest(manifestRaw,{engine_registry_path});
  if(String(requested_environment).toUpperCase()==='PROD')return failDecision('HOLD_DIRECT_PROD_DENIED',['PREPROD_TRIAL_REQUIRED_BEFORE_ANY_PROD_CONSIDERATION'],null,{company_id,capability_id:manifest.capability_id});
  if(['HIGH','CRITICAL'].includes(manifest.risk_class))return failDecision('HOLD_HIGH_RISK',['CAPABILITY_RISK_REQUIRES_HUMAN'],'HIGH_RISK',{company_id,capability_id:manifest.capability_id});
  if(manifest.confidence<0.60)return failDecision('HOLD_LOW_CONFIDENCE',['CAPABILITY_CONFIDENCE_BELOW_GLOBAL_MINIMUM'],'LOW_CONFIDENCE',{company_id,capability_id:manifest.capability_id});
  const route=chooseZeroCostRoute(manifest,{engine_registry_path});if(!route.ok)return route;
  const impact=analyzeCapabilityImpact(manifest,{company_id,engine_registry_path,policy_registry});if(!impact.ok)return impact;
  if(impact.decision==='FACT001_GAP_CANDIDATE')return safe({ok:true,decision:'FACT001_GAP_CANDIDATE',company_id,capability_id:manifest.capability_id,selected_route:route.route,impact,next_gate:'FACT001_EXISTING_ENGINE_OR_COMPOSITION_REVIEW',human_required:null});
  const trialTargets=[];
  for(const target of impact.impacts){
    if(target.policy_mode==='UNREGISTERED_FAIL_CLOSED'){trialTargets.push({...target,trial_decision:'HOLD_REGISTER_DOMAIN_POLICY',human_required:null});continue;}
    if(!target.allowed_risk_classes.includes(manifest.risk_class)){trialTargets.push({...target,trial_decision:'HOLD_POLICY_CONFLICT',human_required:'POLICY_CONFLICT'});continue;}
    if(manifest.confidence<Number(target.min_confidence??1)){trialTargets.push({...target,trial_decision:'HOLD_LOW_CONFIDENCE',human_required:'LOW_CONFIDENCE'});continue;}
    if(target.kill_switch_enabled!==true||target.automatic_rollback_allowed!==true){trialTargets.push({...target,trial_decision:'HOLD_POLICY_CONFLICT',human_required:'POLICY_CONFLICT'});continue;}
    trialTargets.push({...target,trial_decision:'TRIAL_ALLOWED',human_required:null});
  }
  const allowed=trialTargets.filter(x=>x.trial_decision==='TRIAL_ALLOWED');
  const humans=[...new Set(trialTargets.map(x=>x.human_required).filter(Boolean))];
  return safe({ok:allowed.length>0,decision:allowed.length>0?'PREPROD_TRIAL_PLAN_READY':'HOLD_NO_TRIAL_TARGET_ALLOWED',company_id,capability_id:manifest.capability_id,capability_version:manifest.version,selected_route:route.route,targets:Object.freeze(trialTargets),allowed_target_count:allowed.length,human_required:humans.length===1?humans[0]:null,human_required_all:Object.freeze(humans),next_gate:allowed.length>0?'OLD_VS_NEW_CAPABILITY_TRIAL':'HOLD'});
}

function normalizeMetrics(raw,label){if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error(`${label} object required`);return Object.freeze({quality_score:bounded(raw.quality_score,`${label}.quality_score`,0,1),cost_eur:nonneg(raw.cost_eur,`${label}.cost_eur`),latency_ms:nonneg(raw.latency_ms,`${label}.latency_ms`),error_rate:bounded(raw.error_rate,`${label}.error_rate`,0,1),safety_score:bounded(raw.safety_score??1,`${label}.safety_score`,0,1)});}

export function evaluateCapabilityTrial({manifest,target,baseline_metrics,candidate_metrics,evidence_refs=[],observed_at='2026-01-01T00:00:00.000Z'}={}){
  if(!manifest?.manifest_fingerprint)throw new Error('normalized manifest required');
  if(!target||typeof target!=='object')throw new Error('target required');
  const oldM=normalizeMetrics(baseline_metrics,'baseline_metrics'),newM=normalizeMetrics(candidate_metrics,'candidate_metrics');
  const regressions=[],improvements=[];
  if(newM.quality_score<oldM.quality_score-0.01)regressions.push('QUALITY_REGRESSION');else if(newM.quality_score>oldM.quality_score+0.01)improvements.push('QUALITY_IMPROVED');
  if(newM.cost_eur>oldM.cost_eur)regressions.push('COST_REGRESSION');else if(newM.cost_eur<oldM.cost_eur)improvements.push('COST_IMPROVED');
  const latencyTolerance=Math.max(5,oldM.latency_ms*0.05);if(newM.latency_ms>oldM.latency_ms+latencyTolerance)regressions.push('LATENCY_REGRESSION');else if(newM.latency_ms<Math.max(0,oldM.latency_ms-latencyTolerance))improvements.push('LATENCY_IMPROVED');
  if(newM.error_rate>oldM.error_rate+0.01)regressions.push('ERROR_RATE_REGRESSION');else if(newM.error_rate<oldM.error_rate-0.01)improvements.push('ERROR_RATE_IMPROVED');
  if(newM.safety_score<oldM.safety_score-0.01)regressions.push('SAFETY_REGRESSION');else if(newM.safety_score>oldM.safety_score+0.01)improvements.push('SAFETY_IMPROVED');
  let decision,next_gate,human_required=null;
  if(regressions.length){decision='ROLLBACK_HOLD';next_gate='ROLLBACK_PREVIOUS_BINDING';}
  else if(improvements.length&&target.policy_mode==='PREPROD_AUTONOMOUS'){decision='PREPROD_CANDIDATE_PROMOTION';next_gate='PREPROD_BINDING_ACTIVATION';}
  else if(improvements.length){decision='PREPROD_IMPROVEMENT_PROVEN_ASSISTED_HOLD';next_gate='DOMAIN_POLICY_OR_HUMAN_REVIEW';}
  else{decision='HOLD_MORE_EVIDENCE';next_gate='MORE_OLD_VS_NEW_EVIDENCE';}
  const evaluation_id=`capeval:${stableIdempotencyKey({company_id:target.company_id,engine_id:target.engine_id,capability_id:manifest.capability_id,version:manifest.version,oldM,newM,decision}).slice(0,24)}`;
  return safe({ok:decision==='PREPROD_CANDIDATE_PROMOTION',evaluation_id,decision,next_gate,human_required,company_id:target.company_id,engine_id:target.engine_id,domain_id:target.domain_id??null,capability_id:manifest.capability_id,capability_version:manifest.version,baseline_metrics:oldM,candidate_metrics:newM,regressions:Object.freeze(regressions),improvements:Object.freeze(improvements),evidence_refs:Object.freeze(uniqStrings(evidence_refs,'evidence_refs',{maxItems:50,maxLen:500})),observed_at:req(observed_at,'observed_at',100),rollback_ref:manifest.rollback_ref,rebuild_ref:manifest.rebuild_ref,promotion_environment:'PREPROD',prod_binding_authorized:false});
}

export function buildCapabilityLearningReport({manifest,target,evaluation}={}){
  if(!manifest?.manifest_fingerprint||!target||!evaluation)throw new Error('manifest target evaluation required');
  const signal={signal_id:`capability:${evaluation.evaluation_id}`,signal_type:'TRIBUNAL_DECISION',company_id:target.company_id,engine_id:target.engine_id,source_environment:'PREPROD',version:manifest.version,observed_at:evaluation.observed_at,severity:evaluation.regressions.length?'HIGH':'INFO',risk_class:evaluation.regressions.length?'MEDIUM':manifest.risk_class,confidence:manifest.confidence,reason:`Capability ${manifest.capability_id}@${manifest.version} OLD-vs-NEW decision ${evaluation.decision}.`,hypothesis:`Future routing for ${target.engine_id} should reuse ${manifest.capability_id} only when measured evidence remains non-regressive and policy-authorized.`,metric:{name:'capability_old_vs_new_quality',direction:'HIGHER',measurement:'CONTROLLED_OLD_VS_NEW_CAPABILITY_TRIAL'},evidence_refs:[...manifest.evidence_refs,...evaluation.evidence_refs,`evaluation:${evaluation.evaluation_id}`],payload:{capability_id:manifest.capability_id,capability_version:manifest.version,decision:evaluation.decision,improvements:evaluation.improvements,regressions:evaluation.regressions,route:'CAPABILITY_EVOLUTION_V0'},contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  return buildUniversalLearningEventReport([signal]);
}

export function activatePreprodBinding(registryRaw,{manifest,target,evaluation,policy_registry=null}={}){
  const registry=clone(validateRegistryEnvelope(registryRaw));
  if(!manifest?.manifest_fingerprint||!target||typeof target!=='object'||!evaluation||typeof evaluation!=='object')return failDecision('HOLD_BINDING_INPUT_INVALID',['MANIFEST_TARGET_EVALUATION_REQUIRED'],null,{registry});
  const company_id=req(target.company_id,'target.company_id',80),engine_id=req(target.engine_id,'target.engine_id',80),domain_id=req(target.domain_id,'target.domain_id',200);
  if(!(manifest.company_scope.includes(company_id)||manifest.company_scope.includes('*')))return failDecision('HOLD_COMPANY_SCOPE',['CAPABILITY_NOT_AUTHORIZED_FOR_COMPANY'],null,{registry});
  const registration=registry.records.find(x=>x.capability_id===manifest.capability_id&&x.version===manifest.version&&x.manifest_fingerprint===manifest.manifest_fingerprint&&x.state==='REGISTERED'&&Array.isArray(x.company_scope)&&(x.company_scope.includes(company_id)||x.company_scope.includes('*')))??null;
  if(!registration)return failDecision('HOLD_CAPABILITY_NOT_REGISTERED',['MATCHING_REGISTERED_CAPABILITY_REQUIRED'],null,{registry});
  const expectedRegistrationId=`capreg:${stableIdempotencyKey({capability_id:manifest.capability_id,version:manifest.version,company_scope:manifest.company_scope,manifest_fingerprint:manifest.manifest_fingerprint}).slice(0,24)}`;
  if(registration.registration_id!==expectedRegistrationId)return failDecision('HOLD_REGISTRATION_INTEGRITY',['REGISTRATION_ID_MISMATCH'],'POLICY_CONFLICT',{registry});
  const policyRegistry=policy_registry??loadDomainPolicyRegistry();
  const currentPolicy=(policyRegistry?.policies??[]).find(p=>p.company_id===company_id&&p.engine_id===engine_id&&p.domain_id===domain_id)??null;
  if(!currentPolicy)return failDecision('HOLD_DOMAIN_POLICY_MISSING',['CURRENT_DOMAIN_POLICY_REQUIRED'],null,{registry});
  if(currentPolicy.autonomy_mode!=='PREPROD_AUTONOMOUS'||currentPolicy.kill_switch_enabled!==true||currentPolicy.automatic_rollback_allowed!==true)return failDecision('HOLD_BINDING_NOT_AUTHORIZED',['CURRENT_PREPROD_AUTONOMOUS_POLICY_REQUIRED'],null,{registry});
  if(!currentPolicy.allowed_risk_classes.includes(manifest.risk_class))return failDecision('HOLD_POLICY_CONFLICT',['CAPABILITY_RISK_NOT_ALLOWED_BY_CURRENT_POLICY'],'POLICY_CONFLICT',{registry});
  if(manifest.confidence<Number(currentPolicy.min_confidence??1))return failDecision('HOLD_LOW_CONFIDENCE',['CAPABILITY_CONFIDENCE_BELOW_CURRENT_POLICY'],'LOW_CONFIDENCE',{registry});
  const evaluationMatches=evaluation.ok===true&&evaluation.decision==='PREPROD_CANDIDATE_PROMOTION'&&evaluation.next_gate==='PREPROD_BINDING_ACTIVATION'&&evaluation.company_id===company_id&&evaluation.engine_id===engine_id&&(evaluation.domain_id??null)===domain_id&&evaluation.capability_id===manifest.capability_id&&evaluation.capability_version===manifest.version&&evaluation.promotion_environment==='PREPROD'&&evaluation.prod_binding_authorized===false&&evaluation.prod_authorized===false&&evaluation.prod_write_authorized===false&&evaluation.trading_access===false&&Number(evaluation.additional_cost_eur)===0&&Array.isArray(evaluation.regressions)&&evaluation.regressions.length===0&&Array.isArray(evaluation.improvements)&&evaluation.improvements.length>0&&evaluation.rollback_ref===manifest.rollback_ref&&evaluation.rebuild_ref===manifest.rebuild_ref;
  if(!evaluationMatches)return failDecision('HOLD_EVALUATION_SCOPE_MISMATCH',['MATCHING_GREEN_PREPROD_EVALUATION_REQUIRED'],null,{registry});
  const oldM=normalizeMetrics(evaluation.baseline_metrics,'evaluation.baseline_metrics'),newM=normalizeMetrics(evaluation.candidate_metrics,'evaluation.candidate_metrics');
  const expectedEvaluationId=`capeval:${stableIdempotencyKey({company_id,engine_id,capability_id:manifest.capability_id,version:manifest.version,oldM,newM,decision:evaluation.decision}).slice(0,24)}`;
  if(evaluation.evaluation_id!==expectedEvaluationId)return failDecision('HOLD_EVALUATION_INTEGRITY',['EVALUATION_ID_MISMATCH'],'POLICY_CONFLICT',{registry});
  const key=`${company_id}::${engine_id}::${manifest.capability_id}`;
  const prior=registry.bindings.find(x=>x.binding_key===key)??null;
  if(prior&&prior.environment==='PREPROD'&&prior.capability_version===manifest.version&&prior.evaluation_id===evaluation.evaluation_id)return safe({ok:true,decision:'DUPLICATE_NOOP',duplicate:true,registry,binding:clone(prior),previous_binding:clone(prior)});
  const binding={binding_key:key,company_id,engine_id,domain_id,environment:'PREPROD',capability_id:manifest.capability_id,capability_version:manifest.version,evaluation_id:evaluation.evaluation_id,policy_id:currentPolicy.policy_id,policy_version:currentPolicy.policy_version,state:'ACTIVE_PREPROD',rollback_ref:manifest.rollback_ref,rebuild_ref:manifest.rebuild_ref,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  registry.bindings=[...registry.bindings.filter(x=>x.binding_key!==key),binding].sort((a,b)=>a.binding_key.localeCompare(b.binding_key));
  registry.binding_history=[...registry.binding_history,{history_id:`caphist:${stableIdempotencyKey({key,evaluation_id:evaluation.evaluation_id,prior}).slice(0,24)}`,binding_key:key,action:'ACTIVATE_PREPROD',previous_binding:prior?clone(prior):null,new_binding:clone(binding),evaluation_id:evaluation.evaluation_id,policy_id:currentPolicy.policy_id,policy_version:currentPolicy.policy_version}];
  return safe({ok:true,decision:'PREPROD_BINDING_ACTIVE',duplicate:false,registry,binding,previous_binding:prior});
}

export function rollbackCapabilityBinding(registryRaw,{company_id,engine_id,capability_id}={}){
  const registry=clone(validateRegistryEnvelope(registryRaw));const key=`${req(company_id,'company_id',80)}::${req(engine_id,'engine_id',80)}::${req(capability_id,'capability_id',160)}`;
  const history=[...registry.binding_history].reverse().find(x=>x.binding_key===key&&x.action==='ACTIVATE_PREPROD');
  if(!history)return failDecision('HOLD_ROLLBACK_EVIDENCE_MISSING',['NO_PREVIOUS_BINDING_HISTORY'],null,{registry});
  if(history.previous_binding)registry.bindings=[...registry.bindings.filter(x=>x.binding_key!==key),clone(history.previous_binding)].sort((a,b)=>a.binding_key.localeCompare(b.binding_key));
  else registry.bindings=registry.bindings.filter(x=>x.binding_key!==key);
  registry.binding_history=[...registry.binding_history,{history_id:`caphist:${stableIdempotencyKey({key,rollback_of:history.history_id}).slice(0,24)}`,binding_key:key,action:'ROLLBACK_PREPROD',rollback_of:history.history_id,restored_binding:history.previous_binding?clone(history.previous_binding):null}];
  return safe({ok:true,decision:'ROLLBACK_RESTORED_PREVIOUS_BINDING',registry,restored_binding:history.previous_binding?clone(history.previous_binding):null});
}

export function capabilityEvolutionStatus(registryRaw){
  const r=clone(validateRegistryEnvelope(registryRaw));return safe({status:'CAPABILITY_EVOLUTION_LOOP_V0_READY',registered_capabilities:r.records.length,active_preprod_bindings:r.bindings.length,binding_history:r.binding_history.length,multi_company_ready:r.multi_company_ready===true,multicompany_runtime_activation:false,direct_prod_binding_allowed:false,engine_creation_directly_authorized:false,learning_ingress:'universal-learning-ingress.mjs',factory_gap_gate:'FACT001_EXISTING_ENGINE_OR_COMPOSITION_REVIEW'});
}

export const CAPABILITY_EVOLUTION_LOOP_V0_CONTRACT=Object.freeze({
  environment:'PREPROD_CONTROL_PLANE',reuse_engines:['LRN-001','FACT-001','HEX-001'],new_engine_id_created:false,
  flow:['REGISTER_VERSIONED_CAPABILITY','SELECT_ZERO_COST_ROUTE','ANALYZE_IMPACT','EXTEND_EXISTING_FIRST','OLD_VS_NEW_TRIAL','EMIT_LEARNING_EVIDENCE','POLICY_GATED_PREPROD_BINDING','ROLLBACK_ON_REGRESSION','FACT001_GAP_ONLY_IF_NO_EXISTING_TARGET'],
  any_canonical_engine_can_be_target:true,unregistered_domain_autoapply:'HOLD',direct_prod_binding_allowed:false,engine_creation_directly_authorized:false,multi_company_ready:true,multicompany_runtime_activation:false,additional_cost_target_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false
});
