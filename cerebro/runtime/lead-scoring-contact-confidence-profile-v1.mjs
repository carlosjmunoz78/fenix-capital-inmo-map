const HUMAN_REQUIRED_CODES=Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

export const URGENCY_EVENT_WEIGHTS=Object.freeze({
  APPLICATION_STARTED:40,
  CONTACT_REQUEST:35,
  FORM_SUBMISSION:30,
  REPEAT_VISIT:20,
  RECENT_PUBLIC_BUSINESS_TRIGGER:15
});

export const VERIFICATION_SOURCE_DISPOSITIONS=Object.freeze([
  Object.freeze({
    item:90,source:'verifio-email/verifio',source_type:'PUBLIC_REPOSITORY',mode:'HOLD_LICENSE_CONFLICT_PATTERNS_ONLY',
    required_runtime_dependency:false,external_code_execution:false,automatic_spend_allowed:false,
    evidence:'README claims MIT but repository LICENSE contains Apache-2.0 text plus additional commercial/hosting restrictions; do not copy or execute until license is reconciled'
  }),
  Object.freeze({item:91,source:'LOCAL_PASSIVE_EMAIL_SIGNALS',source_type:'INTERNAL_DETERMINISTIC',mode:'PREFERRED_ZERO_COST',required_runtime_dependency:false,active_smtp_probe_authorized:false,email_send_authorized:false}),
  Object.freeze({item:92,source:'LOCAL_PHONE_NORMALIZATION',source_type:'INTERNAL_DETERMINISTIC',mode:'PREFERRED_ZERO_COST',required_runtime_dependency:false,carrier_lookup_authorized:false,person_lookup_authorized:false})
]);

const APPROVED_CONTACT_BASES=new Set(['FIRST_PARTY_EXPLICIT','PUBLIC_BUSINESS_CONTACT','EXISTING_CRM_WITH_BASIS']);
const ALLOWED_SMTP_EVIDENCE=new Set(['UNKNOWN','ACCEPTED_NON_SENDING','REJECTED_NON_SENDING','TEMPORARY_FAILURE']);

function req(value,label,max=500){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);const x=value.trim();if(x.length>max)throw new Error(`${label} too long`);return x;}
function validateContext(input){for(const key of ['company_id','engine_id','environment','version'])req(input?.[key],key);if(!['LAB','PREPROD','PROD'].includes(input.environment))throw new Error('environment invalid');}
function boundedScore(value,label){const n=Number(value);if(!Number.isFinite(n)||n<0||n>100)throw new Error(`${label} invalid`);return Math.round(n);}
function finiteNonNegative(value,label,def=0){if(value==null||value==='')return def;const n=Number(value);if(!Number.isFinite(n)||n<0)throw new Error(`${label} invalid`);return n;}
function iso(value,label){const t=Date.parse(value);if(Number.isNaN(t))throw new Error(`${label} invalid`);return new Date(t).toISOString();}
function uniq(values){return [...new Set((values??[]).map(String).filter(Boolean))];}
function round(value,places=4){const p=10**places;return Math.round(value*p)/p;}
function safe(value={}){return Object.freeze({...value,execution_authorized:false,outreach_authorized:false,crm_write_authorized:false,money_action_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});}
function hold(reason,detail={}){return safe({status:'HOLD',reason,human_required:null,...detail});}
function blocked(reason,detail={}){return safe({status:'BLOCKED',reason,human_required:null,...detail});}
function human(reason,detail={}){if(!HUMAN_REQUIRED_CODES.includes(reason))throw new Error('non-canonical HUMAN_REQUIRED reason');return safe({status:'HUMAN_REQUIRED',reason,human_required:reason,...detail});}
function prodOrPolicyGate(input,scope){
  if(input.environment==='PROD')return blocked(`PROD_${scope}_NOT_AUTHORIZED`);
  if(input.trading_requested===true)return blocked('TRADING_ISOLATION_DENIED');
  if(input.outreach_requested===true)return blocked('OUTREACH_OUT_OF_SCOPE');
  if(input.crm_write_requested===true)return blocked('CRM_WRITE_NOT_AUTHORIZED');
  if(input.security_incident===true)return human('SECURITY_INCIDENT');
  if(input.customer_human_request===true)return human('CUSTOMER_HUMAN_REQUEST');
  if(input.signature_required===true)return human('SIGNATURE_REQUIRED');
  if(input.policy_conflict===true)return human('POLICY_CONFLICT');
  if(input.risk==='HIGH')return human('HIGH_RISK');
  return null;
}
function scoreResult(value,label){
  if(value==null)return null;
  if(typeof value!=='object'||Array.isArray(value)||value.status!=='SCORED')return null;
  const evidence_refs=uniq(value.evidence_refs);
  if(!evidence_refs.length)return null;
  return {score:boundedScore(value.score,label),evidence_refs};
}
function urgencyFreshness(observedAt,now){const age=(Date.parse(now)-Date.parse(observedAt))/86400000;if(age<0||age>30)return 0;if(age<=3)return 1;if(age<=14)return 0.6;return 0.3;}
function computeUrgency(events,now){
  if(!Array.isArray(events))throw new Error('business_events array required');
  const strongest=new Map();const evidence=[];
  for(const event of events){
    if(!event||typeof event!=='object'||Array.isArray(event))continue;
    const type=req(event.type,'business_event.type',100);
    if(!Object.hasOwn(URGENCY_EVENT_WEIGHTS,type))throw new Error(`business_event type denied:${type}`);
    const observed=iso(event.observed_at,'business_event.observed_at');
    const ref=req(event.evidence_ref,'business_event.evidence_ref',500);
    const factor=urgencyFreshness(observed,now);if(factor===0)continue;
    const value=URGENCY_EVENT_WEIGHTS[type]*factor;
    if(value>(strongest.get(type)??0))strongest.set(type,value);
    evidence.push(ref);
  }
  return {score:Math.min(100,Math.round([...strongest.values()].reduce((a,b)=>a+b,0))),evidence_refs:uniq(evidence)};
}
function contactConfidence(input){
  const scores=[];
  for(const row of [input.email_confidence_result,input.phone_confidence_result]){
    const evidence_refs=uniq(row?.evidence_refs);
    if(row?.status==='SCORED'&&evidence_refs.length&&Number.isFinite(Number(row.confidence_score)))scores.push(Math.max(0,Math.min(100,Number(row.confidence_score))));
  }
  return scores.length?Math.max(...scores):null;
}
function nextAction({fit,intent,urgency,probability,contact,evidenceCount}){
  if(evidenceCount<2)return 'RESEARCH_MISSING_EVIDENCE';
  if(probability>=0.5&&contact!=null&&contact>=70)return 'PREPARE_SALES_REVIEW_PACKET';
  if(probability>=0.35||urgency>=50)return 'PRIORITIZE_FOR_REVIEW';
  if(intent>=50||fit>=70)return 'CONTINUE_ZERO_COST_RESEARCH';
  return 'MAINTAIN_WATCHLIST';
}

