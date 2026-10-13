import crypto from 'node:crypto';

const HUMAN_REQUIRED_CODES=Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

export const LEAD_DISCOVERY_ROUTE_ORDER=Object.freeze([
  'FIRST_PARTY_INBOUND','EXISTING_CRM','OFFICIAL_PUBLIC_BUSINESS_SOURCE','WEB_ACQUISITION_PROFILE'
]);

export const LEAD_ENRICHMENT_WATERFALL=Object.freeze([
  'NORMALIZE_COMPANY','DOMAIN_AND_WEBSITE','PUBLIC_FIRMOGRAPHICS','PUBLIC_BUSINESS_CHANNELS','EVIDENCE_AND_FRESHNESS','ICP_SCORE'
]);

export const LEAD_EXTERNAL_SOURCE_DISPOSITIONS=Object.freeze([
  Object.freeze({item:66,source:'Clay',source_type:'COMMERCIAL_SERVICE',mode:'PATTERNS_OPTIONAL_CONNECTOR',required_runtime_dependency:false,automatic_spend_allowed:false,personal_contact_enrichment_default:false}),
  Object.freeze({item:67,source:'PhantomBuster',source_type:'COMMERCIAL_SERVICE_WITH_LIMITED_FREE_PLAN',mode:'BENCHMARK_ONLY',required_runtime_dependency:false,automatic_spend_allowed:false,automated_outreach_allowed:false,captcha_capability_allowed:false}),
  Object.freeze({item:68,source:'Octoparse',source_type:'COMMERCIAL_SERVICE_WITH_FREE_LOCAL_PLAN',mode:'FALLBACK_BENCHMARK_FREE_LOCAL_ONLY',required_runtime_dependency:false,automatic_spend_allowed:false,captcha_capability_allowed:false})
]);

const SOURCE_FLAG=Object.freeze({
  FIRST_PARTY_INBOUND:'first_party_inbound',
  EXISTING_CRM:'existing_crm',
  OFFICIAL_PUBLIC_BUSINESS_SOURCE:'official_public_business_source',
  WEB_ACQUISITION_PROFILE:'web_acquisition'
});

const ICP_ALLOWED=Object.freeze(['sectors','locations','employee_bands','business_models','required_signals']);
const ICP_DENIED=new Set([
  'age','birth_date','gender','sex','sexual_orientation','religion','race','ethnicity','political_views','political_affiliation',
  'union_membership','health','disability','criminal_history','biometric','genetic','marital_status','pregnancy','national_origin'
]);

