const HUMAN_REQUIRED_CODES=Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

export const INTENT_SOURCE_ORDER=Object.freeze([
  'FIRST_PARTY_AGGREGATED_ACCOUNT_SIGNALS','EXISTING_CRM_SIGNALS','PUBLIC_BUSINESS_SIGNALS','OPTIONAL_SALES_NAVIGATOR'
]);

export const COMPANY_INTENT_SIGNAL_WEIGHTS=Object.freeze({
  company_website_visit:15,
  repeat_company_visit:25,
  pricing_page_company_visit:35,
  public_hiring_signal:15,
  public_funding_signal:10
});

export const INTENT_SOURCE_DISPOSITIONS=Object.freeze([
  Object.freeze({item:69,source:'LinkedIn Sales Navigator',source_type:'PAID_OPTIONAL_SERVICE',mode:'OPTIONAL_EXISTING_LICENSE_ONLY_ROI_GATE',required_runtime_dependency:false,automatic_spend_allowed:false}),
  Object.freeze({item:70,source:'Gojiberry AI',source_type:'PAID_GTM_SERVICE',mode:'PATTERNS_ONLY_BUILD_ZERO_COST_EQUIVALENT',required_runtime_dependency:false,automatic_spend_allowed:false,outreach_imported:false}),
  Object.freeze({item:71,source:'MasLeads',source_type:'B2B_LEAD_SERVICE',mode:'CONCEPT_ONLY_BUILD_ZERO_COST_EQUIVALENT',required_runtime_dependency:false,automatic_spend_allowed:false,outreach_imported:false}),
  Object.freeze({item:72,source:'Pearl Diver',source_type:'PROSPECT_RESOLUTION_SERVICE',mode:'CONCEPT_ONLY_PRIVACY_GATED',required_runtime_dependency:false,person_resolution_imported:false}),
  Object.freeze({item:73,source:'getbeton/inspector',source_type:'OSS_REVENUE_INTELLIGENCE',license:'AGPL-3.0',mode:'LAB_BENCHMARK_PATTERNS_ONLY',required_runtime_dependency:false,external_code_execution:false})
]);

const SOURCE_FLAG=Object.freeze({
  FIRST_PARTY_AGGREGATED_ACCOUNT_SIGNALS:'first_party',
  EXISTING_CRM_SIGNALS:'crm',
  PUBLIC_BUSINESS_SIGNALS:'public_business',
  OPTIONAL_SALES_NAVIGATOR:'sales_navigator'
});
const SAFE_RESOLUTION_METHODS=new Set(['FIRST_PARTY_ACCOUNT_ID','EXPLICIT_FORM_COMPANY_DOMAIN','AUTHENTICATED_ACCOUNT_COMPANY']);
const FINGERPRINT_METHODS=new Set(['DEVICE_FINGERPRINT','CROSS_DEVICE_GRAPH','COOKIE_SYNC_IDENTITY_GRAPH']);

function req(value,label,max=300){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);const x=value.trim();if(x.length>max)throw new Error(`${label} too long`);return x;}
function validateContext(input){for(const key of ['company_id','engine_id','environment','version'])req(input?.[key],key);if(!['LAB','PREPROD','PROD'].includes(input.environment))throw new Error('environment invalid');}
function number(value,label,def=0){if(value==null||value==='')return def;const n=Number(value);if(!Number.isFinite(n)||n<0)throw new Error(`${label} invalid`);return n;}
function iso(value,label){const t=Date.parse(value);if(Number.isNaN(t))throw new Error(`${label} invalid`);return new Date(t).toISOString();}
function safe(value={}){return Object.freeze({...value,execution_authorized:false,outreach_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});}
function hold(reason,detail={}){return safe({status:'HOLD',reason,human_required:null,...detail});}
function blocked(reason,detail={}){return safe({status:'BLOCKED',reason,human_required:null,...detail});}
function human(reason,detail={}){if(!HUMAN_REQUIRED_CODES.includes(reason))throw new Error('non-canonical HUMAN_REQUIRED reason');return safe({status:'HUMAN_REQUIRED',reason,human_required:reason,...detail});}

