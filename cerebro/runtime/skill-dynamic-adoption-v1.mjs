#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const VERSION='1.1.0';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REGISTRY=path.resolve(HERE,'../registry/skill-dynamic-adoption-v1.json');
const SHA40=/^[a-f0-9]{40}$/i;
const HASH64=/^[a-f0-9]{64}$/i;
const ALLOWED_MODES=new Set(['ADVISE','ANALYZE','REVIEW','PLAN','READONLY_OBSERVE']);
const PENDING='FULL_SAFE_PREPROD_PENDING_PROD_READONLY_CANARY';
const AVAILABLE='PROD_CAPABILITY_AVAILABLE_READONLY';

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map((k)=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_authorized:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function req(v,label,max=4096){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const out=v.trim();if(out.length>max)throw new Error(`${label} too long`);return out;}
function safeBindings(value){if(!Array.isArray(value)||value.length===0)throw new Error('target_engine_bindings required');const rows=[...new Set(value.map((x)=>req(String(x),'engine_id',80)))].sort();if(rows.some((x)=>!/[A-Z0-9-]+/.test(x)))throw new Error('unsafe engine binding');if(rows.some((x)=>/TRAD|TRADING/i.test(x)))throw new Error('TRADING_BINDING_DENIED');return rows;}
function validateIdentity(row){req(row.candidate_id,'candidate_id',200);req(row.technical_name,'technical_name',240);req(row.source_locator,'source_locator',2048);if(!SHA40.test(String(row.pinned_sha??'')))throw new Error('pinned_sha required');for(const key of ['snapshot_sha256','manifest_sha256','outcome_hash'])if(!HASH64.test(String(row[key]??'')))throw new Error(`${key} required`);}
function closureGreen(c={}){return c.full_safe_preprod===true&&c.per_binding_old_vs_new_pass===true&&c.tribunal_pass===true&&c.learning_feedback_green===true&&c.observability_green===true&&c.finops_green===true&&c.audit_green===true&&c.backup_ready===true&&c.rollback_green===true&&c.rebuild_green===true&&c.idempotency_proven===true&&Number(c.cost_eur??-1)===0&&Number(c.binding_count??0)>0;}
function safeContracts(value,bindings){if(!Array.isArray(value)||value.length===0)throw new Error('capability_contracts required');const allowed=new Set(bindings);const rows=value.map((cap)=>Object.freeze({capability_id:req(String(cap.capability_id),'capability_id',240),technical_name:req(String(cap.technical_name),'capability technical_name',240),description:String(cap.description??'').slice(0,1200),domains:Object.freeze((cap.domains??[]).map((d)=>{const engine_bindings=safeBindings(d.engine_bindings??[]);if(engine_bindings.some((x)=>!allowed.has(x)))throw new Error('CAPABILITY_BINDING_OUTSIDE_TARGET_SET');return Object.freeze({domain_id:req(String(d.domain_id),'domain_id',160),engine_bindings:Object.freeze(engine_bindings)});} ))}));if(rows.some((x)=>x.domains.length===0))throw new Error('capability domains required');return Object.freeze(rows);}
function capabilityIdentity(base){return {candidate_id:base.candidate_id,technical_name:base.technical_name,source_locator:base.source_locator,pinned_sha:base.pinned_sha,snapshot_sha256:base.snapshot_sha256,manifest_sha256:base.manifest_sha256,outcome_hash:base.outcome_hash,target_engine_bindings:base.target_engine_bindings,capability_contracts:base.capability_contracts,closure_summary:base.closure_summary,company_id:base.company_id};}
function safeCanaryName(row){const name=String(row.technical_name??'CAPABILITY').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,48)||'CAPABILITY';return `GREEN_DYNAMIC_${name}_${hash({candidate_id:row.candidate_id,pinned_sha:row.pinned_sha}).slice(0,8).toUpperCase()}_PROD_READONLY_CANARY`;}