function req(value,label,max=300){
  if(typeof value!=='string'||!value.trim()) throw new Error(`${label} required`);
  const x=value.trim(); if(x.length>max) throw new Error(`${label} too long`); return x;
}
function validateContext(input){
  for(const key of ['company_id','engine_id','environment','version']) req(input?.[key],key);
  if(!['LAB','PREPROD','PROD'].includes(input.environment)) throw new Error('environment invalid');
}
function finiteNonNegative(value,label){const n=Number(value??0);if(!Number.isFinite(n)||n<0)throw new Error(`${label} invalid`);return n;}
function safe(value={}){
  return Object.freeze({...value,execution_authorized:false,outreach_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
}
function hold(reason,detail={}){return safe({status:'HOLD',reason,human_required:null,...detail});}
function blocked(reason,detail={}){return safe({status:'BLOCKED',reason,human_required:null,...detail});}
function human(reason,detail={}){
  if(!HUMAN_REQUIRED_CODES.includes(reason)) throw new Error('non-canonical HUMAN_REQUIRED reason');
  return safe({status:'HUMAN_REQUIRED',reason,human_required:reason,...detail});
}
function normalizeText(value){return String(value??'').trim().toLowerCase().replace(/\s+/g,' ');}
function normalizeDomain(value){
  const raw=String(value??'').trim(); if(!raw)return '';
  try{const u=new URL(raw.includes('://')?raw:`https://${raw}`);return u.hostname.toLowerCase().replace(/^www\./,'');}catch{return raw.toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/.*$/,'');}
}
function uniq(values){return [...new Set(values)];}

export function planLeadDiscovery(input={}){
  validateContext(input);
  if(input.environment==='PROD') return blocked('PROD_DISCOVERY_NOT_AUTHORIZED');
  if(input.trading_requested===true) return blocked('TRADING_ISOLATION_DENIED');
  if(input.outreach_requested===true) return blocked('OUTREACH_OUT_OF_SCOPE');
  if(input.security_incident===true) return human('SECURITY_INCIDENT');
  if(input.customer_human_request===true) return human('CUSTOMER_HUMAN_REQUEST');
  if(input.signature_required===true) return human('SIGNATURE_REQUIRED');
  if(input.policy_conflict===true) return human('POLICY_CONFLICT');
  if(input.risk==='HIGH') return human('HIGH_RISK');
  if(input.personal_data_requested===true||input.person_level_contact_enrichment===true) return human('LEGAL_REQUIRED',{decision:'PERSON_LEVEL_DATA_REQUIRES_LEGAL_BASIS_REVIEW'});
  if(input.legal_required===true) return human('LEGAL_REQUIRED');
  if(input.authorized_business_research!==true) return hold('BUSINESS_RESEARCH_AUTHORIZATION_REQUIRED');
  const cost=finiteNonNegative(input.estimated_incremental_cost_eur,'estimated_incremental_cost_eur');
  if(cost>0) return human('MONEY_LIMIT',{estimated_incremental_cost_eur:cost,decision:'ZERO_COST_ONLY'});
  const sources=input.sources&&typeof input.sources==='object'?input.sources:{};
  const eligible=LEAD_DISCOVERY_ROUTE_ORDER.filter(route=>sources[SOURCE_FLAG[route]]===true);
  if(eligible.length===0) return hold('NO_ZERO_COST_DISCOVERY_SOURCE');
  return safe({
    status:'PLAN_READY',human_required:null,purpose:req(input.purpose??'B2B_LEAD_DISCOVERY','purpose'),
    selected_route:eligible[0],fallback_chain:Object.freeze(eligible.slice(1)),route_order:LEAD_DISCOVERY_ROUTE_ORDER,
    business_entity_only:true,personal_data_requested:false,write_mode:'NONE',dedupe_required:true,evidence_required:true
  });
}

function normalizedCriteria(criteria){
  if(!criteria||typeof criteria!=='object'||Array.isArray(criteria)) throw new Error('criteria required');
  for(const key of Object.keys(criteria)){
    if(ICP_DENIED.has(key)) throw new Error(`criterion denied:${key}`);
    if(!ICP_ALLOWED.includes(key)) throw new Error(`criterion denied:${key}`);
    if(!Array.isArray(criteria[key])) throw new Error(`criterion invalid:${key}`);
  }
  return Object.fromEntries(ICP_ALLOWED.map(key=>[key,Object.freeze(uniq((criteria[key]??[]).map(normalizeText).filter(Boolean)))]));
}

export function buildIcpDefinition(input={}){
  validateContext(input);
  if(input.environment==='PROD') return blocked('PROD_ICP_DEFINITION_NOT_AUTHORIZED');
  const criteria=normalizedCriteria(input.criteria);
  const canonical={company_id:input.company_id,engine_id:input.engine_id,environment:input.environment,version:input.version,criteria};
  const icp_id=crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  return safe({status:'ICP_DEFINED',human_required:null,icp_id,criteria,personal_or_protected_attributes_used:false,firmographic_only:true});
}

function matchOne(value,allowed){return allowed.length===0?null:allowed.includes(normalizeText(value));}
export function scoreCompanyAgainstIcp({definition,candidate}={}){
  if(definition?.status!=='ICP_DEFINED'||!definition.criteria) throw new Error('valid ICP definition required');
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate)) throw new Error('candidate required');
  const c=definition.criteria;
  const checks=[];
  for(const [key,field] of [['sectors','sector'],['locations','location'],['employee_bands','employee_band'],['business_models','business_model']]){
    const matched=matchOne(candidate[field],c[key]); if(matched!==null) checks.push(matched);
  }
  if(c.required_signals.length){
    const signals=new Set((candidate.signals??[]).map(normalizeText));
    for(const signal of c.required_signals) checks.push(signals.has(signal));
  }
  const score=checks.length?Math.round(checks.filter(Boolean).length/checks.length*100):0;
  const evidence=Array.isArray(candidate.evidence_refs)?uniq(candidate.evidence_refs.map(String).filter(Boolean)):[];
  return safe({
    status:evidence.length?'SCORED':'HOLD',human_required:null,reason:evidence.length?null:'EVIDENCE_REQUIRED',
    score,classification:score>=80?'ICP_STRONG_MATCH':score>=60?'ICP_POSSIBLE_MATCH':'ICP_WEAK_MATCH',
    evidence_count:evidence.length,evidence_refs:Object.freeze(evidence),personal_or_protected_attributes_used:false
  });
}