export function scoreLeadDecision(input={}){
  validateContext(input);
  const gate=prodOrPolicyGate(input,'LEAD_SCORING');if(gate)return gate;
  const cost=finiteNonNegative(input.estimated_incremental_cost_eur,'estimated_incremental_cost_eur',0);if(cost>0)return human('MONEY_LIMIT',{estimated_incremental_cost_eur:cost});
  const fit=scoreResult(input.icp_score_result,'icp_score_result.score');
  const companyIntent=scoreResult(input.company_intent_result,'company_intent_result.score');
  const pageIntent=scoreResult(input.page_intent_result,'page_intent_result.score');
  if(!fit&&!companyIntent&&!pageIntent)return hold('EVIDENCED_LEAD_SCORES_REQUIRED',{fit_score:null,intent_score:null,urgency_score:0});
  const now=iso(input.now??new Date().toISOString(),'now');
  const urgency=computeUrgency(input.business_events??[],now);
  const fitScore=fit?.score??0;
  let intentScore=0;
  if(companyIntent&&pageIntent)intentScore=Math.round(companyIntent.score*0.6+pageIntent.score*0.4);
  else intentScore=companyIntent?.score??pageIntent?.score??0;
  const composite=fitScore*0.4+intentScore*0.35+urgency.score*0.25;
  const probability=round(Math.min(0.75,Math.max(0,composite/100*0.75)),4);
  const businessValue=finiteNonNegative(input.business_value_eur,'business_value_eur',0);
  const cap=finiteNonNegative(input.value_cap_eur,'value_cap_eur',100000);
  const valueUsed=Math.min(businessValue,cap);
  const expectedValue=Math.round(probability*valueUsed*100)/100;
  const evidence=uniq([...(fit?.evidence_refs??[]),...(companyIntent?.evidence_refs??[]),...(pageIntent?.evidence_refs??[]),...urgency.evidence_refs]);
  const contact=contactConfidence(input);
  return safe({
    status:'SCORED',human_required:null,fit_score:fitScore,intent_score:intentScore,urgency_score:urgency.score,
    conversion_probability:probability,expected_value:expectedValue,business_value_used_eur:valueUsed,value_capped:businessValue>cap,
    next_best_action:nextAction({fit:fitScore,intent:intentScore,urgency:urgency.score,probability,contact,evidenceCount:evidence.length}),
    contact_confidence_score:contact,model_type:'DETERMINISTIC_HEURISTIC_V0',calibrated:false,
    probability_interpretation:'PRIORITIZATION_HEURISTIC_NOT_STATISTICALLY_CALIBRATED',
    evidence_count:evidence.length,evidence_refs:Object.freeze(evidence),observed_at:now,
    personal_or_protected_attributes_used:false,write_mode:'NONE'
  });
}

