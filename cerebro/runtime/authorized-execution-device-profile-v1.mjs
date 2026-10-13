import {HUMAN_REQUIRED_CODES,stableIdempotencyKey,validateCanonicalContext} from './continuous-improvement-contract.mjs';
import {evaluateBrowserAttestation} from '../governance/identity-session-lifecycle.mjs';

const ENVIRONMENT='PREPROD';
const ZERO_AUTHORITY=Object.freeze({
  prod_authorized:false,prod_write_authorized:false,execution_authorized:false,trading_access:false,
  multicompany_continuation:false,additional_cost_eur:0
});

export const EXECUTION_ROUTE_ORDER=Object.freeze([
  'OFFICIAL_API','AUTHORIZED_MCP','LOCAL_SCRIPT','BROWSER_BRIDGE','COMPUTER_USE','VISION_FALLBACK'
]);

export const DEVICE_ROUTE_ORDER=Object.freeze([
  'ANDROID_INTENT_API','ACCESSIBILITY_SEMANTIC','DEVICE_BRIDGE','DETERMINISTIC_REPLAY','VISION_FALLBACK'
]);

export const AUTHORIZED_EXECUTION_DEVICE_SOURCES=Object.freeze([
  Object.freeze({item:38,source:'CEREBRO_IAM_001',license:'INTERNAL',mode:'REUSE_IDENTITY_SERVICE_ACCOUNT_SCOPES',status:'EXISTENTE',execution:'INTERNAL_ONLY'}),
  Object.freeze({item:39,source:'CEREBRO_IAM_001_EXTERNAL_SECRET_REFERENCES',license:'INTERNAL',mode:'REUSE_EXISTING_SECRET_STORES_NO_NEW_VAULT',status:'PARCIAL',execution:'INTERNAL_ONLY'}),
  Object.freeze({item:40,source:'CEREBRO_IAM_001_SCOPED_PERMISSIONS',license:'INTERNAL',mode:'FAIL_CLOSED_STANDING_PERMISSION_SCOPES',status:'EXISTENTE',execution:'INTERNAL_ONLY'}),
  Object.freeze({item:41,source:'CEREBRO_IAM_001_SESSION_LIFECYCLE',license:'INTERNAL',mode:'REUSE_LIFECYCLE_AND_RENEWAL_EVIDENCE',status:'EXISTENTE',execution:'INTERNAL_ONLY'}),
  Object.freeze({item:42,source:'CEREBRO_ROUTE_001',license:'INTERNAL',mode:'API_MCP_SCRIPT_BROWSER_LADDER_OVER_EXISTING_ROUTER',status:'EXISTENTE',execution:'INTERNAL_ONLY'}),
  Object.freeze({item:43,source:'CEREBRO_BROWSER_BRIDGE',license:'INTERNAL',mode:'FRESH_ATTESTATION_FALLBACK_ONLY',status:'PARCIAL',execution:'ATTESTED_LAB_PREPROD_ONLY'}),
  Object.freeze({item:44,source:'lsdefine/GenericAgent',license:'MIT',mode:'LAB_BENCHMARK_UNIQUE_PATTERNS_ONLY',status:'LAB_REFERENCE',execution:'DISABLED'}),
  Object.freeze({item:45,source:'daijro/camoufox',license:'MPL-2.0_BROWSER_MIT_LAUNCHERS',mode:'AUTHORIZED_COMPATIBILITY_RESEARCH_ONLY',status:'HOLD_RUNTIME',execution:'DISABLED',anti_abuse_evasion_allowed:false,captcha_bypass_allowed:false,mfa_bypass_allowed:false}),
  Object.freeze({item:46,source:'withneural/neuralagent',license:'MIT',mode:'WATCH_LEARN_REPLAY_PATTERNS_ONLY',status:'LAB_REFERENCE',execution:'DISABLED'}),
  Object.freeze({item:47,source:'CEREBRO_QA_LRN_DETERMINISTIC_REPLAY',license:'INTERNAL',mode:'DEMONSTRATE_VERIFY_FREEZE_REPLAY_WITH_EVIDENCE',status:'DEFINIDO',execution:'INTERNAL_ONLY'}),
  Object.freeze({item:48,source:'CEREBRO_ANDROID_DEVICE_WORKER',license:'INTERNAL',mode:'INTENT_ACCESSIBILITY_BRIDGE_REPLAY_VISION',status:'DEFINIDO',execution:'LAB_PREPROD_ONLY'}),
  Object.freeze({item:49,source:'tokenarc/open-jarvis',license:'MIT',mode:'ANDROID_ACCESSIBILITY_LOCAL_FIRST_BENCHMARK_ONLY',status:'LAB_REFERENCE',execution:'DISABLED'}),
  Object.freeze({item:50,source:'YifeiZhou02/ArCHer',license:'MIT',mode:'HIERARCHICAL_AGENT_TRAINING_BENCHMARK_ONLY',status:'LAB_REFERENCE',execution:'DISABLED'})
]);

