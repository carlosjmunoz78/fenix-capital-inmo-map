import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {connectorAuthDecision,loadIdentityCredentialFoundation} from '../governance/identity-credential-broker.mjs';
import {lifecycleUseDecision} from '../governance/identity-session-lifecycle.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_POLICY=path.resolve(HERE,'../registry/execution-model-router-policy.v0.json');
const DEFAULT_ENGINE_REGISTRY=path.resolve(HERE,'../registry/engine-registry.seed.json');
const SECRET_KEYS=new Set(['secret','password','token','jwt','api_key','apikey','access_token','refresh_token','private_key','credential_value']);
const SECRET_PATTERNS=[/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,/\bsb_secret_[A-Za-z0-9_-]{8,}/,/\bAIza[A-Za-z0-9_-]{12,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];

function readJson(file,label){let v;try{v=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){throw new Error(`${label} unreadable:${e.message}`);}if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(`${label} invalid`);return v;}
function req(v,label,max=240){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const x=v.trim();if(x.length>max)throw new Error(`${label} too long`);return x;}
function number(v,label,def=0){if(v==null||v==='')return def;const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error(`${label} invalid`);return n;}
function safe(v){return Object.freeze({...v,prod_authorized:false,prod_write_authorized:false,execution_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_eur:0});}
function rawSecretPath(v,p='root'){
  if(v==null)return null;
  if(Array.isArray(v)){for(let i=0;i<v.length;i++){const f=rawSecretPath(v[i],`${p}[${i}]`);if(f)return f;}return null;}
  if(typeof v==='object'){for(const [k,x] of Object.entries(v)){if(SECRET_KEYS.has(k.toLowerCase()))return `${p}.${k}`;const f=rawSecretPath(x,`${p}.${k}`);if(f)return f;}return null;}
  if(typeof v==='string'&&SECRET_PATTERNS.some(re=>re.test(v)))return p;
  return null;
}
function human(reason,detail={}){return safe({status:'HUMAN_REQUIRED',human_required:reason,reason,...detail});}
function hold(reason,detail={}){return safe({status:'HOLD',human_required:null,reason,...detail});}
function block(reason,detail={}){return safe({status:'BLOCKED',human_required:null,reason,...detail});}

export function loadRouterPolicy({policy_path=DEFAULT_POLICY,engine_registry_path=DEFAULT_ENGINE_REGISTRY}={}){
  const p=readJson(policy_path,'router policy');
  const engines=readJson(engine_registry_path,'engine registry');
  const required=['ROUTE-001','FREE-001','AIBUD-001','LOCAL-001','IAM-001'];
  if(!required.every(x=>engines.engine_ids?.includes(x)))throw new Error('router supporting engines missing from canonical registry');
  if(p.company_id!=='fenix'||p.engine_id!=='ROUTE-001')throw new Error('router policy identity drift');
  if(p.prod_authorized!==false||p.prod_write_authorized!==false||p.execution_authorized!==false||p.trading_access!==false||p.multicompany_continuation!==false||Number(p.additional_cost_eur)!==0)throw new Error('router policy authority/cost drift');
  if(Number(p.budget?.incremental_cost_hard_cap_eur)!==0||p.budget?.automatic_paid_fallback!==false||p.budget?.silent_spend_allowed!==false)throw new Error('router budget policy drift');
  if(p.browser?.fallback_only!==true||p.browser?.captcha_bypass_allowed!==false||p.browser?.mfa_bypass_allowed!==false)throw new Error('router browser policy drift');
  return p;
}

export function budgetDecision({estimated_incremental_cost_eur=0,paid_route_requested=false}={}){
  const cost=number(estimated_incremental_cost_eur,'estimated_incremental_cost_eur',0);
  if(cost===0)return safe({ok:true,status:'GREEN_ZERO_ADDITIONAL_COST',human_required:null,estimated_incremental_cost_eur:0});
  return human('MONEY_LIMIT',{ok:false,estimated_incremental_cost_eur:cost,paid_route_requested:paid_route_requested===true,decision:'NO_AUTOMATIC_PAID_FALLBACK'});
}

function normalizeInput(input,policy){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('router input object required');
  const secretPath=rawSecretPath(input);if(secretPath)throw new Error(`raw secret material forbidden:${secretPath}`);
  if(input.company_id!=='fenix')throw new Error('router company_id denied');
  const task_type=req(input.task_type,'task_type',120);
  const environment=req(input.environment,'environment',80).toUpperCase();
  const confidence=input.confidence==null?1:Number(input.confidence);if(!Number.isFinite(confidence)||confidence<0||confidence>1)throw new Error('confidence invalid');
  const risk=String(input.risk??'LOW').toUpperCase();if(!['LOW','MEDIUM','HIGH'].includes(risk))throw new Error('risk invalid');
  const resources=Array.isArray(input.available_resources)?input.available_resources:[];
  if(resources.length>100)throw new Error('too many available_resources');
  return {task_type,environment,confidence,risk,resources,contains_customer_data:input.contains_customer_data===true,contains_secrets:input.contains_secrets===true,prod_write_requested:input.prod_write_requested===true,trading_requested:input.trading_requested===true,paid_route_requested:input.paid_route_requested===true,estimated_paid_cost_eur:number(input.estimated_paid_cost_eur,'estimated_paid_cost_eur',0),browser_binding_status:String(input.browser_binding_status??''),lifecycle_state:input.lifecycle_state??null,policy};
}

function evaluateResource(resource,ctx,{foundation}){
  if(!resource||typeof resource!=='object'||Array.isArray(resource))return {eligible:false,reason:'INVALID_RESOURCE'};
  const resource_id=typeof resource.resource_id==='string'?resource.resource_id.trim():'';
  const resource_class=typeof resource.resource_class==='string'?resource.resource_class.trim().toUpperCase():'';
  if(!resource_id||!ctx.policy.resource_priority.includes(resource_class))return {eligible:false,reason:'UNKNOWN_RESOURCE_CLASS',resource_id};
  if(resource.available!==true)return {eligible:false,reason:'UNAVAILABLE',resource_id,resource_class};
  const capabilities=Array.isArray(resource.capabilities)?resource.capabilities.map(String):[];
  if(!(capabilities.includes('*')||capabilities.includes(ctx.task_type)))return {eligible:false,reason:'CAPABILITY_MISMATCH',resource_id,resource_class};
  const cost=number(resource.incremental_cost_eur,'resource.incremental_cost_eur',0);
  if(cost>0||resource_class==='PAID_EXTERNAL')return {eligible:false,reason:'NON_ZERO_COST',resource_id,resource_class,cost};
  const isAI=resource.ai===true||resource_class==='LOCAL_AI'||resource_class==='FREE_AI';
  if(isAI&&!ctx.policy.ai_allowed_only_for.includes(ctx.task_type))return {eligible:false,reason:'AI_NOT_ALLOWED_FOR_TASK',resource_id,resource_class};
  if(ctx.contains_customer_data){
    const privacy=String(resource.privacy??'').toUpperCase();
    if(resource_class==='FREE_AI'||resource_class==='BROWSER_COMPUTER_USE')return {eligible:false,reason:'SENSITIVE_DATA_EXTERNAL_ROUTE_DENIED',resource_id,resource_class};
    if(!['LOCAL','REGISTERED_EXISTING_PATH'].includes(privacy))return {eligible:false,reason:'SENSITIVE_DATA_PRIVACY_PATH_DENIED',resource_id,resource_class};
  }
  if(resource_class==='BROWSER_COMPUTER_USE'){
    if(!ctx.policy.browser.allowed_environments.includes(ctx.environment))return {eligible:false,reason:'BROWSER_ENVIRONMENT_DENIED',resource_id,resource_class};
    if(ctx.browser_binding_status!==ctx.policy.browser.required_binding_status)return {eligible:false,reason:'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT',resource_id,resource_class};
    if(!resource.connector_id)return {eligible:false,reason:'BROWSER_CONNECTOR_REQUIRED',resource_id,resource_class};
  }
  let auth=null;const lifecycle=[];
  if(resource.connector_id){
    auth=connectorAuthDecision({connector_id:String(resource.connector_id),environment:ctx.environment,foundation});
    if(!auth.ok)return {eligible:false,reason:auth.decision,resource_id,resource_class,auth};
    for(const ref of auth.credential_ref_ids??[]){
      const d=lifecycleUseDecision({credential_ref_id:ref,state:ctx.lifecycle_state});lifecycle.push(d);
      if(!d.ok)return {eligible:false,reason:d.decision,resource_id,resource_class,auth,lifecycle};
    }
  } else if(['REGISTERED_API','FREE_AI','BROWSER_COMPUTER_USE'].includes(resource_class)) {
    return {eligible:false,reason:'REGISTERED_CONNECTOR_REQUIRED',resource_id,resource_class};
  }
  const priority=ctx.policy.resource_priority.indexOf(resource_class);
  const latency=number(resource.latency_ms,'resource.latency_ms',999999);
  return {eligible:true,reason:'ELIGIBLE_ZERO_COST',resource_id,resource_class,priority,latency_ms:latency,ai_required:isAI,auth,lifecycle,privacy:String(resource.privacy??'UNSPECIFIED').toUpperCase(),incremental_cost_eur:0};
}

export function rankZeroCostResources(input,{policy=null,foundation=null}={}){
  const p=policy??loadRouterPolicy();const ctx=normalizeInput(input,p);const f=foundation??loadIdentityCredentialFoundation();
  const evaluated=ctx.resources.map(r=>evaluateResource(r,ctx,{foundation:f}));
  const eligible=evaluated.filter(x=>x.eligible).sort((a,b)=>a.priority-b.priority||a.latency_ms-b.latency_ms||a.resource_id.localeCompare(b.resource_id));
  return safe({status:'RANKED',task_type:ctx.task_type,environment:ctx.environment,eligible:Object.freeze(eligible),diagnostics:Object.freeze(evaluated.filter(x=>!x.eligible)),human_required:null});
}

export function routeWork(input,{policy=null,foundation=null}={}){
  const p=policy??loadRouterPolicy();const ctx=normalizeInput(input,p);
  if(ctx.contains_secrets)return block('SECRET_DATA_ROUTING_DENIED');
  if(ctx.trading_requested)return block('TRADING_ISOLATION_DENIED');
  if(ctx.prod_write_requested)return block('PROD_WRITE_NOT_AUTHORIZED_BY_ROUTER');
  if(ctx.risk==='HIGH')return human('HIGH_RISK',{task_type:ctx.task_type,environment:ctx.environment});
  if(ctx.confidence<Number(p.confidence.minimum_autonomous_confidence))return human('LOW_CONFIDENCE',{task_type:ctx.task_type,environment:ctx.environment,confidence:ctx.confidence,threshold:Number(p.confidence.minimum_autonomous_confidence)});
  const known=p.deterministic_task_types.includes(ctx.task_type)||p.interpretive_task_types.includes(ctx.task_type);
  if(!known)return human('LOW_CONFIDENCE',{task_type:ctx.task_type,environment:ctx.environment,decision:'UNKNOWN_TASK_TYPE'});
  const ranked=rankZeroCostResources(input,{policy:p,foundation});
  if(ranked.eligible.length>0){
    const selected=ranked.eligible[0];
    return safe({status:'ROUTED',task_type:ctx.task_type,environment:ctx.environment,selected_resource_id:selected.resource_id,selected_resource_class:selected.resource_class,ai_required:selected.ai_required,privacy:selected.privacy,cost_target_eur:0,estimated_incremental_cost_eur:0,human_required:null,selection_reason:'HIGHEST_PRIORITY_ELIGIBLE_ZERO_COST_RESOURCE',fallback_chain:Object.freeze(ranked.eligible.slice(1).map(x=>x.resource_id)),diagnostics:Object.freeze(ranked.diagnostics)});
  }
  const hasPaidCandidate=ctx.resources.some(r=>r?.available===true&&(String(r.resource_class??'').toUpperCase()==='PAID_EXTERNAL'||number(r.incremental_cost_eur,'resource.incremental_cost_eur',0)>0));
  if(hasPaidCandidate||ctx.paid_route_requested||ctx.estimated_paid_cost_eur>0){
    const estimated=ctx.estimated_paid_cost_eur>0?ctx.estimated_paid_cost_eur:Math.max(0,...ctx.resources.map(r=>number(r?.incremental_cost_eur,'resource.incremental_cost_eur',0)));
    return human('MONEY_LIMIT',{task_type:ctx.task_type,environment:ctx.environment,estimated_incremental_cost_eur:estimated,decision:'ZERO_COST_ROUTE_EXHAUSTED_PAID_ROUTE_NOT_AUTORIZED',diagnostics:Object.freeze(ranked.diagnostics)});
  }
  return hold(p.zero_cost_exhausted_decision,{task_type:ctx.task_type,environment:ctx.environment,diagnostics:Object.freeze(ranked.diagnostics)});
}

export const EXECUTION_MODEL_ROUTER_V0_CONTRACT=Object.freeze({
  engine_id:'ROUTE-001',supporting_engines:['FREE-001','AIBUD-001','LOCAL-001','IAM-001'],legacy_branch:'cerebro-model-router-v0-20260911',deterministic_before_ai:true,local_first:true,zero_new_cost_by_default:true,automatic_paid_fallback:false,paid_route_exception:'MONEY_LIMIT',browser_fallback_only:true,secret_values_allowed:false,prod_authorized:false,prod_write_authorized:false,execution_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_target_eur:0,next_gate:'ROUTE001_REAL_RESOURCE_DISCOVERY_AND_PREPROD_LOOP_V0'
});