function contactGate(input,scope){
  validateContext(input);
  const gate=prodOrPolicyGate(input,scope);if(gate)return gate;
  const cost=finiteNonNegative(input.estimated_incremental_cost_eur,'estimated_incremental_cost_eur',0);if(cost>0)return human('MONEY_LIMIT',{estimated_incremental_cost_eur:cost});
  if(input.person_level_contact===true)return human('LEGAL_REQUIRED',{decision:'PERSON_LEVEL_CONTACT_REQUIRES_LEGAL_BASIS_REVIEW'});
  const basis=String(input.source_basis??'').trim();
  if(!APPROVED_CONTACT_BASES.has(basis))return human('LEGAL_REQUIRED',{decision:'APPROVED_CONTACT_SOURCE_BASIS_REQUIRED'});
  return null;
}
function basicEmail(email){
  const raw=String(email??'').trim().toLowerCase();
  if(raw.length<3||raw.length>254||raw.includes(' ')||raw.split('@').length!==2)return {email:raw,valid:false,domain:null};
  const [local,domain]=raw.split('@');
  const valid=local.length>0&&local.length<=64&&domain.length>3&&domain.includes('.')&&!domain.startsWith('.')&&!domain.endsWith('.')&&!domain.includes('..')&&/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)&&/^[a-z0-9.-]+$/i.test(domain);
  return {email:raw,valid,domain:valid?domain:null};
}

export function scoreEmailContactConfidence(input={}){
  const gate=contactGate(input,'EMAIL_CONFIDENCE');if(gate)return gate;
  if(input.smtp_probe_requested===true)return hold('ACTIVE_SMTP_PROBE_NOT_AUTHORIZED',{email_sent:false,smtp_probe_executed:false});
  const evidenceRef=req(input.evidence_ref,'evidence_ref',500);
  const parsed=basicEmail(input.email);
  if(!parsed.valid)return safe({status:'SCORED',human_required:null,email:parsed.email,domain:null,syntax_valid:false,mx_present:false,catch_all:null,confidence_score:0,classification:'INVALID_FORMAT',evidence_refs:Object.freeze([evidenceRef]),deliverability_guaranteed:false,email_sent:false,smtp_probe_executed:false});
  const mx=uniq(input.mx_records);
  const domainExists=input.domain_exists===true;
  const catchAll=input.catch_all===true?true:input.catch_all===false?false:null;
  const smtp=String(input.smtp_status??'UNKNOWN').toUpperCase();
  if(!ALLOWED_SMTP_EVIDENCE.has(smtp))throw new Error('smtp_status invalid');
  if(smtp!=='UNKNOWN'&&input.smtp_evidence_authorized!==true)return hold('AUTHORIZED_SMTP_EVIDENCE_REQUIRED',{email_sent:false,smtp_probe_executed:false});
  let score=30+(domainExists?20:0)+(mx.length?30:0);
  if(smtp==='ACCEPTED_NON_SENDING')score+=15;
  if(smtp==='REJECTED_NON_SENDING')score-=40;
  if(input.disposable===true)score=Math.min(score,40);
  score=Math.max(0,Math.min(95,score));
  if(catchAll===true)score=Math.min(score,60);
  let classification=score>=75?'HIGH_CONFIDENCE':score>=50?'MEDIUM_CONFIDENCE':'LOW_CONFIDENCE';
  if(catchAll===true)classification='UNCERTAIN_CATCH_ALL';
  if(smtp==='REJECTED_NON_SENDING')classification='LOW_CONFIDENCE';
  return safe({
    status:'SCORED',human_required:null,email:parsed.email,domain:parsed.domain,syntax_valid:true,domain_exists:domainExists,mx_present:mx.length>0,mx_record_count:mx.length,
    smtp_evidence:smtp,catch_all:catchAll,disposable:input.disposable===true,confidence_score:score,classification,
    evidence_refs:Object.freeze(uniq([evidenceRef,...(input.smtp_evidence_ref?[input.smtp_evidence_ref]:[])])),
    deliverability_guaranteed:false,email_sent:false,smtp_probe_executed:false,active_network_verification_executed:false,write_mode:'NONE'
  });
}

