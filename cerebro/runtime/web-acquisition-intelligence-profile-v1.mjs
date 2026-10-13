const HUMAN_REQUIRED_CODES=Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

export const WEB_ACQUISITION_ROUTE_ORDER=Object.freeze([
  'OFFICIAL_API_FEED_SITEMAP','SCRAPLING','CRAWLEE','APIFY_FREE','BROWSER_FALLBACK'
]);

export const WEB_ACQUISITION_SOURCE_DISPOSITIONS=Object.freeze([
  Object.freeze({item:52,source:'D4Vinci/Scrapling',license:'BSD-3-Clause',mode:'OSS_LOCAL_ADAPTER_CANDIDATE',external_code_execution:false}),
  Object.freeze({item:53,source:'apify/crawlee',license:'Apache-2.0',mode:'OSS_LOCAL_ADAPTER_CANDIDATE',external_code_execution:false}),
  Object.freeze({item:54,source:'Apify platform',license:'SERVICE',mode:'FREE_TIER_ONLY_NO_SPEND',external_code_execution:false}),
  Object.freeze({item:55,source:'Panniantong/Agent-Reach',license:'MIT',mode:'LAB_REFERENCE_AND_SOURCE_ADAPTER_CANDIDATE',external_code_execution:false})
]);

const DOWNSTREAM=Object.freeze({
  'COMPET-001':Object.freeze({status:'PARCIAL',path:null,evidence:'historical implementation merged outside current main in PR #159; current main has canonical engine id but no competitor runtime path, so no false operational claim'}),
  'WAUD-001':Object.freeze({status:'EXISTENTE',path:'cerebro/multicompany/post-scan-parallel-v1.mjs',evidence:'merged shared PREPROD runtime'}),
  'KW-001':Object.freeze({status:'EXISTENTE',path:'cerebro/multicompany/post-scan-parallel-v1.mjs',evidence:'merged shared PREPROD runtime'}),
  'SOCAUD-001':Object.freeze({status:'EXISTENTE',path:'cerebro/multicompany/post-scan-parallel-v1.mjs',evidence:'merged shared PREPROD runtime'}),
  'LOCALP-001':Object.freeze({status:'EXISTENTE',path:'cerebro/multicompany/post-scan-parallel-v1.mjs',evidence:'merged shared PREPROD runtime'})
});

const SOURCE_KEY=Object.freeze({
  OFFICIAL_API_FEED_SITEMAP:'official_api_feed',SCRAPLING:'scrapling',CRAWLEE:'crawlee',APIFY_FREE:'apify_free',BROWSER_FALLBACK:'browser'
});