function safe(value){return Object.freeze({...value,...ZERO_AUTHORITY});}
function unique(values){return [...new Set(values)];}
function routeCost(route){const value=Number(route?.incremental_cost_eur??0);return Number.isFinite(value)&&value>=0?value:Infinity;}
function routeRank(routeClass,order){return order.indexOf(String(routeClass??'').toUpperCase());}
function human(reason,detail={}){
  if(!HUMAN_REQUIRED_CODES.includes(reason)) throw new Error(`invalid HUMAN_REQUIRED reason:${reason}`);
  return safe({decision:'HUMAN_REQUIRED',human_required:reason,...detail});
}
function hold(reason,detail={}){return safe({decision:'HOLD',human_required:null,reason,...detail});}
function normalizedContext(input){
  return {
    company_id:input?.company_id??'fenix',engine_id:input?.engine_id??'AUTO-001',
    environment:String(input?.environment??ENVIRONMENT).toUpperCase(),version:input?.version??'1.0.0'
  };
}
function validateZeroCostRoutes(routes,order){
  const diagnostics=[];const eligible=[];
  for(const route of Array.isArray(routes)?routes:[]){
    const routeClass=String(route?.route_class??'').toUpperCase();const rank=routeRank(routeClass,order);const cost=routeCost(route);
    if(rank<0){diagnostics.push({route_class:routeClass||null,reason:'UNKNOWN_ROUTE_CLASS'});continue;}
    if(route?.available!==true){diagnostics.push({route_class:routeClass,reason:'UNAVAILABLE'});continue;}
    if(!Number.isFinite(cost)){diagnostics.push({route_class:routeClass,reason:'INVALID_COST'});continue;}
    if(cost>0){diagnostics.push({route_class:routeClass,reason:'NON_ZERO_COST',incremental_cost_eur:cost});continue;}
    eligible.push({route_class:routeClass,rank});
  }
  eligible.sort((a,b)=>a.rank-b.rank||a.route_class.localeCompare(b.route_class));
  return {eligible,diagnostics};
}
function paidFallbackCost(routes){
  const costs=(Array.isArray(routes)?routes:[]).filter(route=>route?.available===true).map(routeCost).filter(cost=>Number.isFinite(cost)&&cost>0);
  return costs.length?Math.min(...costs):null;
}

export function authorizedExecutionDeviceProfile(){
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_AUTHORIZED_EXECUTION_DEVICE_PROFILE_V1',company_id:'fenix',
    environment:ENVIRONMENT,version:'1.0.0',supporting_engines:Object.freeze(['IAM-001','ROUTE-001','AUTO-001','QA-001','LRN-001']),
    human_required_codes:Object.freeze([...HUMAN_REQUIRED_CODES]),execution_route_order:EXECUTION_ROUTE_ORDER,
    device_route_order:DEVICE_ROUTE_ORDER,sources:AUTHORIZED_EXECUTION_DEVICE_SOURCES,new_engine_required:false,
    external_code_execution:false,browser_fallback_only:true,device_fallback_only:true,captcha_bypass_allowed:false,
    mfa_bypass_allowed:false,anti_abuse_evasion_allowed:false,secret_values_allowed:false,...ZERO_AUTHORITY
  });
}

export function classifyAuthChallenge({kind='UNKNOWN'}={}){
  const challenge=String(kind).toUpperCase();
  if(['MFA_REQUIRED','LOGIN_REQUIRED','CAPTCHA_REQUIRED','SESSION_EXPIRED','CONSENT_REQUIRED'].includes(challenge)){
    return safe({decision:'ACTION_REQUIRED',challenge,human_required:null,bypass_allowed:false,resume_same_job:true});
  }
  if(challenge==='SECURITY_INCIDENT') return human('SECURITY_INCIDENT',{challenge,bypass_allowed:false,resume_same_job:false});
  return hold('UNKNOWN_AUTH_CHALLENGE',{challenge,bypass_allowed:false,resume_same_job:false});
}

