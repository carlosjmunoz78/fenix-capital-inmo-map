import crypto from 'node:crypto';

const HUMAN_REQUIRED_CODES=Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

export const ANALYTICS_PROVIDER_ORDER=Object.freeze([
  'FIRST_PARTY_LOCAL','POSTHOG_FREE','MICROSOFT_CLARITY_FREE','YANDEX_METRICA_FREE'
]);

export const PAGE_INTENT_WEIGHTS=Object.freeze({
  HOME:5,BLOG:10,SERVICE:20,CASE_STUDY:25,CONTACT:30,PRICING:35,APPLICATION_START:40
});

export const ANALYTICS_PROVIDER_DISPOSITIONS=Object.freeze([
  Object.freeze({item:74,source:'CEREBRO first-party event contract',mode:'LOCAL_CONTRACT_FIRST',required_runtime_dependency:false,automatic_spend_allowed:false}),
  Object.freeze({item:75,source:'PostHog',mode:'FREE_TIER_OR_SELF_HOST_CANDIDATE_NO_AUTO_SPEND',required_runtime_dependency:false,automatic_spend_allowed:false,free_monthly_analytics_events:1000000}),
  Object.freeze({item:76,source:'Talivia',mode:'PATTERNS_ONLY_PAID_SERVICE',required_runtime_dependency:false,automatic_spend_allowed:false}),
  Object.freeze({item:77,source:'Microsoft Clarity',mode:'FREE_PROVIDER_CONSENT_GATED',required_runtime_dependency:false,automatic_spend_allowed:false}),
  Object.freeze({item:78,source:'Yandex Metrica',mode:'FREE_PROVIDER_PRIVACY_GATED',required_runtime_dependency:false,automatic_spend_allowed:false})
]);

const ALLOWED_EVENT_TYPES=new Set(['PAGE_VIEW','CTA_CLICK','FORM_SUBMIT_METADATA','AUTHENTICATED_ACCOUNT_VIEW','CONVERSION_METADATA']);
const FORBIDDEN_EVENT_KEYS=new Set([
  'email','email_address','phone','phone_number','name','full_name','first_name','last_name','ip','ip_address','remote_addr',
  'user_agent','cookie','cookies','cookie_header','form_values','form_data','field_values','raw_query','query_string','search_params',
  'password','token','access_token','refresh_token','jwt','api_key','secret','device_fingerprint','fingerprint'
]);
const PROVIDER_FLAG=Object.freeze({FIRST_PARTY_LOCAL:'first_party_local',POSTHOG_FREE:'posthog_free',MICROSOFT_CLARITY_FREE:'clarity_free',YANDEX_METRICA_FREE:'yandex_free'});

