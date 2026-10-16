import { planWebAcquisition, scoreTechnologyCandidate, WEB_ACQUISITION_PROFILE_V1_CONTRACT } from './web-acquisition-intelligence-profile-v1.mjs';
import { fetchPublicEvidenceV0, PUBLIC_SOURCE_ADAPTER_V0_CONTRACT } from './public-source-adapter-v0.mjs';
import { stableIdempotencyKey, validateCanonicalContext } from './continuous-improvement-contract.mjs';

const CAPABILITY_ID='TECH-CAP-SCOUT-NATIVE';
const OWNER_ENGINE_ID='RSH-001';
const PREPROD='PREPROD';
const OPERATIONS=new Set(['PLAN_ACQUISITION','ACQUIRE_PUBLIC_EVIDENCE','INGEST_EVIDENCE','SCORE_CANDIDATE','BUILD_DOSSIER','REPLAY_VERIFY']);
const SECRET_KEY_RE=/(?:^|_)(?:password|passwd|pwd|secret|token|access_token|refresh_token|api_key|apikey|authorization|cookie|private_key|client_secret)(?:$|_)/i;
const SECRET_VALUE_RE=[/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}\b/,/\bsb_secret_[A-Za-z0-9_-]{8,}\b/,/\bAIza[A-Za-z0-9_-]{12,}\b/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
const SECRET_QUERY_RE=/(token|secret|password|key|auth|credential|session|cookie|jwt)/i;

function req(value,label,max=4096){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);const out=value.trim();if(out.length>max)throw new Error(`${label} too long`);return out;}
function iso(value,label='observed_at'){const raw=req(value,label,100);const t=Date.parse(raw);if(Number.isNaN(t))throw new Error(`${label} invalid`);return new Date(t).toISOString();}
function canonicalContext(input){
  const ctx={company_id:req(input?.company_id,'company_id',120),engine_id:req(input?.engine_id,'engine_id',80),environment:req(input?.environment,'environment',40),version:req(input?.version,'version',80)};
  const check=validateCanonicalContext(ctx,{allowProd:false});
  if(!check.ok)throw new Error(`invalid context:${check.errors.join(',')}`);
  if(ctx.environment!==PREPROD)throw new Error('TECH_CAP_SCOUT_PREPROD_ONLY');
  if(ctx.engine_id!==OWNER_ENGINE_ID)throw new Error('TECH_CAP_SCOUT_OWNER_ENGINE_MISMATCH');
  return Object.freeze(ctx);
}
function scanForbidden(value,path='input',depth=0,seen=new WeakSet()){
  if(depth>12)throw new Error('input too deep');
  if(value==null||typeof value==='boolean'||typeof value==='number')return null;
  if(typeof value==='string')return SECRET_VALUE_RE.some(re=>re.test(value))?path:null;
  if(typeof value!=='object')throw new Error('input must be JSON-compatible');
  if(seen.has(value))return `${path}:cycle`;
  seen.add(value);
  if(Array.isArray(value)){for(let i=0;i<value.length;i++){const hit=scanForbidden(value[i],`${path}[${i}]`,depth+1,seen);if(hit)return hit;}return null;}
  const proto=Object.getPrototypeOf(value);if(proto!==Object.prototype&&proto!==null)throw new Error('input must use plain objects');
  for(const [key,item] of Object.entries(value)){if(SECRET_KEY_RE.test(key))return `${path}.${key}`;const hit=scanForbidden(item,`${path}.${key}`,depth+1,seen);if(hit)return hit;}
  return null;
}
function assertSafeUrl(value,label='target_url'){
  if(value==null)return null;
  let url;try{url=new URL(req(value,label,2048));}catch{throw new Error(`${label} invalid`);}
  if(url.username||url.password)throw new Error(`${label} credentials forbidden`);
  for(const key of url.searchParams.keys())if(SECRET_QUERY_RE.test(key))throw new Error(`${label} secret-bearing query forbidden:${key}`);
  return url.toString();
}
function safeResult(value={}){return Object.freeze({...value,capability_id:CAPABILITY_ID,owner_engine_id:OWNER_ENGINE_ID,prod_authorized:false,prod_write_authorized:false,trading_access:false,external_code_execution:false,additional_cost_eur:0});}
function event(type,ctx,payload){return Object.freeze({type,schema_version:'1.0.0',context:{...ctx},payload:Object.freeze({...payload}),prod_authorized:false,additional_cost_eur:0});}
function sameContext(a,b){return a&&b&&a.company_id===b.company_id&&a.engine_id===b.engine_id&&a.environment===b.environment&&a.version===b.version;}