export function planAuthorizedExecution(input={},options={}){
  const context=normalizedContext(input);const check=validateCanonicalContext(context,{allowProd:false});
  const blockers=[...check.errors];
  if(context.company_id!=='fenix') blockers.push('company_scope_denied');
  if(input.trading_access===true||input.trading_requested===true) blockers.push('trading_isolation_required');
  if(input.prod_write===true||input.prod_write_requested===true) blockers.push('prod_write_not_authorized');
  if(blockers.length) return safe({...context,decision:'HOLD',blockers:unique(blockers),human_required:null});
  if(String(input.risk??'LOW').toUpperCase()==='HIGH') return human('HIGH_RISK',context);
  if(input.legal_required===true) return human('LEGAL_REQUIRED',context);
  if(input.signature_required===true) return human('SIGNATURE_REQUIRED',context);
  if(input.policy_conflict===true) return human('POLICY_CONFLICT',context);
  if(input.security_incident===true) return human('SECURITY_INCIDENT',context);
  if(input.customer_human_request===true) return human('CUSTOMER_HUMAN_REQUEST',context);
  const confidence=Number(input.confidence??1);
  if(!Number.isFinite(confidence)||confidence<0||confidence>1) return hold('INVALID_CONFIDENCE',{...context});
  if(confidence<0.6) return human('LOW_CONFIDENCE',{...context,confidence});

  const routes=Array.isArray(input.routes)?input.routes:[];
  const {eligible,diagnostics}=validateZeroCostRoutes(routes,EXECUTION_ROUTE_ORDER);
  if(!eligible.length){
    const paidCost=paidFallbackCost(routes);
    if(paidCost!=null) return human('MONEY_LIMIT',{...context,estimated_incremental_cost_eur:paidCost,diagnostics:Object.freeze(diagnostics)});
    return hold('HOLD_NO_ZERO_COST_ROUTE',{...context,diagnostics:Object.freeze(diagnostics)});
  }

  const browserClasses=new Set(['BROWSER_BRIDGE','COMPUTER_USE','VISION_FALLBACK']);
  const filtered=[];let browserStatus=null;
  for(const route of eligible){
    if(!browserClasses.has(route.route_class)){filtered.push(route);continue;}
    const attestation=evaluateBrowserAttestation(input.browser_attestation??null,{now:options.now??new Date().toISOString()});
    browserStatus=attestation.status;
    if(attestation.status==='BROWSER_SESSION_BINDING_HEALTHY') filtered.push(route);
    else diagnostics.push({route_class:route.route_class,reason:attestation.status});
  }
  if(!filtered.length&&eligible.some(x=>browserClasses.has(x.route_class))){
    return safe({...context,decision:'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT',human_required:null,browser_binding_status:browserStatus??'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT',diagnostics:Object.freeze(diagnostics)});
  }
  if(!filtered.length) return hold('HOLD_NO_ZERO_COST_ROUTE',{...context,diagnostics:Object.freeze(diagnostics)});
  filtered.sort((a,b)=>a.rank-b.rank||a.route_class.localeCompare(b.route_class));
  const selected=filtered[0];
  const result={...context,decision:'ROUTE',human_required:null,selected_route_class:selected.route_class,
    fallback_chain:Object.freeze(filtered.slice(1).map(x=>x.route_class)),diagnostics:Object.freeze(diagnostics),
    browser_binding_status:browserClasses.has(selected.route_class)?browserStatus:null,selection_reason:'FIRST_ELIGIBLE_ZERO_COST_ROUTE'};
  return Object.freeze({...safe(result),plan_id:stableIdempotencyKey(result)});
}

export function planDeviceExecution(input={}){
  const context=normalizedContext(input);const check=validateCanonicalContext(context,{allowProd:false});const blockers=[...check.errors];
  if(context.company_id!=='fenix') blockers.push('company_scope_denied');
  if(String(input.device_platform??'').toUpperCase()!=='ANDROID') blockers.push('android_device_worker_only');
  if(input.trading_access===true||input.trading_requested===true) blockers.push('trading_isolation_required');
  if(input.prod_write===true||input.prod_write_requested===true) blockers.push('prod_write_not_authorized');
  if(blockers.length) return safe({...context,decision:'HOLD',blockers:unique(blockers),human_required:null});
  if(String(input.risk??'LOW').toUpperCase()==='HIGH') return human('HIGH_RISK',context);
  const routes=Array.isArray(input.routes)?input.routes:[];
  const {eligible,diagnostics}=validateZeroCostRoutes(routes,DEVICE_ROUTE_ORDER);
  if(!eligible.length){
    const paidCost=paidFallbackCost(routes);
    if(paidCost!=null) return human('MONEY_LIMIT',{...context,estimated_incremental_cost_eur:paidCost,diagnostics:Object.freeze(diagnostics)});
    return hold('HOLD_NO_ZERO_COST_DEVICE_ROUTE',{...context,diagnostics:Object.freeze(diagnostics)});
  }
  const selected=eligible[0];const result={...context,decision:'ROUTE',human_required:null,device_platform:'ANDROID',
    selected_route_class:selected.route_class,fallback_chain:Object.freeze(eligible.slice(1).map(x=>x.route_class)),
    diagnostics:Object.freeze(diagnostics),selection_reason:'FIRST_ELIGIBLE_ZERO_COST_DEVICE_ROUTE'};
  return Object.freeze({...safe(result),plan_id:stableIdempotencyKey(result)});
}

export function sourceDisposition(item){
  const found=AUTHORIZED_EXECUTION_DEVICE_SOURCES.find(entry=>entry.item===item);
  if(!found) return safe({decision:'HOLD_UNKNOWN_SOURCE',item,human_required:null});
  return found;
}