function req(value,label,max=500){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);const x=value.trim();if(x.length>max)throw new Error(`${label} too long`);return x;}
function validateContext(input){for(const key of ['company_id','engine_id','environment','version'])req(input?.[key],key);if(!['LAB','PREPROD','PROD'].includes(input.environment))throw new Error('environment invalid');}
function finiteNonNegative(value,label,def=0){if(value==null||value==='')return def;const n=Number(value);if(!Number.isFinite(n)||n<0)throw new Error(`${label} invalid`);return n;}
function iso(value,label){const t=Date.parse(value);if(Number.isNaN(t))throw new Error(`${label} invalid`);return new Date(t).toISOString();}
function safe(value={}){return Object.freeze({...value,activation_authorized:false,execution_authorized:false,crm_write_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});}
function hold(reason,detail={}){return safe({status:'HOLD',reason,human_required:null,...detail});}
function blocked(reason,detail={}){return safe({status:'BLOCKED',reason,human_required:null,...detail});}
function human(reason,detail={}){if(!HUMAN_REQUIRED_CODES.includes(reason))throw new Error('non-canonical HUMAN_REQUIRED reason');return safe({status:'HUMAN_REQUIRED',reason,human_required:reason,...detail});}
function stableHash(value){return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function normalizeDomain(value){const raw=String(value??'').trim();if(!raw)return null;try{const u=new URL(raw.includes('://')?raw:`https://${raw}`);return u.hostname.toLowerCase().replace(/^www\./,'');}catch{return raw.toLowerCase().replace(/^www\./,'').replace(/^https?:\/\//,'').split('/')[0]||null;}}
function findForbiddenKey(value,path='root'){
  if(value==null)return null;
  if(Array.isArray(value)){for(let i=0;i<value.length;i++){const found=findForbiddenKey(value[i],`${path}[${i}]`);if(found)return found;}return null;}
  if(typeof value!=='object')return null;
  for(const [key,child] of Object.entries(value)){
    if(FORBIDDEN_EVENT_KEYS.has(key.toLowerCase()))return `${path}.${key}`;
    const found=findForbiddenKey(child,`${path}.${key}`);if(found)return found;
  }
  return null;
}
function parsePageUrl(value){
  let u;try{u=new URL(req(value,'page_url',2048));}catch{throw new Error('page_url invalid');}
  if(!['https:','http:'].includes(u.protocol))throw new Error('page_url protocol denied');
  const origin=u.origin;const routePath=u.pathname||'/';return {origin,routePath};
}

export function normalizeFirstPartyEvent(input={}){
  validateContext(input);
  const forbidden=findForbiddenKey(input);if(forbidden)throw new Error(`forbidden event field:${forbidden}`);
  if(input.environment==='PROD')return blocked('PROD_EVENT_CAPTURE_NOT_AUTHORIZED');
  if(input.trading_requested===true)return blocked('TRADING_ISOLATION_DENIED');
  if(input.consent_state!=='GRANTED_ANALYTICS')return hold('ANALYTICS_CONSENT_REQUIRED');
  const eventType=req(input.event_type,'event_type',100);if(!ALLOWED_EVENT_TYPES.has(eventType))throw new Error(`event_type denied:${eventType}`);
  const occurredAt=iso(input.occurred_at,'occurred_at');
  const pageCategory=req(input.page_category,'page_category',100).toUpperCase();if(!Object.hasOwn(PAGE_INTENT_WEIGHTS,pageCategory))throw new Error(`page_category denied:${pageCategory}`);
  const {origin,routePath}=parsePageUrl(input.page_url);
  const evidenceRef=req(input.evidence_ref,'evidence_ref',500);
  const accountId=input.account_id?req(input.account_id,'account_id',255):null;
  const companyDomain=input.company_domain?normalizeDomain(input.company_domain):null;
  const idParts={company_id:input.company_id,engine_id:input.engine_id,environment:input.environment,version:input.version,event_type:eventType,occurred_at:occurredAt,page_url_origin:origin,route_path:routePath,page_category:pageCategory,account_id:accountId,company_domain:companyDomain,evidence_ref:evidenceRef};
  return safe({
    status:'NORMALIZED',human_required:null,...idParts,event_id:stableHash(idParts),source:'FIRST_PARTY',consent_state:'GRANTED_ANALYTICS',
    raw_ip_stored:false,user_agent_stored:false,cookies_stored:false,form_values_stored:false,query_parameters_stored:false,
    person_identity_stored:false,device_fingerprint_stored:false
  });
}

export function planAnalyticsProvider(input={}){
  validateContext(input);
  if(input.environment==='PROD')return blocked('PROD_ANALYTICS_ACTIVATION_NOT_AUTHORIZED');
  if(input.trading_requested===true)return blocked('TRADING_ISOLATION_DENIED');
  if(input.security_incident===true)return human('SECURITY_INCIDENT');
  if(input.legal_required===true)return human('LEGAL_REQUIRED');
  const cost=finiteNonNegative(input.estimated_incremental_cost_eur,'estimated_incremental_cost_eur',0);if(cost>0)return human('MONEY_LIMIT',{estimated_incremental_cost_eur:cost});
  if(input.consent_ready!==true)return hold('ANALYTICS_CONSENT_REQUIRED');
  const available=input.available&&typeof input.available==='object'?input.available:{};
  const monthly=Math.floor(finiteNonNegative(input.estimated_monthly_events,'estimated_monthly_events',0));
  const eligible=[];const diagnostics=[];
  for(const provider of ANALYTICS_PROVIDER_ORDER){
    if(available[PROVIDER_FLAG[provider]]!==true)continue;
    if(provider==='POSTHOG_FREE'&&monthly>1000000){diagnostics.push({provider,reason:'POSTHOG_FREE_TIER_CAP_EXCEEDED'});continue;}
    if(provider==='MICROSOFT_CLARITY_FREE'&&input.privacy_review_complete!==true){diagnostics.push({provider,reason:'PRIVACY_REVIEW_REQUIRED'});continue;}
    if(provider==='YANDEX_METRICA_FREE'&&input.privacy_review_complete!==true){diagnostics.push({provider,reason:'PRIVACY_REVIEW_REQUIRED'});continue;}
    eligible.push(provider);
  }
  if(!eligible.length){
    const posthog=diagnostics.find(x=>x.reason==='POSTHOG_FREE_TIER_CAP_EXCEEDED');if(posthog)return hold(posthog.reason,{diagnostics:Object.freeze(diagnostics)});
    const privacy=diagnostics.find(x=>x.reason==='PRIVACY_REVIEW_REQUIRED');if(privacy)return hold(privacy.reason,{diagnostics:Object.freeze(diagnostics)});
    return hold('NO_ZERO_COST_PRIVACY_READY_ANALYTICS_PROVIDER',{diagnostics:Object.freeze(diagnostics)});
  }
  return safe({status:'PLAN_READY',human_required:null,selected_provider:eligible[0],fallback_chain:Object.freeze(eligible.slice(1)),provider_order:ANALYTICS_PROVIDER_ORDER,estimated_monthly_events:monthly,consent_required:true,privacy_review_required:true,no_auto_spend:true,write_mode:'NONE'});
}

export function planCompanyVisitorIdentification(input={}){
  validateContext(input);
  if(input.environment==='PROD')return blocked('PROD_VISITOR_IDENTIFICATION_NOT_AUTHORIZED');
  if(input.device_fingerprinting===true)return blocked('FINGERPRINTING_DENIED');
  if(input.person_resolution_requested===true)return human('LEGAL_REQUIRED',{decision:'PERSON_LEVEL_VISITOR_RESOLUTION_REQUIRES_LEGAL_REVIEW'});
  if(input.third_party_anonymous_resolution===true)return human('LEGAL_REQUIRED',{decision:'THIRD_PARTY_ANONYMOUS_VISITOR_RESOLUTION_REQUIRES_LEGAL_REVIEW'});
  if(input.consent_or_first_party_basis!==true)return human('LEGAL_REQUIRED',{decision:'CONSENT_OR_FIRST_PARTY_BASIS_REQUIRED'});
  const accountId=input.account_id?req(input.account_id,'account_id',255):null;
  const companyDomain=input.company_domain?normalizeDomain(input.company_domain):null;
  if(!accountId&&!companyDomain)return hold('KNOWN_ACCOUNT_OR_EXPLICIT_COMPANY_DOMAIN_REQUIRED');
  return safe({status:'PLAN_READY',human_required:null,identification_level:'COMPANY_ONLY',account_id:accountId,company_domain:companyDomain,matching_mode:accountId?'EXACT_ACCOUNT_ID':'EXACT_EXPLICIT_DOMAIN',person_resolution_allowed:false,fingerprinting_allowed:false,write_mode:'NONE'});
}

function normalizedEvents(events,accountId){
  if(!Array.isArray(events))throw new Error('events array required');
  return events.filter(e=>e?.status==='NORMALIZED'&&e.account_id===accountId).sort((a,b)=>Date.parse(a.occurred_at)-Date.parse(b.occurred_at));
}

export function scoreVisitedPageIntent(input={}){
  validateContext(input);if(input.environment==='PROD')return blocked('PROD_PAGE_INTENT_NOT_AUTHORIZED');
  const accountId=req(input.account_id,'account_id',255);const events=normalizedEvents(input.events,accountId);
  if(!events.length)return hold('NO_NORMALIZED_ACCOUNT_EVENTS',{account_id:accountId,score:0,evidence_count:0});
  const strongest=new Map();
  for(const event of events){const w=PAGE_INTENT_WEIGHTS[event.page_category];if(w==null)continue;const prior=strongest.get(event.page_category)??0;if(w>prior)strongest.set(event.page_category,w);}
  const score=Math.min(100,[...strongest.values()].reduce((a,b)=>a+b,0));
  const evidence=[...new Set(events.map(e=>e.evidence_ref).filter(Boolean))];
  return safe({status:'SCORED',human_required:null,account_id:accountId,score,classification:score>=70?'HIGH_PAGE_INTENT':score>=40?'MEDIUM_PAGE_INTENT':'LOW_PAGE_INTENT',evidence_count:evidence.length,evidence_refs:Object.freeze(evidence),person_level_signal_used:false});
}

export function deriveReturnVisitSignal(input={}){
  validateContext(input);if(input.environment==='PROD')return blocked('PROD_RETURN_VISIT_NOT_AUTHORIZED');
  const accountId=req(input.account_id,'account_id',255);const events=normalizedEvents(input.events,accountId);const gap=finiteNonNegative(input.visit_gap_minutes,'visit_gap_minutes',30)*60000;
  if(!events.length)return hold('NO_NORMALIZED_ACCOUNT_EVENTS',{account_id:accountId,return_visit:false,visit_count:0});
  let visits=1;let previous=Date.parse(events[0].occurred_at);
  for(let i=1;i<events.length;i++){const current=Date.parse(events[i].occurred_at);if(current-previous>=gap)visits+=1;previous=current;}
  return safe({status:'SIGNAL_READY',human_required:null,account_id:accountId,return_visit:visits>=2,visit_count:visits,visit_gap_minutes:gap/60000,evidence_refs:Object.freeze([...new Set(events.map(e=>e.evidence_ref).filter(Boolean))]),person_level_signal_used:false});
}

export function mergeCrmWebsiteAccountTimeline(input={}){
  validateContext(input);if(input.environment==='PROD')return blocked('PROD_CRM_WEBSITE_MERGE_NOT_AUTHORIZED');
  if(!Array.isArray(input.crm_accounts)||!Array.isArray(input.website_events))throw new Error('crm_accounts and website_events arrays required');
  const byAccount=new Map();const byDomain=new Map();
  for(const row of input.crm_accounts){if(!row||typeof row!=='object')continue;const id=row.account_id?req(row.account_id,'crm.account_id',255):null;const domain=normalizeDomain(row.company_domain);if(id)byAccount.set(id,row);if(domain){if(byDomain.has(domain))byDomain.set(domain,null);else byDomain.set(domain,row);}}
  const eventBuckets=new Map();
  for(const event of input.website_events){if(event?.status!=='NORMALIZED')continue;let account=null;if(event.account_id&&byAccount.has(event.account_id))account=byAccount.get(event.account_id);else if(event.company_domain){const candidate=byDomain.get(normalizeDomain(event.company_domain));if(candidate)account=candidate;}
    if(!account)continue;const id=account.account_id;const list=eventBuckets.get(id)??[];list.push(event);eventBuckets.set(id,list);
  }
  const timelines=input.crm_accounts.filter(x=>x&&typeof x==='object'&&x.account_id).map(account=>Object.freeze({account_id:account.account_id,company_name:account.company_name??null,company_domain:normalizeDomain(account.company_domain),website_events:Object.freeze((eventBuckets.get(account.account_id)??[]).sort((a,b)=>Date.parse(a.occurred_at)-Date.parse(b.occurred_at)))}));
  return safe({status:'MERGED_READ_ONLY',human_required:null,timelines:Object.freeze(timelines),fuzzy_matching_used:false,person_matching_used:false,write_mode:'NONE'});
}

export const FIRST_PARTY_ACCOUNT_SIGNALS_PROFILE_V1_CONTRACT=Object.freeze({
  schema_version:'1.0.0',state_type:'CEREBRO_FIRST_PARTY_ACCOUNT_SIGNALS_PROFILE_V1',company_scope:'MULTIEMPRESA_CONTEXT_REQUIRED',
  engine_id:'EVT-001',supporting_engines:Object.freeze(['LEAD-001','CAP-001','CRM-001','OBS-001','OBSERV-001','ROUTE-001','IAM-001']),environment:'PREPROD',version:'1.0.0',
  human_required_codes:HUMAN_REQUIRED_CODES,provider_order:ANALYTICS_PROVIDER_ORDER,analytics_consent_required:true,
  raw_ip_storage_allowed:false,user_agent_storage_allowed:false,cookie_value_storage_allowed:false,form_value_capture_allowed:false,query_parameter_storage_allowed:false,
  person_resolution_default:false,device_fingerprinting_allowed:false,fuzzy_crm_matching_allowed:false,crm_write_authorized:false,outreach_authorized:false,
  provider_activation_authorized:false,automatic_paid_fallback:false,silent_spend_allowed:false,new_paid_subscription_required:false,
  auth_bypass_allowed:false,captcha_bypass_allowed:false,mfa_bypass_allowed:false,anti_abuse_evasion_allowed:false,
  prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_target_eur:0,next_gate:'FIRST_PARTY_ACCOUNT_SIGNALS_PREPROD_VERIFICATION'
});