export function candidateFromQueueResult(row,{observed_at=new Date().toISOString()}={}){
  if(row?.status!=='FULL_SAFE_PREPROD'||row?.full_safe_preprod!==true)throw new Error('FULL_SAFE_PREPROD_REQUIRED');
  if(row?.human_required!=null)throw new Error('HUMAN_REQUIRED_ACTIVE');
  if(Number(row?.additional_cost_eur??0)!==0)throw new Error('ZERO_ADDITIONAL_COST_REQUIRED');
  if(row?.prod_write_authorized===true||row?.prod_mutation_authorized===true||row?.external_skill_code_execution===true||row?.trading_access===true)throw new Error('UNSAFE_AUTHORITY');
  if(row?.learning_impact_status!=='LRN_IMPACT_GREEN_PREPROD')throw new Error('LRN_IMPACT_GREEN_PREPROD_REQUIRED');
  if(!closureGreen(row?.closure_summary))throw new Error('FULL_CLOSURE_SUMMARY_GREEN_REQUIRED');
  validateIdentity(row);const target_engine_bindings=safeBindings(row.target_engine_bindings);const capability_contracts=safeContracts(row.capability_contracts,target_engine_bindings);
  const base={candidate_id:row.candidate_id,technical_name:row.technical_name,source_locator:row.source_locator,pinned_sha:String(row.pinned_sha).toLowerCase(),snapshot_sha256:String(row.snapshot_sha256).toLowerCase(),manifest_sha256:String(row.manifest_sha256).toLowerCase(),outcome_hash:String(row.outcome_hash).toLowerCase(),target_engine_bindings,capability_contracts,closure_summary:Object.freeze({...row.closure_summary}),company_id:String(row.company_id??'fenix'),environment:'PREPROD',version:VERSION,status:PENDING,current_scope:'INTERNAL_NORMALIZED_WRAPPER_READONLY_PENDING_CANARY',current_evidence:null,observed_at,learning_impact_status:row.learning_impact_status,...authority()};
  return Object.freeze({...base,capability_hash:hash(capabilityIdentity(base))});
}

export function mergeDynamicCandidates({registry,candidates}){
  if(registry?.state_type!=='CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1')throw new Error('DYNAMIC_REGISTRY_REQUIRED');
  if(!Array.isArray(candidates))throw new Error('candidates required');const byId=new Map((registry.capabilities??[]).map((x)=>[x.candidate_id,x]));let inserted=0,updated=0;
  for(const candidate of candidates){const prior=byId.get(candidate.candidate_id);if(!prior){byId.set(candidate.candidate_id,candidate);inserted+=1;continue;}if(prior.capability_hash!==candidate.capability_hash&&prior.status!==AVAILABLE){byId.set(candidate.candidate_id,candidate);updated+=1;}}
  const capabilities=[...byId.values()].sort((a,b)=>String(a.technical_name).localeCompare(String(b.technical_name))||String(a.candidate_id).localeCompare(String(b.candidate_id)));
  return Object.freeze({...registry,schema_version:'1.1.0',version:'v1.1',capabilities:Object.freeze(capabilities),summary:Object.freeze({total:capabilities.length,inserted,updated,pending_canary:capabilities.filter((x)=>x.status===PENDING).length,prod_readonly:capabilities.filter((x)=>x.status===AVAILABLE).length})});
}

export function registryFromQueueReport({queueReport,registryFile=DEFAULT_REGISTRY,observed_at}={}){
  if(queueReport?.status!=='QUEUE_TERMINAL_GREEN')throw new Error('QUEUE_TERMINAL_GREEN_REQUIRED');const registry=JSON.parse(fs.readFileSync(registryFile,'utf8'));
  const candidates=[];for(const row of queueReport.results??[]){if(row.status==='FULL_SAFE_PREPROD'&&row.full_safe_preprod===true&&row.human_required==null&&Array.isArray(row.target_engine_bindings)&&row.target_engine_bindings.length)candidates.push(candidateFromQueueResult(row,{observed_at}));}
  return mergeDynamicCandidates({registry,candidates});
}

export function runDynamicProdReadonlyCanary({candidate,head_sha,run_id,ref='refs/heads/main'}={}){
  if(candidate?.status!==PENDING)throw new Error('PENDING_DYNAMIC_CAPABILITY_REQUIRED');if(ref!=='refs/heads/main')throw new Error('CANONICAL_MAIN_REF_REQUIRED');if(!SHA40.test(String(head_sha??'')))throw new Error('CANONICAL_HEAD_SHA_REQUIRED');if(!Number.isInteger(Number(run_id))||Number(run_id)<=0)throw new Error('CANARY_RUN_ID_REQUIRED');
  const bindings=safeBindings(candidate.target_engine_bindings);const contracts=safeContracts(candidate.capability_contracts,bindings);if(!closureGreen(candidate.closure_summary))throw new Error('CLOSURE_NOT_GREEN');if(candidate.external_skill_code_execution!==false||candidate.prod_write_authorized!==false||candidate.prod_mutation_authorized!==false||candidate.trading_access!==false||Number(candidate.additional_cost_eur)!==0)throw new Error('UNSAFE_DYNAMIC_CAPABILITY');
  const covered=new Set(contracts.flatMap((c)=>c.domains.flatMap((d)=>d.engine_bindings)));if(bindings.some((x)=>!covered.has(x)))throw new Error('ENGINE_BINDING_NOT_COVERED_BY_CONTRACT');
  return Object.freeze({status:safeCanaryName(candidate),candidate_id:candidate.candidate_id,technical_name:candidate.technical_name,head_sha:String(head_sha).toLowerCase(),run_id:Number(run_id),ref,checked_bindings:Object.freeze(bindings),checked_modes:Object.freeze([...ALLOWED_MODES]),side_effects:false,external_skill_code_execution:false,prod_write_authorized:false,prod_mutation_authorized:false,trading_access:false,additional_cost_eur:0});
}