function safe(value={}){
  return Object.freeze({
    ...value,
    execution_authorized:false,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    additional_cost_eur:0
  });
}
function hold(reason,detail={}){return safe({status:'HOLD',reason,human_required:null,...detail});}
function blocked(reason,detail={}){return safe({status:'BLOCKED',reason,human_required:null,...detail});}
function human(reason,detail={}){
  if(!HUMAN_REQUIRED_CODES.includes(reason)) throw new Error('non-canonical HUMAN_REQUIRED reason');
  return safe({status:'HUMAN_REQUIRED',reason,human_required:reason,...detail});
}
function requiredString(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function finiteNonNegative(value,label){const n=Number(value??0);if(!Number.isFinite(n)||n<0)throw new Error(`${label} invalid`);return n;}
function normalizeHost(host){return String(host??'').trim().toLowerCase().replace(/^\[|\]$/g,'');}
function isPrivateTarget(url){
  const host=normalizeHost(url.hostname);
  if(host==='localhost'||host.endsWith('.localhost')||host==='::1'||host==='0.0.0.0') return true;
  if(/^127\./.test(host)||/^10\./.test(host)||/^192\.168\./.test(host)) return true;
  const m=host.match(/^172\.(\d{1,3})\./); if(m&&Number(m[1])>=16&&Number(m[1])<=31) return true;
  if(/^169\.254\./.test(host)||/^fc/i.test(host)||/^fd/i.test(host)||/^fe80:/i.test(host)) return true;
  return false;
}
function parsePublicUrl(value){
  let url; try{url=new URL(requiredString(value,'target_url'));}catch{throw new Error('target_url invalid');}
  if(!['http:','https:'].includes(url.protocol)) throw new Error('target_url protocol denied');
  return {url,public:!isPrivateTarget(url)};
}
function validateContext(input){
  for(const key of ['company_id','engine_id','environment','version']) requiredString(input?.[key],key);
  if(!['LAB','PREPROD','PROD'].includes(input.environment)) throw new Error('environment invalid');
}

export function planWebAcquisition(input={}){
  validateContext(input);
  if(input.environment==='PROD') return blocked('PROD_ACQUISITION_NOT_AUTHORIZED');
  if(input.trading_requested===true) return blocked('TRADING_ISOLATION_DENIED');
  if(input.prod_write_requested===true) return human('HIGH_RISK',{decision:'PROD_WRITE_NOT_AUTHORIZED'});
  if(input.security_incident===true) return human('SECURITY_INCIDENT');
  if(input.legal_required===true) return human('LEGAL_REQUIRED');
  if(input.signature_required===true) return human('SIGNATURE_REQUIRED');
  if(input.customer_human_request===true) return human('CUSTOMER_HUMAN_REQUEST');
  if(input.risk==='HIGH') return human('HIGH_RISK');
  const {public:publicTarget}=parsePublicUrl(input.target_url);
  if(!publicTarget) return blocked('NON_PUBLIC_TARGET_DENIED');
  if(input.authorized_public_research!==true) return hold('PUBLIC_RESEARCH_AUTHORIZATION_REQUIRED');
  if(input.robots_allowed===false) return hold('ROBOTS_POLICY_HOLD');
  if(input.consent_required===true) return hold('CONSENT_ACTION_REQUIRED');
  if(input.captcha_challenge===true) return hold('CAPTCHA_ACTION_REQUIRED');
  if(input.auth_challenge===true||input.mfa_challenge===true) return hold('AUTH_ACTION_REQUIRED');

  const estimatedCost=finiteNonNegative(input.estimated_incremental_cost_eur,'estimated_incremental_cost_eur');
  if(estimatedCost>0) return human('MONEY_LIMIT',{estimated_incremental_cost_eur:estimatedCost,decision:'ZERO_COST_ONLY'});

  const sources=input.sources&&typeof input.sources==='object'?input.sources:{};
  const eligible=[];
  for(const route of WEB_ACQUISITION_ROUTE_ORDER){
    if(sources[SOURCE_KEY[route]]!==true) continue;
    if(route==='BROWSER_FALLBACK'&&input.browser_binding_status!=='BROWSER_SESSION_BINDING_HEALTHY') continue;
    eligible.push(route);
  }
  if(eligible.length===0){
    if(sources.browser===true&&input.browser_binding_status!=='BROWSER_SESSION_BINDING_HEALTHY') return hold('HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT');
    return hold('NO_ZERO_COST_AUTHORIZED_ACQUISITION_ROUTE');
  }
  return safe({
    status:'ROUTED',human_required:null,selected_route:eligible[0],fallback_chain:Object.freeze(eligible.slice(1)),
    route_order:WEB_ACQUISITION_ROUTE_ORDER,mode:'PLAN_ONLY_AUTHORIZED_PUBLIC_ACQUISITION',read_only:true,
    robots_policy_required:true,anti_abuse_evasion:false,captcha_bypass:false,auth_bypass:false
  });
}

const SCORE_WEIGHTS=Object.freeze({fit:30,zero_cost:20,maintainability:15,security:15,interoperability:10,reversibility:10});
const EVIDENCE_FIELDS=Object.freeze(['candidate_id','source_ref','observed_at','version_ref','license_ref','security_notes','integration_notes']);
function scoreNumber(value,label){const n=Number(value);if(!Number.isFinite(n)||n<0||n>100)throw new Error(`${label} invalid`);return n;}

export function scoreTechnologyCandidate({company_id,engine_id,environment,version,candidate,prod_write=false,trading_access=false}={}){
  validateContext({company_id,engine_id,environment,version});
  if(environment==='PROD') return blocked('PROD_TECH_SCOUT_NOT_AUTHORIZED');
  if(prod_write===true) return human('HIGH_RISK');
  if(trading_access===true) return blocked('TRADING_ISOLATION_DENIED');
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate)) return hold('TECHNOLOGY_EVIDENCE_INCOMPLETE');
  if(EVIDENCE_FIELDS.some(k=>typeof candidate[k]!=='string'||!candidate[k].trim())) return hold('TECHNOLOGY_EVIDENCE_INCOMPLETE',{candidate_id:candidate.candidate_id??null});
  const cost=finiteNonNegative(candidate.cost_eur_month,'candidate.cost_eur_month');
  if(cost>0) return human('MONEY_LIMIT',{candidate_id:candidate.candidate_id,estimated_incremental_cost_eur:cost});
  const parts={};
  for(const key of ['fit','maintainability','security','interoperability','reversibility']) parts[key]=scoreNumber(candidate[key],`candidate.${key}`);
  const score=(parts.fit*SCORE_WEIGHTS.fit+100*SCORE_WEIGHTS.zero_cost+parts.maintainability*SCORE_WEIGHTS.maintainability+parts.security*SCORE_WEIGHTS.security+parts.interoperability*SCORE_WEIGHTS.interoperability+parts.reversibility*SCORE_WEIGHTS.reversibility)/100;
  return safe({
    status:'SCORED',human_required:null,candidate_id:candidate.candidate_id,score:Number(score.toFixed(2)),
    recommendation:score>=80?'SHORTLIST':score>=60?'REVIEW':'REJECT',mode:'PLAN_ONLY',evidence_complete:true
  });
}

export function downstreamIntelligenceStatus(engine_id){
  const item=DOWNSTREAM[String(engine_id??'')];
  return item?Object.freeze({engine_id,...item}):Object.freeze({engine_id:String(engine_id??''),status:'POR_AUDITAR',path:null,evidence:null});
}

export const WEB_ACQUISITION_PROFILE_V1_CONTRACT=Object.freeze({
  schema_version:'1.0.0',state_type:'CEREBRO_WEB_ACQUISITION_INTELLIGENCE_PROFILE_V1',
  company_scope:'MULTIEMPRESA_CONTEXT_REQUIRED',engine_id:'RSH-001',environment:'PREPROD',version:'1.0.0',
  route_order:WEB_ACQUISITION_ROUTE_ORDER,
  human_required_codes:HUMAN_REQUIRED_CODES,
  deterministic_before_ai:true,public_evidence_only:true,robots_policy_required:true,terms_and_legal_gate_required:true,
  captcha_bypass_allowed:false,auth_bypass_allowed:false,mfa_bypass_allowed:false,anti_abuse_evasion_allowed:false,
  silent_spend_allowed:false,external_code_execution:false,new_engine_per_provider:false,new_paid_subscription_required:false,
  prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_target_eur:0,
  preserved_engines:Object.freeze(['SCAN-001','COMPET-001','WAUD-001','KW-001','SOCAUD-001','LOCALP-001','RSH-001','UPD-001','WEB-001','ROUTE-001']),
  next_gate:'WEB_ACQUISITION_PROFILE_PREPROD_VERIFICATION'
});
