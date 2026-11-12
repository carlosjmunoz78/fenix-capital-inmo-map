import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * JARVIS CUT49: single-runtime, fail-closed control mesh for PREPROD ONLY.
 * This is not an authenticated production endpoint or a universal engine executor.
 * Authority is supplied by independently verified server-side callbacks.
 * No model can add handlers, targets, credentials or execution permissions.
 */
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','registry');
const load=name=>JSON.parse(fs.readFileSync(path.join(ROOT,name),'utf8'));
const CATALOG=load('engine-registry.v1.json');
const ROLES=load('role-agent-registry.v1.json');
const BINDINGS=load('existing-engine-bindings.json');
const CONSOLE=load('console-v0.json');
const ENGINES=new Set(CATALOG.engine_ids);
const ROLES_BY_ID=new Map(ROLES.roles.map(role=>[role.role_id,role]));
const BINDINGS_BY_ENGINE=new Map(BINDINGS.engines.map(binding=>[binding.engine_id,binding]));
const CONSOLE_ENGINES=new Set(CONSOLE.engines.map(engine=>engine.engine_id));
const PREPROD='PREPROD';
const HUMAN_REASONS=new Set([
 'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
 'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);
const deny=(status,reason)=>Object.freeze({status,reason,executed:false});
const validString=(value,max=128)=>typeof value==='string'&&value.length>0&&value.length<=max&&value.trim()===value&&!value.includes('\0');
const jsonClone=value=>structuredClone(value);
const exactContext=context=>context?.environment===PREPROD&&
 validString(context.company_id)&&validString(context.engine_id)&&validString(context.version);
const forbidden=id=>/^(?:LAB-TRD|TRD-)/i.test(id)||/TRADING/i.test(id);

export function inspectJarvisCommandNetworkV0(){
 const engines=CATALOG.engine_ids.map(id=>{
  const binding=BINDINGS_BY_ENGINE.get(id);
  return Object.freeze({
   target_type:'ENGINE',target_id:id,
   registry_status:'CATALOGUED_NOT_PROOF_OF_RUNTIME',
   gateway_declared:CONSOLE_ENGINES.has(id),
   binding_state:binding?.binding_state??'NO_LIVE_BINDING_EVIDENCE',
   live_executable_verified:false
  });
 });
 const roles=ROLES.roles.map(role=>Object.freeze({
  target_type:'ROLE',target_id:role.role_id,
  state:role.state,
  reports_to_state:role.reports_to_state,
  engine_ids:[...role.engines],
  live_executable_verified:false
 }));
 return Object.freeze({
  schema:'cerebro.jarvis.command-network.v0',
  company_id:'GLOBAL',engine_id:'CONSOLE-001',environment:PREPROD,version:'CUT49',
  canonical_engine_count:engines.length,
  gateway_declared_engine_count:CONSOLE_ENGINES.size,
  legacy_binding_evidence_count:BINDINGS_BY_ENGINE.size,
  role_profile_count:roles.length,
  role_live_command_verified_count:0,
  full_universal_execution_verified:false,
  prod_authorized:false,prod_writes:false,trading_access:false,
  new_subscription_eur:0,
  engines,roles
 });
}

function normalizeVerifiedTarget(target){
 if(!target||typeof target!=='object'||Array.isArray(target))throw TypeError('verified target required');
 const id=target.target_id;
 const type=target.target_type;
 if(!validString(id)||!['ENGINE','ROLE'].includes(type)||forbidden(id))throw Error('TARGET_INVALID_OR_ISOLATED');
 if(type==='ENGINE'&&!ENGINES.has(id))throw Error('TARGET_NOT_IN_CANONICAL_REGISTRY');
 if(type==='ROLE'){
  const role=ROLES_BY_ID.get(id);
  if(!role||role.state==='PLAN_ONLY'||role.reports_to_state!=='RESOLVED')
   throw Error('ROLE_NOT_ROUTABLE_WITHOUT_REPORTING_EVIDENCE');
 }
 if(!validString(target.capability,256)||!validString(target.company_id)||!validString(target.evidence_ref,512))
  throw Error('VERIFIED_BINDING_MISSING_TRUSTED_FIELDS');
 if(target.environment!==PREPROD||target.prod_authorized!==false||
    target.trading_access!==false||target.additional_cost_eur!==0)
  throw Error('VERIFIED_BINDING_POLICY_REJECTED');
 if(target.permission!=='EXECUTE_PREPROD')throw Error('EXECUTION_PERMISSION_NOT_PRESENT');
 if(!['LOW','MEDIUM','HIGH'].includes(target.risk))throw Error('TARGET_RISK_INVALID');
 return Object.freeze({
  target_type:type,target_id:id,capability:target.capability,company_id:target.company_id,
  environment:PREPROD,permission:'EXECUTE_PREPROD',risk:target.risk,
  signature_required:target.signature_required===true,evidence_ref:target.evidence_ref
 });
}

/**
 * Reuses the existing Console V0 and ACTGW-001; creates no new worker,
 * daemon, queue or API. Default targets=[] means ZERO orders are executable.
 * The verified-target list must originate in trusted server configuration,
 * never model text or client payload. verifyOwner is mandatory and external;
 * "authorized:true" from a user payload is never accepted as proof.
 */
export function bindJarvisCommandNetworkV0({
 consoleGateway,actionGateway,verified_targets=[],verifyOwner
}={}){
 if(!consoleGateway||typeof consoleGateway.registerCommand!=='function'||
    consoleGateway.environment!==PREPROD)throw Error('PREPROD_CONSOLE_GATEWAY_REQUIRED');
 if(!actionGateway||typeof actionGateway.execute!=='function'||
    actionGateway.contract?.().environment!==PREPROD)throw Error('PREPROD_ACTION_GATEWAY_REQUIRED');
 if(!Array.isArray(verified_targets)||typeof verifyOwner!=='function')
  throw Error('EXPLICIT_VERIFIED_TARGETS_AND_OWNER_VERIFIER_REQUIRED');
 const targets=new Map();
 for(const raw of verified_targets){
  const target=normalizeVerifiedTarget(raw);
  if(targets.has(target.target_id))throw Error('DUPLICATE_TARGET_BINDING');
  targets.set(target.target_id,target);
 }
 const network=inspectJarvisCommandNetworkV0();
 consoleGateway.registerCommand('jarvis.network.inspect',async({context,payload})=>{
  if(!exactContext(context))return deny('POLICY_CONFLICT','PREPROD_CONTEXT_REQUIRED');
  // No sensitive client context, credentials, or inferred rights are exposed.
  if(payload?.target_id){
   const engine=network.engines.find(x=>x.target_id===payload.target_id);
   const role=network.roles.find(x=>x.target_id===payload.target_id);
   const item=engine??role;
   return item?{status:'CATALOG_ONLY',executed:false,target:jsonClone(item),
    physically_bound_for_this_session:targets.has(item.target_id)}
    :deny('TARGET_UNKNOWN','Target is absent from canonical catalog');
  }
  return {status:'CATALOG_ONLY',executed:false,
   canonical_engine_count:network.canonical_engine_count,
   gateway_declared_engine_count:network.gateway_declared_engine_count,
   role_profile_count:network.role_profile_count,
   command_targets_explicitly_bound:targets.size,
   universal_execution_verified:false,prod_authorized:false};
 });
 consoleGateway.registerCommand('jarvis.network.dispatch',async({context,payload})=>{
  if(!exactContext(context))return deny('POLICY_CONFLICT','PREPROD_CONTEXT_REQUIRED');
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return deny('INVALID','PAYLOAD_INVALID');
  const id=payload.target_id;
  if(!validString(id)||forbidden(id))return deny('POLICY_CONFLICT','TRADING_OR_TARGET_INVALID');
  if(!ENGINES.has(id)&&!ROLES_BY_ID.has(id))return deny('TARGET_UNKNOWN','NOT_IN_CANONICAL_REGISTRY');
  const target=targets.get(id);
  if(!target)return deny('TARGET_NOT_CONNECTED','EXPLICIT_TRUSTED_BINDING_REQUIRED');
  if(target.company_id!==context.company_id)return deny('POLICY_CONFLICT','CROSS_COMPANY_FORBIDDEN');
  if(!validString(payload.idempotency_key,256))return deny('INVALID','IDEMPOTENCY_REQUIRED');
  if(!payload.parameters||typeof payload.parameters!=='object'||Array.isArray(payload.parameters))
   return deny('INVALID','PARAMETERS_REQUIRED');
  if(payload.estimated_additional_cost_eur!==undefined&&payload.estimated_additional_cost_eur!==0)
   return {status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT',executed:false};
  // Never trust a client field claiming owner status, confirmation or role.
  let authorized=false;
  try{authorized=await verifyOwner({context:jsonClone(context),target:jsonClone(target),
   instruction:jsonClone({target_id:id,idempotency_key:payload.idempotency_key,
    parameters:payload.parameters})})===true}
  catch{return deny('AUTH_REQUIRED','OWNER_VERIFIER_UNAVAILABLE')}
  if(!authorized)return deny('AUTH_REQUIRED','VERIFIED_OWNER_SESSION_REQUIRED');
  const result=await actionGateway.execute({
   context:{company_id:context.company_id,engine_id:'ACTGW-001',
    environment:PREPROD,version:context.version},
   capability:target.capability,
   idempotency_key:payload.idempotency_key,
   payload:jsonClone(payload.parameters),
   authorized:true,
   risk:target.risk,
   estimated_additional_cost_eur:0,
   signature_required:target.signature_required,
   requires_prod_write:false,
   autonomous_prod:false,
   trading_access:false
  });
  if(result?.status==='HUMAN_REQUIRED'&&!HUMAN_REASONS.has(result.reason))
   throw Error('INVALID_HUMAN_GATE_FROM_ACTION_GATEWAY');
  return result;
 });
 return Object.freeze({
  status:'PREPROD_COMMAND_NETWORK_BOUND',
  canonical_engine_count:network.canonical_engine_count,
  role_profile_count:network.role_profile_count,
  command_targets_explicitly_bound:targets.size,
  production_dispatch_enabled:false,trading_dispatch_enabled:false,
  new_runtime_processes:0,new_subscriptions_eur:0
 });
}