export function planIntentSource(input={}){
  validateContext(input);
  if(input.environment==='PROD')return blocked('PROD_INTENT_NOT_AUTHORIZED');
  if(input.trading_requested===true)return blocked('TRADING_ISOLATION_DENIED');
  if(input.outreach_requested===true)return blocked('OUTREACH_OUT_OF_SCOPE');
  if(input.security_incident===true)return human('SECURITY_INCIDENT');
  if(input.customer_human_request===true)return human('CUSTOMER_HUMAN_REQUEST');
  if(input.risk==='HIGH')return human('HIGH_RISK');
  const available=input.available&&typeof input.available==='object'?input.available:{};
  const eligible=[];
  for(const source of INTENT_SOURCE_ORDER){
    if(available[SOURCE_FLAG[source]]!==true)continue;
    if(source==='OPTIONAL_SALES_NAVIGATOR'){
      const cfg=input.sales_navigator??{};
      const cost=number(cfg.incremental_cost_eur,'sales_navigator.incremental_cost_eur',0);
      if(cost>0)return human('MONEY_LIMIT',{estimated_incremental_cost_eur:cost,source});
      if(cfg.already_licensed!==true)return hold('SALES_NAVIGATOR_LICENSE_NOT_EXISTING');
      if(cfg.roi_evidence!==true)return hold('SALES_NAVIGATOR_ROI_EVIDENCE_REQUIRED');
    }
    eligible.push(source);
  }
  if(!eligible.length)return hold('NO_ZERO_COST_INTENT_SOURCE');
  return safe({status:'PLAN_READY',human_required:null,selected_source:eligible[0],fallback_chain:Object.freeze(eligible.slice(1)),source_order:INTENT_SOURCE_ORDER,company_level_only:true,write_mode:'NONE'});
}

function freshnessFactor(observedAt,now){
  const ageDays=(Date.parse(now)-Date.parse(observedAt))/86400000;
  if(ageDays<0||ageDays>30)return 0;
  if(ageDays<=7)return 1;
  return 0.5;
}

export function scoreCompanyIntent(input={}){
  validateContext(input);
  if(input.environment==='PROD')return blocked('PROD_INTENT_NOT_AUTHORIZED');
  const account=req(input.account_id,'account_id');
  const now=iso(input.now??new Date().toISOString(),'now');
  if(!Array.isArray(input.signals))throw new Error('signals array required');
  const accepted=[];
  for(const signal of input.signals){
    if(!signal||typeof signal!=='object'||Array.isArray(signal))continue;
    const type=req(signal.type,'signal.type',100);
    if(!Object.hasOwn(COMPANY_INTENT_SIGNAL_WEIGHTS,type))throw new Error(`signal type denied:${type}`);
    const evidence=req(signal.evidence_ref,'signal.evidence_ref',500);
    const observedAt=iso(signal.observed_at,'signal.observed_at');
    const factor=freshnessFactor(observedAt,now);
    if(factor===0)continue;
    accepted.push(Object.freeze({type,observed_at:observedAt,evidence_ref:evidence,weight:COMPANY_INTENT_SIGNAL_WEIGHTS[type],freshness_factor:factor}));
  }
  if(!accepted.length)return hold('NO_FRESH_EVIDENCED_COMPANY_SIGNALS',{account_id:account,score:0,evidence_count:0,person_level_signal_used:false});
  const strongestByType=new Map();
  for(const signal of accepted){const score=signal.weight*signal.freshness_factor;const prior=strongestByType.get(signal.type);if(!prior||score>prior.score)strongestByType.set(signal.type,{score,signal});}
  const score=Math.min(100,Math.round([...strongestByType.values()].reduce((sum,x)=>sum+x.score,0)));
  const evidence=[...new Set(accepted.map(x=>x.evidence_ref))];
  return safe({
    status:'SCORED',human_required:null,account_id:account,score,
    classification:score>=70?'HIGH_INTENT':score>=40?'MEDIUM_INTENT':'LOW_INTENT',
    evidence_count:evidence.length,evidence_refs:Object.freeze(evidence),accepted_signals:Object.freeze(accepted),
    person_level_signal_used:false,device_fingerprinting_used:false,observed_at:now
  });
}

