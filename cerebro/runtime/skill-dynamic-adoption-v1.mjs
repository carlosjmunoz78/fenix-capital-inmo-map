#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const VERSION='1.0.0';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REGISTRY=path.resolve(HERE,'../registry/skill-dynamic-adoption-v1.json');
const SHA40=/^[a-f0-9]{40}$/i;
const HASH64=/^[a-f0-9]{64}$/i;

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map((k)=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_authorized:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function req(v,label,max=4096){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const out=v.trim();if(out.length>max)throw new Error(`${label} too long`);return out;}
function safeBindings(value){if(!Array.isArray(value)||value.length===0)throw new Error('target_engine_bindings required');const rows=[...new Set(value.map((x)=>req(String(x),'engine_id',80)))].sort();if(rows.some((x)=>!/[A-Z0-9-]+/.test(x)))throw new Error('unsafe engine binding');return rows;}
function validateIdentity(row){req(row.candidate_id,'candidate_id',200);req(row.technical_name,'technical_name',240);req(row.source_locator,'source_locator',2048);if(!SHA40.test(String(row.pinned_sha??'')))throw new Error('pinned_sha required');for(const key of ['snapshot_sha256','manifest_sha256','outcome_hash'])if(!HASH64.test(String(row[key]??'')))throw new Error(`${key} required`);}

export function candidateFromQueueResult(row,{observed_at=new Date().toISOString()}={}){
  if(row?.status!=='FULL_SAFE_PREPROD'||row?.full_safe_preprod!==true)throw new Error('FULL_SAFE_PREPROD_REQUIRED');
  if(row?.human_required!=null)throw new Error('HUMAN_REQUIRED_ACTIVE');
  if(Number(row?.additional_cost_eur??0)!==0)throw new Error('ZERO_ADDITIONAL_COST_REQUIRED');
  if(row?.prod_write_authorized===true||row?.prod_mutation_authorized===true||row?.external_skill_code_execution===true||row?.trading_access===true)throw new Error('UNSAFE_AUTHORITY');
  validateIdentity(row);const target_engine_bindings=safeBindings(row.target_engine_bindings);
  const capability={
    candidate_id:row.candidate_id,technical_name:row.technical_name,source_locator:row.source_locator,pinned_sha:String(row.pinned_sha).toLowerCase(),snapshot_sha256:String(row.snapshot_sha256).toLowerCase(),manifest_sha256:String(row.manifest_sha256).toLowerCase(),outcome_hash:String(row.outcome_hash).toLowerCase(),target_engine_bindings,
    company_id:String(row.company_id??'fenix'),environment:'PREPROD',version:VERSION,status:'FULL_SAFE_PREPROD_PENDING_PROD_READONLY_CANARY',current_scope:'INTERNAL_NORMALIZED_WRAPPER_READONLY_PENDING_CANARY',current_evidence:null,observed_at,learning_impact_status:row.learning_impact_status??null,...authority()
  };
  return Object.freeze({...capability,capability_hash:hash(capability)});
}

export function mergeDynamicCandidates({registry,candidates}){
  if(registry?.state_type!=='CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1')throw new Error('DYNAMIC_REGISTRY_REQUIRED');
  if(!Array.isArray(candidates))throw new Error('candidates required');const byId=new Map((registry.capabilities??[]).map((x)=>[x.candidate_id,x]));let inserted=0,updated=0;
  for(const candidate of candidates){const prior=byId.get(candidate.candidate_id);if(!prior){byId.set(candidate.candidate_id,candidate);inserted+=1;continue;}if(prior.capability_hash!==candidate.capability_hash&&prior.status!=='PROD_CAPABILITY_AVAILABLE_READONLY'){byId.set(candidate.candidate_id,candidate);updated+=1;}}
  const capabilities=[...byId.values()].sort((a,b)=>String(a.technical_name).localeCompare(String(b.technical_name))||String(a.candidate_id).localeCompare(String(b.candidate_id)));
  return Object.freeze({...registry,schema_version:'1.0.0',version:'v1',capabilities:Object.freeze(capabilities),summary:Object.freeze({total:capabilities.length,inserted,updated,pending_canary:capabilities.filter((x)=>x.status==='FULL_SAFE_PREPROD_PENDING_PROD_READONLY_CANARY').length,prod_readonly:capabilities.filter((x)=>x.status==='PROD_CAPABILITY_AVAILABLE_READONLY').length})});
}

export function registryFromQueueReport({queueReport,registryFile=DEFAULT_REGISTRY,observed_at}={}){
  if(queueReport?.status!=='QUEUE_TERMINAL_GREEN')throw new Error('QUEUE_TERMINAL_GREEN_REQUIRED');const registry=JSON.parse(fs.readFileSync(registryFile,'utf8'));
  const candidates=[];for(const row of queueReport.results??[]){if(row.status==='FULL_SAFE_PREPROD'&&row.full_safe_preprod===true&&row.human_required==null&&Array.isArray(row.target_engine_bindings)&&row.target_engine_bindings.length)candidates.push(candidateFromQueueResult(row,{observed_at}));}
  return mergeDynamicCandidates({registry,candidates});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const input=req(arg('--queue-report'),'--queue-report');const output=req(arg('--output')??DEFAULT_REGISTRY,'--output');const report=JSON.parse(fs.readFileSync(input,'utf8'));const registry=registryFromQueueReport({queueReport:report});fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(registry,null,2)}\n`,'utf8');process.stdout.write(`${JSON.stringify({status:'DYNAMIC_ADOPTION_REGISTRY_GREEN',output,total:registry.summary.total,inserted:registry.summary.inserted,updated:registry.summary.updated,pending_canary:registry.summary.pending_canary,prod_readonly:registry.summary.prod_readonly,...authority()})}\n`);}catch(error){process.stderr.write(`${JSON.stringify({status:'RED_FAIL_CLOSED',error:String(error?.message??error),...authority()})}\n`);process.exitCode=1;}}