export function authorizeTechnologyScoutAction(input={}){
  let ctx;try{ctx=canonicalContext(input);}catch(error){return safeResult({authorized:false,reason:String(error.message??error),human_required:null});}
  const operation=String(input.operation??'');
  if(!OPERATIONS.has(operation))return safeResult({authorized:false,reason:'OPERATION_DENIED',human_required:null,context:ctx});
  if(input.gateway_authorized!==true)return safeResult({authorized:false,reason:'GATEWAY_AUTH_REQUIRED',human_required:null,context:ctx});
  if(input.trading_requested===true)return safeResult({authorized:false,reason:'TRADING_ISOLATION_DENIED',human_required:null,context:ctx});
  if(input.prod_write_requested===true)return safeResult({authorized:false,reason:'PROD_WRITE_NOT_AUTHORIZED',human_required:'HIGH_RISK',context:ctx});
  const forbidden=scanForbidden(input);
  if(forbidden)return safeResult({authorized:false,reason:'SECRET_MATERIAL_FORBIDDEN',human_required:'SECURITY_INCIDENT',forbidden_path:forbidden,context:ctx});
  try{if(input.target_url!=null)assertSafeUrl(input.target_url);}catch(error){return safeResult({authorized:false,reason:String(error.message??error),human_required:'SECURITY_INCIDENT',context:ctx});}
  const idempotency_key=stableIdempotencyKey({capability_id:CAPABILITY_ID,company_id:ctx.company_id,engine_id:ctx.engine_id,environment:ctx.environment,version:ctx.version,operation,request_key:input.request_key??null});
  return safeResult({authorized:true,reason:'AUTHORIZED_PREPROD',human_required:null,context:ctx,operation,idempotency_key});
}

export function planScoutAcquisition(input={}){
  const ctx=canonicalContext(input);assertSafeUrl(input.target_url);
  const result=planWebAcquisition({...input,...ctx});
  return safeResult({status:result.status,context:ctx,route:result,event:event('research.scout.acquisition.planned',ctx,{status:result.status,selected_route:result.selected_route??null})});
}

export function ingestScoutEvidence({context,evidence}={}){
  const ctx=canonicalContext(context);
  if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))throw new Error('evidence object required');
  const forbidden=scanForbidden(evidence,'evidence');if(forbidden)throw new Error(`SECRET_MATERIAL_FORBIDDEN:${forbidden}`);
  if(evidence.company_id!=null&&evidence.company_id!==ctx.company_id)throw new Error('CROSS_COMPANY_EVIDENCE_DENIED');
  const source_url=evidence.source_url==null?null:assertSafeUrl(evidence.source_url,'evidence.source_url');
  const normalized={
    evidence_type:req(evidence.evidence_type,'evidence.evidence_type',80),source_ref:req(evidence.source_ref,'evidence.source_ref',500),source_url,
    observed_at:iso(evidence.observed_at),version_ref:req(evidence.version_ref,'evidence.version_ref',200),license_ref:req(evidence.license_ref,'evidence.license_ref',200),
    security_notes:req(evidence.security_notes,'evidence.security_notes',2000),integration_notes:req(evidence.integration_notes,'evidence.integration_notes',2000),
    summary:req(evidence.summary,'evidence.summary',4000),public_evidence:evidence.public_evidence===true
  };
  if(!normalized.public_evidence)throw new Error('PUBLIC_EVIDENCE_ONLY');
  const evidence_id=`scoutev_${stableIdempotencyKey({context:ctx,evidence:normalized}).slice(0,24)}`;
  return safeResult({schema_version:'1.0.0',state_type:'CEREBRO_TECH_CAP_SCOUT_EVIDENCE',status:'ACCEPTED',context:ctx,evidence_id,...normalized,canonical_knowledge_write:false,event:event('research.scout.evidence.accepted',ctx,{evidence_id,evidence_type:normalized.evidence_type})});
}

export function scoreScoutCandidate({context,candidate}={}){
  const ctx=canonicalContext(context);
  if(candidate?.company_id!=null&&candidate.company_id!==ctx.company_id)throw new Error('CROSS_COMPANY_CANDIDATE_DENIED');
  const forbidden=scanForbidden(candidate,'candidate');if(forbidden)throw new Error(`SECRET_MATERIAL_FORBIDDEN:${forbidden}`);
  const scored=scoreTechnologyCandidate({...ctx,candidate});
  return safeResult({schema_version:'1.0.0',state_type:'CEREBRO_TECH_CAP_SCOUT_SCORE',context:ctx,status:scored.status,candidate_id:scored.candidate_id??candidate?.candidate_id??null,score:scored.score??null,recommendation:scored.recommendation??null,human_required:scored.human_required??null,reason:scored.reason??null,source_result:scored,event:event('research.scout.candidate.scored',ctx,{candidate_id:scored.candidate_id??candidate?.candidate_id??null,status:scored.status,recommendation:scored.recommendation??null})});
}