export function planVisitorCompanyResolution(input={}){
  validateContext(input);
  if(input.environment==='PROD')return blocked('PROD_VISITOR_RESOLUTION_NOT_AUTHORIZED');
  if(input.outreach_requested===true)return blocked('OUTREACH_OUT_OF_SCOPE');
  const method=req(input.resolution_method,'resolution_method',120);
  if(FINGERPRINT_METHODS.has(method))return blocked('FINGERPRINTING_OR_COVERT_RESOLUTION_DENIED',{resolution_method:method});
  if(input.person_resolution_requested===true||method==='PERSON_IDENTITY_GRAPH'||method==='PERSON_LEVEL_DEANONYMIZATION')return human('LEGAL_REQUIRED',{decision:'PERSON_LEVEL_VISITOR_RESOLUTION_REQUIRES_LEGAL_PRIVACY_REVIEW',resolution_method:method});
  if(method==='THIRD_PARTY_ANONYMOUS_VISITOR_RESOLUTION')return human('LEGAL_REQUIRED',{decision:'THIRD_PARTY_VISITOR_RESOLUTION_REQUIRES_LEGAL_PRIVACY_REVIEW',resolution_method:method});
  if(!SAFE_RESOLUTION_METHODS.has(method))return hold('RESOLUTION_METHOD_NOT_APPROVED',{resolution_method:method});
  if(input.consent_or_first_party_basis!==true)return human('LEGAL_REQUIRED',{decision:'LAWFUL_FIRST_PARTY_BASIS_REQUIRED',resolution_method:method});
  if(method==='EXPLICIT_FORM_COMPANY_DOMAIN')req(input.company_domain,'company_domain',255);
  return safe({
    status:'PLAN_READY',human_required:null,resolution_method:method,resolution_level:'COMPANY_ONLY',
    company_domain:input.company_domain?req(input.company_domain,'company_domain',255):null,
    fingerprinting_allowed:false,cross_device_graph_allowed:false,person_resolution_allowed:false,
    evidence_required:true,write_mode:'NONE'
  });
}

export const COMPANY_INTENT_RESOLUTION_PROFILE_V1_CONTRACT=Object.freeze({
  schema_version:'1.0.0',state_type:'CEREBRO_COMPANY_INTENT_RESOLUTION_PROFILE_V1',
  company_scope:'MULTIEMPRESA_CONTEXT_REQUIRED',engine_id:'LEAD-001',supporting_engines:Object.freeze(['CAP-001','CRM-001','RSH-001','ROUTE-001','IAM-001']),
  environment:'PREPROD',version:'1.0.0',human_required_codes:HUMAN_REQUIRED_CODES,
  source_order:INTENT_SOURCE_ORDER,company_level_default:true,person_resolution_default:false,
  device_fingerprinting_allowed:false,cross_device_identity_graph_allowed:false,covert_deanonymization_allowed:false,
  outreach_authorized:false,crm_write_authorized:false,automatic_paid_fallback:false,silent_spend_allowed:false,
  auth_bypass_allowed:false,captcha_bypass_allowed:false,mfa_bypass_allowed:false,anti_abuse_evasion_allowed:false,
  external_provider_runtime_required:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,
  additional_cost_target_eur:0,next_gate:'COMPANY_INTENT_RESOLUTION_PREPROD_VERIFICATION'
});