function normalizePhone(value){
  let raw=String(value??'').trim();if(raw.startsWith('00'))raw=`+${raw.slice(2)}`;
  const leading=raw.startsWith('+');const digits=raw.replace(/\D/g,'');return `${leading?'+':''}${digits}`;
}

export function scorePhoneContactConfidence(input={}){
  const gate=contactGate(input,'PHONE_CONFIDENCE');if(gate)return gate;
  if(input.phone_lookup_requested===true)return hold('PHONE_LOOKUP_NOT_AUTHORIZED',{carrier_lookup_executed:false,person_lookup_executed:false});
  const evidenceRef=req(input.evidence_ref,'evidence_ref',500);
  const phone=normalizePhone(input.phone);
  const e164=/^\+[1-9]\d{7,14}$/.test(phone);
  const national=/^\d{8,15}$/.test(phone);
  let score=input.source_basis==='FIRST_PARTY_EXPLICIT'?50:input.source_basis==='EXISTING_CRM_WITH_BASIS'?45:40;
  if(e164)score+=40;else if(national)score+=20;else score=Math.min(score,30);
  if(input.country_context_match===true)score+=10;
  score=Math.max(0,Math.min(95,score));
  return safe({
    status:'SCORED',human_required:null,normalized_phone:phone,e164_plausible:e164,national_format_plausible:!e164&&national,
    confidence_score:score,classification:score>=80?'HIGH_CONFIDENCE':score>=50?'MEDIUM_CONFIDENCE':'LOW_CONFIDENCE',
    evidence_refs:Object.freeze([evidenceRef]),carrier_lookup_executed:false,person_lookup_executed:false,phone_contact_guaranteed:false,write_mode:'NONE'
  });
}

export function planVerificationProvider(input={}){
  validateContext(input);
  const gate=prodOrPolicyGate(input,'CONTACT_VERIFICATION');if(gate)return gate;
  const cost=finiteNonNegative(input.estimated_incremental_cost_eur,'estimated_incremental_cost_eur',0);if(cost>0)return human('MONEY_LIMIT',{estimated_incremental_cost_eur:cost});
  const provider=req(input.provider??'LOCAL_PASSIVE','provider',100).toUpperCase();
  if(provider==='VERIFIO')return hold('VERIFIO_LICENSE_CONFLICT_REVIEW_REQUIRED',{
    source_repository:'verifio-email/verifio',external_code_execution:false,code_copy_authorized:false,
    conflict:'README_MIT_CLAIM_VS_LICENSE_ADDITIONAL_RESTRICTIONS',decision:'DO_NOT_IMPORT_OR_EXECUTE_UNTIL_LICENSE_RECONCILED'
  });
  if(provider!=='LOCAL_PASSIVE')return hold('VERIFICATION_PROVIDER_NOT_APPROVED',{provider,external_code_execution:false});
  return safe({status:'PLAN_READY',human_required:null,provider:'LOCAL_PASSIVE',email_signal_mode:'SYNTAX_DNS_MX_PLUS_AUTHORIZED_EVIDENCE',phone_signal_mode:'NORMALIZATION_AND_FORMAT_PLAUSIBILITY',active_smtp_probe_authorized:false,email_send_authorized:false,carrier_lookup_authorized:false,person_lookup_authorized:false,external_code_execution:false,write_mode:'NONE'});
}

export const LEAD_SCORING_CONTACT_CONFIDENCE_PROFILE_V1_CONTRACT=Object.freeze({
  schema_version:'1.0.0',state_type:'CEREBRO_LEAD_SCORING_CONTACT_CONFIDENCE_PROFILE_V1',
  company_scope:'MULTIEMPRESA_CONTEXT_REQUIRED',engine_id:'LEAD-001',supporting_engines:Object.freeze(['CAP-001','CRM-001','SALE-001','EVT-001','ROUTE-001','IAM-001']),
  environment:'PREPROD',version:'1.0.0',human_required_codes:HUMAN_REQUIRED_CODES,
  deterministic_before_ai:true,conversion_probability_calibrated:false,personal_or_protected_attribute_scoring_allowed:false,
  contact_source_basis_required:true,email_guessing_allowed:false,phone_guessing_allowed:false,active_smtp_probe_authorized:false,email_send_authorized:false,
  carrier_lookup_authorized:false,person_lookup_authorized:false,outreach_authorized:false,crm_write_authorized:false,
  external_verification_code_required:false,automatic_paid_fallback:false,silent_spend_allowed:false,new_paid_subscription_required:false,
  auth_bypass_allowed:false,captcha_bypass_allowed:false,mfa_bypass_allowed:false,anti_abuse_evasion_allowed:false,
  prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_target_eur:0,
  next_gate:'LEAD_SCORING_CONTACT_CONFIDENCE_PREPROD_VERIFICATION'
});