export function planLeadEnrichment(input={}){
  validateContext(input);
  if(input.environment==='PROD') return blocked('PROD_ENRICHMENT_NOT_AUTHORIZED');
  if(input.personal_data_requested===true||input.person_level_contact_enrichment===true) return human('LEGAL_REQUIRED',{decision:'PERSON_LEVEL_DATA_REQUIRES_LEGAL_BASIS_REVIEW'});
  if(input.outreach_requested===true) return blocked('OUTREACH_OUT_OF_SCOPE');
  const cost=finiteNonNegative(input.estimated_incremental_cost_eur,'estimated_incremental_cost_eur');
  if(cost>0) return human('MONEY_LIMIT',{estimated_incremental_cost_eur:cost});
  if(!input.candidate||typeof input.candidate!=='object'||Array.isArray(input.candidate)) return hold('LEAD_CANDIDATE_REQUIRED');
  const allowedFields=new Set(['domain','website','sector','location','employee_band','business_model','public_phone','public_business_email','public_social_url','registry_id']);
  const requested=uniq((input.available_zero_cost_fields??[]).map(String));
  const denied=requested.filter(x=>!allowedFields.has(x));
  if(denied.length) return hold('ENRICHMENT_FIELD_NOT_ALLOWED',{denied_fields:Object.freeze(denied)});
  return safe({
    status:'PLAN_READY',human_required:null,waterfall:LEAD_ENRICHMENT_WATERFALL,
    candidate_key:leadKey(input.candidate),requested_zero_cost_fields:Object.freeze(requested),
    personal_data_enrichment:false,email_guessing_allowed:false,phone_guessing_allowed:false,
    provenance_required:true,freshness_required:true,write_mode:'NONE'
  });
}

function leadKey(candidate){
  const identity={domain:normalizeDomain(candidate?.domain??candidate?.website),company_name:normalizeText(candidate?.company_name),location:normalizeText(candidate?.location)};
  return crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex');
}

export function dedupeLeadCandidates(candidates=[]){
  if(!Array.isArray(candidates)) throw new Error('candidates array required');
  const map=new Map();
  for(const row of candidates){
    if(!row||typeof row!=='object'||Array.isArray(row)) continue;
    const key=leadKey(row); const evidence=uniq((row.evidence_refs??[]).map(String).filter(Boolean));
    if(!map.has(key)) map.set(key,{...row,lead_key:key,evidence_refs:evidence});
    else {
      const prev=map.get(key);
      map.set(key,{...prev,...row,company_name:prev.company_name??row.company_name,domain:prev.domain??row.domain,location:prev.location??row.location,lead_key:key,evidence_refs:uniq([...(prev.evidence_refs??[]),...evidence])});
    }
  }
  return Object.freeze([...map.values()].map(x=>Object.freeze({...x,evidence_refs:Object.freeze([...(x.evidence_refs??[])])})));
}

export const LEAD_DISCOVERY_ENRICHMENT_PROFILE_V1_CONTRACT=Object.freeze({
  schema_version:'1.0.0',state_type:'CEREBRO_LEAD_DISCOVERY_ENRICHMENT_PROFILE_V1',
  company_scope:'MULTIEMPRESA_CONTEXT_REQUIRED',engine_id:'CAP-001',supporting_engines:Object.freeze(['LEAD-001','CRM-001','MKT-001','RSH-001','ROUTE-001','IAM-001']),
  environment:'PREPROD',version:'1.0.0',human_required_codes:HUMAN_REQUIRED_CODES,
  discovery_route_order:LEAD_DISCOVERY_ROUTE_ORDER,enrichment_waterfall:LEAD_ENRICHMENT_WATERFALL,
  business_entity_first:true,person_level_enrichment_default:false,protected_attribute_inference_allowed:false,
  email_guessing_allowed:false,phone_guessing_allowed:false,outreach_authorized:false,crm_write_authorized:false,
  auth_bypass_allowed:false,captcha_bypass_allowed:false,mfa_bypass_allowed:false,anti_abuse_evasion_allowed:false,
  automatic_paid_fallback:false,silent_spend_allowed:false,new_paid_subscription_required:false,
  external_provider_runtime_required:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,
  additional_cost_target_eur:0,next_gate:'LEAD_DISCOVERY_ENRICHMENT_PREPROD_VERIFICATION'
});