export function promotePendingCandidates({registry,head_sha,run_id,ref='refs/heads/main',observed_at=new Date().toISOString()}={}){
  if(registry?.state_type!=='CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1')throw new Error('DYNAMIC_REGISTRY_REQUIRED');let promoted=0;const capabilities=(registry.capabilities??[]).map((row)=>{if(row.status!==PENDING)return row;const canary=runDynamicProdReadonlyCanary({candidate:row,head_sha,run_id,ref});promoted+=1;return Object.freeze({...row,environment:'PROD_CAPABILITY',status:AVAILABLE,current_scope:'READONLY_ADVISORY_ANALYZE_REVIEW_PLAN_OBSERVE',current_evidence:canary.status,canary:Object.freeze({...canary,observed_at}),promoted_at:observed_at,...authority()});});return Object.freeze({...registry,schema_version:'1.1.0',version:'v1.1',capabilities:Object.freeze(capabilities),summary:Object.freeze({total:capabilities.length,promoted,pending_canary:capabilities.filter((x)=>x.status===PENDING).length,prod_readonly:capabilities.filter((x)=>x.status===AVAILABLE).length})});
}

export function resolveDynamicSkillCapability({candidate_id,engine_id,requested_mode='ANALYZE',registryFile=DEFAULT_REGISTRY,registry=null}={}){
  const data=registry??JSON.parse(fs.readFileSync(registryFile,'utf8'));const row=(data.capabilities??[]).find((x)=>x.candidate_id===candidate_id);if(!row||row.status!==AVAILABLE)return Object.freeze({allowed:false,status:'DENY_NOT_DYNAMIC_PROD_READONLY',candidate_id,engine_id,requested_mode,...authority()});if(!ALLOWED_MODES.has(requested_mode))return Object.freeze({allowed:false,status:'DENY_MODE_NOT_READONLY',candidate_id,engine_id,requested_mode,...authority()});if(!row.target_engine_bindings?.includes(engine_id))return Object.freeze({allowed:false,status:'DENY_ENGINE_BINDING_MISMATCH',candidate_id,engine_id,requested_mode,...authority()});if(!/^GREEN_DYNAMIC_[A-Z0-9_]+_PROD_READONLY_CANARY$/.test(String(row.current_evidence??'')))return Object.freeze({allowed:false,status:'DENY_CANARY_EVIDENCE_INVALID',candidate_id,engine_id,requested_mode,...authority()});const contracts=row.capability_contracts.map((cap)=>({...cap,domains:cap.domains.filter((d)=>d.engine_bindings.includes(engine_id))})).filter((cap)=>cap.domains.length);return Object.freeze({allowed:true,status:AVAILABLE,candidate_id,row_version:row.version,technical_name:row.technical_name,engine_id,requested_mode,capability_mode:'INTERNAL_NORMALIZED_SEMANTIC_CAPABILITY_READONLY',capability_contracts:Object.freeze(contracts),source_locator:row.source_locator,pinned_sha:row.pinned_sha,current_evidence:row.current_evidence,action_authority_source:'ORIGIN_ENGINE_GOVERNED_POLICY_ONLY',...authority()});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const output=req(arg('--output')??DEFAULT_REGISTRY,'--output');let registry;
    if(arg('--promote')){const input=req(arg('--promote'),'--promote');registry=JSON.parse(fs.readFileSync(input,'utf8'));registry=promotePendingCandidates({registry,head_sha:req(arg('--head-sha')??process.env.GITHUB_SHA,'--head-sha',80),run_id:Number(arg('--run-id')??process.env.GITHUB_RUN_ID),ref:arg('--ref')??process.env.GITHUB_REF??'refs/heads/main'});}
    else{const input=req(arg('--queue-report'),'--queue-report');const report=JSON.parse(fs.readFileSync(input,'utf8'));registry=registryFromQueueReport({queueReport:report,registryFile:arg('--registry')??DEFAULT_REGISTRY});}
    fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(registry,null,2)}\n`,'utf8');process.stdout.write(`${JSON.stringify({status:'DYNAMIC_ADOPTION_REGISTRY_GREEN',output,total:registry.summary?.total??registry.capabilities?.length??0,inserted:registry.summary?.inserted??0,updated:registry.summary?.updated??0,promoted:registry.summary?.promoted??0,pending_canary:registry.summary?.pending_canary??0,prod_readonly:registry.summary?.prod_readonly??0,...authority()})}\n`);
  }catch(error){process.stderr.write(`${JSON.stringify({status:'RED_FAIL_CLOSED',error:String(error?.message??error),...authority()})}\n`);process.exitCode=1;}
}