export function buildScoutDossier({context,question,evidence_records=[],candidate_scores=[]}={}){
  const ctx=canonicalContext(context);const q=req(question,'question',2000);
  if(!Array.isArray(evidence_records)||!Array.isArray(candidate_scores))throw new Error('evidence_records and candidate_scores arrays required');
  for(const record of evidence_records){if(record?.state_type!=='CEREBRO_TECH_CAP_SCOUT_EVIDENCE'||!sameContext(record.context,ctx))throw new Error('DOSSIER_EVIDENCE_CONTEXT_MISMATCH');}
  for(const score of candidate_scores){if(score?.state_type!=='CEREBRO_TECH_CAP_SCOUT_SCORE'||!sameContext(score.context,ctx))throw new Error('DOSSIER_SCORE_CONTEXT_MISMATCH');}
  const evidence_ids=[...new Set(evidence_records.map(x=>x.evidence_id))].sort();
  const candidates=candidate_scores.map(x=>({candidate_id:x.candidate_id,status:x.status,score:x.score,recommendation:x.recommendation,human_required:x.human_required??null})).sort((a,b)=>String(a.candidate_id).localeCompare(String(b.candidate_id)));
  const dossierSeed={context:ctx,question:q,evidence_ids,candidates};
  const dossier_id=`scoutdos_${stableIdempotencyKey(dossierSeed).slice(0,24)}`;
  return safeResult({schema_version:'1.0.0',state_type:'CEREBRO_TECH_CAP_SCOUT_DOSSIER',status:'READY',context:ctx,dossier_id,question:q,evidence_ids:Object.freeze(evidence_ids),candidates:Object.freeze(candidates),evidence_count:evidence_ids.length,candidate_count:candidates.length,source_evidence_separate_from_interpretation:true,canonical_knowledge_write:false,ai_required:false,event:event('research.scout.dossier.ready',ctx,{dossier_id,evidence_count:evidence_ids.length,candidate_count:candidates.length})});
}

export function verifyScoutDossier(dossier){
  if(!dossier||dossier.state_type!=='CEREBRO_TECH_CAP_SCOUT_DOSSIER')throw new Error('scout dossier required');
  const ctx=canonicalContext(dossier.context);
  const seed={context:ctx,question:dossier.question,evidence_ids:[...dossier.evidence_ids].sort(),candidates:[...dossier.candidates].sort((a,b)=>String(a.candidate_id).localeCompare(String(b.candidate_id)))};
  const expected=`scoutdos_${stableIdempotencyKey(seed).slice(0,24)}`;
  return safeResult({status:expected===dossier.dossier_id?'REPLAY_GREEN':'REPLAY_MISMATCH',context:ctx,dossier_id:dossier.dossier_id,expected_dossier_id:expected,replay_green:expected===dossier.dossier_id});
}

export async function executeTechnologyScoutAction(input={}){
  const auth=authorizeTechnologyScoutAction(input);if(!auth.authorized)return auth;
  const ctx=auth.context;
  if(auth.operation==='PLAN_ACQUISITION')return planScoutAcquisition({...input,...ctx});
  if(auth.operation==='ACQUIRE_PUBLIC_EVIDENCE'){
    const evidence=await fetchPublicEvidenceV0({...input,...ctx});
    return safeResult({status:evidence.status,context:ctx,public_evidence:evidence,event:event('research.scout.public_evidence.acquired',ctx,{status:evidence.status,body_sha256:evidence.body_sha256})});
  }
  if(auth.operation==='INGEST_EVIDENCE')return ingestScoutEvidence({context:ctx,evidence:input.evidence});
  if(auth.operation==='SCORE_CANDIDATE')return scoreScoutCandidate({context:ctx,candidate:input.candidate});
  if(auth.operation==='BUILD_DOSSIER')return buildScoutDossier({context:ctx,question:input.question,evidence_records:input.evidence_records,candidate_scores:input.candidate_scores});
  if(auth.operation==='REPLAY_VERIFY')return verifyScoutDossier(input.dossier);
  throw new Error('unreachable operation');
}

export const TECHNOLOGY_CAPABILITY_SCOUT_NATIVE_V1_CONTRACT=Object.freeze({
  schema_version:'1.0.0',capability_id:CAPABILITY_ID,owner_engine_id:OWNER_ENGINE_ID,environment:PREPROD,version:'1.0.0',
  context_fields:Object.freeze(['company_id','engine_id','environment','version']),operations:Object.freeze([...OPERATIONS]),gateway_required:true,
  existing_reused:Object.freeze(['web-acquisition-intelligence-profile-v1','public-source-adapter-v0','continuous-improvement-contract','evaluation-tribunal','EVT-001 event contract']),
  web_profile_owner:WEB_ACQUISITION_PROFILE_V1_CONTRACT.engine_id,public_adapter_method:PUBLIC_SOURCE_ADAPTER_V0_CONTRACT.method,
  deterministic_before_ai:true,ai_required:false,public_evidence_only:true,canonical_knowledge_write:false,source_evidence_separate_from_interpretation:true,
  captcha_bypass_allowed:false,auth_bypass_allowed:false,anti_abuse_evasion_allowed:false,external_code_execution:false,new_engine_created:false,new_paid_subscription_required:false,
  prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_target_eur:0
});
