import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROVIDER_EVIDENCE=path.resolve(HERE,'../skills/zero-cost-provider-evidence.v0.json');
const SECRET_KEY_RE=/(?:^|_)(?:password|passwd|pwd|secret|token|access_token|refresh_token|api_key|apikey|authorization|cookie|private_key|client_secret)(?:$|_)/i;
const SECRET_VALUE_PATTERNS=[/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,/\bsb_secret_[A-Za-z0-9_-]{8,}/,/\bAIza[A-Za-z0-9_-]{12,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];

function req(v,label,max=300){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const x=v.trim();if(x.length>max)throw new Error(`${label} too long`);return x;}
function iso(v,label='observed_at'){const x=req(v,label,100);const t=Date.parse(x);if(Number.isNaN(t))throw new Error(`${label} invalid`);return new Date(t).toISOString();}
function bool(v){return v===true;}
function finite(v,label,def=0){if(v==null||v==='')return def;const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error(`${label} invalid`);return n;}
function readJson(file,label){let v;try{v=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){throw new Error(`${label} unreadable:${e.message}`);}if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(`${label} invalid`);return v;}
function safe(v){return Object.freeze({...v,contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,execution_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_eur:0});}
function forbiddenPath(value,p='root',depth=0){if(depth>10)throw new Error('discovery input too deep');if(value==null||typeof value==='boolean'||typeof value==='number')return null;if(typeof value==='string')return SECRET_VALUE_PATTERNS.some(re=>re.test(value))?p:null;if(Array.isArray(value)){for(let i=0;i<value.length;i++){const f=forbiddenPath(value[i],`${p}[${i}]`,depth+1);if(f)return f;}return null;}if(typeof value==='object'){for(const [k,x] of Object.entries(value)){if(SECRET_KEY_RE.test(k))return `${p}.${k}`;const f=forbiddenPath(x,`${p}.${k}`,depth+1);if(f)return f;}return null;}throw new Error('discovery input must be JSON-safe');}
function version(v){if(v==null)return null;const x=String(v).trim();return x.slice(0,160)||null;}
function evidenceRef(v){const x=String(v??'').trim();return x?x.slice(0,500):null;}
function capabilityList(v){if(!Array.isArray(v))return [];return [...new Set(v.map(String).map(x=>x.trim()).filter(Boolean))].sort();}

function historicalProviderIndex(providerEvidence){
  const routes=Array.isArray(providerEvidence?.routes)?providerEvidence.routes:[];
  return Object.fromEntries(routes.map(r=>[String(r.provider_id),{
    provider_id:String(r.provider_id),kind:String(r.kind??'UNKNOWN'),route_type:String(r.route_type??'UNKNOWN'),historical_availability_state:String(r.availability_state??'UNKNOWN'),historical_observed_at:providerEvidence.observed_at??null,additional_cost_eur:finite(r.additional_cost_eur,'historical additional cost',0),online:r.online===true,own_server_required:r.own_server_required===true
  }]));
}

function resource({resource_id,resource_class,capabilities,available,privacy='LOCAL',latency_ms=999999,ai=false,connector_id=null,availability_state,evidence_refs=[],provider_id=null,quota_state='NOT_APPLICABLE',current_observation=true,reason=null}){
  return Object.freeze({
    resource_id,resource_class,capabilities:Object.freeze(capabilityList(capabilities)),available:available===true,incremental_cost_eur:0,privacy,latency_ms:finite(latency_ms,'latency_ms',999999),ai:ai===true,
    ...(connector_id?{connector_id}:{}),...(provider_id?{provider_id}:{}),availability_state,quota_state,current_observation:current_observation===true,evidence_refs:Object.freeze(evidence_refs.map(evidenceRef).filter(Boolean)),reason
  });
}

export function discoverZeroCostResources(input,{provider_evidence_path=DEFAULT_PROVIDER_EVIDENCE}={}){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('resource discovery input object required');
  const forbidden=forbiddenPath(input);if(forbidden)throw new Error(`resource discovery secret-like material forbidden:${forbidden}`);
  if(input.company_id!=='fenix')throw new Error('resource discovery company_id denied');
  const observed_at=iso(input.observed_at);
  const environment=req(input.environment??'PREPROD','environment',40).toUpperCase();
  if(!['LAB','PREPROD'].includes(environment))throw new Error('resource discovery environment denied');
  const visibility=req(input.repository_visibility,'repository_visibility',20).toLowerCase();
  if(!['public','private'].includes(visibility))throw new Error('repository_visibility invalid');
  const runtime=input.runtime&&typeof input.runtime==='object'?input.runtime:{};
  const providers=input.providers&&typeof input.providers==='object'?input.providers:{};
  const browser=input.browser&&typeof input.browser==='object'?input.browser:{};
  const historical=historicalProviderIndex(readJson(provider_evidence_path,'zero-cost provider evidence'));
  const resources=[];

  if(bool(runtime.node?.available)){
    resources.push(resource({resource_id:'gha-node-runtime',resource_class:'DETERMINISTIC_LOCAL',capabilities:['typescript','rule','local_tool','engine_call'],available:true,privacy:'LOCAL',latency_ms:1,availability_state:'CURRENT_RUNNER_PROBE_GREEN',evidence_refs:[`runtime:node:${version(runtime.node.version)??'unknown'}`,evidenceRef(input.source_run_ref)]}));
  } else resources.push(resource({resource_id:'gha-node-runtime',resource_class:'DETERMINISTIC_LOCAL',capabilities:['typescript','rule','local_tool','engine_call'],available:false,availability_state:'CURRENT_RUNNER_PROBE_MISSING',reason:'NODE_RUNTIME_NOT_OBSERVED'}));

  if(bool(runtime.python?.available)){
    resources.push(resource({resource_id:'gha-python-runtime',resource_class:'DETERMINISTIC_LOCAL',capabilities:['python','rule','local_tool'],available:true,privacy:'LOCAL',latency_ms:1,availability_state:'CURRENT_RUNNER_PROBE_GREEN',evidence_refs:[`runtime:python:${version(runtime.python.version)??'unknown'}`,evidenceRef(input.source_run_ref)]}));
  } else resources.push(resource({resource_id:'gha-python-runtime',resource_class:'DETERMINISTIC_LOCAL',capabilities:['python','rule','local_tool'],available:false,availability_state:'CURRENT_RUNNER_PROBE_MISSING',reason:'PYTHON_RUNTIME_NOT_OBSERVED'}));

  const publicRunner=visibility==='public'&&bool(runtime.github_actions?.available);
  resources.push(resource({resource_id:'github-actions-control',resource_class:'GITHUB_ACTIONS',capabilities:['api','engine_call','research','typescript','python'],available:publicRunner,privacy:'REGISTERED_EXISTING_PATH',latency_ms:20,connector_id:'connector:github-actions',availability_state:publicRunner?'CURRENT_PUBLIC_RUNNER_AND_GH_PROBE_GREEN':visibility!=='public'?'HOLD_ZERO_COST_NOT_PROVEN_FOR_PRIVATE_REPO':'CURRENT_GH_PROBE_MISSING',evidence_refs:publicRunner?[`repo:visibility:${visibility}`,`runtime:gh:${version(runtime.github_actions?.version)??'unknown'}`,evidenceRef(input.source_run_ref)]:[],reason:publicRunner?null:'ZERO_COST_GITHUB_ACTIONS_NOT_CURRENTLY_PROVEN'}));

  const oss=providers['github-actions-ephemeral-oss']??{};
  const ossHistorical=historical['github-actions-ephemeral-oss'];
  const ossCurrent=publicRunner&&bool(oss.runtime_verified)&&bool(oss.integrity_verified)&&bool(oss.quota_guarded)&&finite(oss.remaining_calls,'oss.remaining_calls',0)>0;
  resources.push(resource({resource_id:'github-actions-ephemeral-oss',resource_class:'LOCAL_AI',capabilities:['interpretation','reasoning','comparison','redaction','research'],available:ossCurrent,privacy:'LOCAL',latency_ms:finite(oss.latency_ms,'oss.latency_ms',5000),ai:true,provider_id:'github-actions-ephemeral-oss',availability_state:ossCurrent?'CURRENT_RUNTIME_INTEGRITY_QUOTA_GREEN':ossHistorical?'HISTORICAL_ONLY_CURRENT_PROBE_REQUIRED':'NO_EVIDENCE',quota_state:ossCurrent?'CURRENT_QUOTA_GREEN':'CURRENT_QUOTA_UNPROVEN',evidence_refs:ossCurrent?[evidenceRef(oss.runtime_evidence_ref),evidenceRef(input.source_run_ref)]:ossHistorical?[`historical:${ossHistorical.historical_availability_state}:${ossHistorical.historical_observed_at}`]:[],current_observation:ossCurrent,reason:ossCurrent?null:'STATIC_OR_HISTORICAL_EVIDENCE_IS_NOT_CURRENT_AVAILABILITY'}));

  const gem=providers['google-gemini-api-free']??{};
  const gemHistorical=historical['google-gemini-api-free'];
  const gemCurrent=bool(gem.reference_present)&&bool(gem.policy_green)&&bool(gem.quota_guarded)&&bool(gem.current_zero_cost_probe_green)&&finite(gem.remaining_calls,'gem.remaining_calls',0)>0;
  resources.push(resource({resource_id:'google-gemini-api-free',resource_class:'FREE_AI',capabilities:['interpretation','reasoning','comparison','redaction','research'],available:gemCurrent,privacy:'APPROVED_CLOUD',latency_ms:finite(gem.latency_ms,'gem.latency_ms',5000),ai:true,provider_id:'google-gemini-api-free',connector_id:'connector:gemini-free-lab',availability_state:gemCurrent?'CURRENT_ZERO_COST_PROBE_POLICY_QUOTA_GREEN':gemHistorical?'HISTORICAL_ONLY_CURRENT_PROBE_REQUIRED':'NO_EVIDENCE',quota_state:gemCurrent?'CURRENT_QUOTA_GREEN':'CURRENT_QUOTA_UNPROVEN',evidence_refs:gemCurrent?[evidenceRef(gem.current_probe_evidence_ref),evidenceRef(input.source_run_ref)]:gemHistorical?[`historical:${gemHistorical.historical_availability_state}:${gemHistorical.historical_observed_at}`]:[],current_observation:gemCurrent,reason:gemCurrent?null:'REFERENCE_PRESENCE_ALONE_DOES_NOT_PROVE_CURRENT_FREE_AVAILABILITY'}));

  for(const id of ['cloudflare-workers-ai-free','mistral-api-free-mode']){
    const p=providers[id]??{};const h=historical[id];const current=bool(p.reference_present)&&bool(p.policy_green)&&bool(p.quota_guarded)&&bool(p.current_zero_cost_probe_green)&&finite(p.remaining_calls,`${id}.remaining_calls`,0)>0;
    resources.push(resource({resource_id:id,resource_class:'FREE_AI',capabilities:['interpretation','reasoning','comparison','redaction','research'],available:current,privacy:'APPROVED_CLOUD',latency_ms:finite(p.latency_ms,`${id}.latency_ms`,5000),ai:true,provider_id:id,availability_state:current?'CURRENT_ZERO_COST_PROBE_POLICY_QUOTA_GREEN':h?'HISTORICAL_ONLY_CURRENT_PROBE_REQUIRED':'NO_EVIDENCE',quota_state:current?'CURRENT_QUOTA_GREEN':'CURRENT_QUOTA_UNPROVEN',evidence_refs:current?[evidenceRef(p.current_probe_evidence_ref),evidenceRef(input.source_run_ref)]:h?[`historical:${h.historical_availability_state}:${h.historical_observed_at}`]:[],current_observation:current,reason:current?'NO_IAM_CONNECTOR_REGISTERED_YET':'CURRENT_FREE_AVAILABILITY_UNPROVEN'}));
  }

  const browserHealthy=browser.binding_status==='BROWSER_SESSION_BINDING_HEALTHY'&&bool(browser.connector_registered)&&bool(browser.current_attestation_green);
  resources.push(resource({resource_id:'agent-browser-real',resource_class:'BROWSER_COMPUTER_USE',capabilities:['research','local_tool'],available:browserHealthy,privacy:'BROWSER',latency_ms:finite(browser.latency_ms,'browser.latency_ms',1000),connector_id:'connector:agent-browser-candidate',availability_state:browserHealthy?'CURRENT_BINDING_ATTESTATION_GREEN':'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT',quota_state:'NOT_APPLICABLE',evidence_refs:browserHealthy?[evidenceRef(browser.attestation_evidence_ref),evidenceRef(input.source_run_ref)]:[],current_observation:browserHealthy,reason:browserHealthy?null:'REAL_BROWSER_BINDING_NOT_CURRENTLY_PROVEN'}));

  const summary={
    observed_total:resources.length,
    available_zero_cost_total:resources.filter(x=>x.available&&x.incremental_cost_eur===0).length,
    historical_only_total:resources.filter(x=>x.availability_state==='HISTORICAL_ONLY_CURRENT_PROBE_REQUIRED').length,
    hold_total:resources.filter(x=>!x.available).length
  };
  return safe({schema_version:'1.0.0',state_type:'CEREBRO_ROUTE001_REAL_RESOURCE_DISCOVERY',company_id:'fenix',engine_id:'ROUTE-001',environment,version:'0.1.0',observed_at,repository_visibility:visibility,source_run_id:Number.isInteger(Number(input.source_run_id))?Number(input.source_run_id):null,source_head_sha:typeof input.source_head_sha==='string'&&/^[0-9a-f]{40}$/i.test(input.source_head_sha)?input.source_head_sha.toLowerCase():null,resources:Object.freeze(resources),discovery_summary:Object.freeze(summary)});
}

export function buildResourceState(discovery,{previous_state=null,last_safe_loop=null}={}){
  if(!discovery||discovery.state_type!=='CEREBRO_ROUTE001_REAL_RESOURCE_DISCOVERY')throw new Error('canonical discovery required');
  if(previous_state&&(previous_state.prod_authorized!==false||previous_state.prod_write_authorized!==false||previous_state.execution_authorized!==false||previous_state.trading_access!==false||previous_state.multicompany_continuation!==false||Number(previous_state.additional_cost_eur)!==0))throw new Error('previous resource state authority drift');
  return safe({schema_version:'1.0.0',state_type:'CEREBRO_ROUTE001_REAL_RESOURCE_STATE',company_id:'fenix',engine_id:'ROUTE-001',environment:'PREPROD_CONTROL_PLANE',version:'0.1.0',updated_at:discovery.observed_at,source_run_id:discovery.source_run_id,source_head_sha:discovery.source_head_sha,repository_visibility:discovery.repository_visibility,resources:discovery.resources,discovery_summary:discovery.discovery_summary,last_safe_loop:last_safe_loop??previous_state?.last_safe_loop??null});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  try{
    const inputPath=path.resolve(req(arg('--input'),'--input',1000));const outputPath=path.resolve(req(arg('--output'),'--output',1000));
    const discovery=discoverZeroCostResources(readJson(inputPath,'resource discovery input'));
    fs.mkdirSync(path.dirname(outputPath),{recursive:true});fs.writeFileSync(outputPath,`${JSON.stringify(discovery,null,2)}\n`,'utf8');
    console.log(JSON.stringify({status:'ROUTE001_DISCOVERY_GREEN',available_zero_cost_total:discovery.discovery_summary.available_zero_cost_total,historical_only_total:discovery.discovery_summary.historical_only_total,hold_total:discovery.discovery_summary.hold_total,prod_authorized:false,trading_access:false,additional_cost_eur:0}));
  }catch(error){console.error(error?.stack??String(error));process.exitCode=4;}
}

export const ROUTE001_RESOURCE_DISCOVERY_V0_CONTRACT=Object.freeze({engine_id:'ROUTE-001',company_id:'fenix',environments:['LAB','PREPROD'],static_evidence_never_equals_current_availability:true,secret_values_allowed:false,paid_resources_discovered:false,browser_requires_current_attestation:true,repo_public_required_for_zero_cost_gha_claim:true,prod_authorized:false,prod_write_authorized:false,execution_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_target_eur:0});
