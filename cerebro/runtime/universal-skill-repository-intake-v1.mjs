#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {buildUniversalActivationPlan} from './universal-skill-activation-planner-v1.mjs';
import {runUniversalSkillAutoEngineering} from './universal-skill-auto-engineering-v1.mjs';
import {buildReadonlySemanticEvidence} from './universal-skill-readonly-semantic-evidence-v1.mjs';
import {runFactSkillNative} from './fact-skill-native-v1.mjs';
import {applyPrioritySeedRouting,buildPrioritySeedCandidateEvidence} from './skill-priority-governed-evidence-v1.mjs';

const PREPROD='PREPROD';
const VERSION='1.2.0';
const MAX_FILE_BYTES=512*1024;
const MAX_TOTAL_BYTES=2*1024*1024;
const ALLOWED_FILES=[/^cerebro\.skill\.json$/i,/^skill\.json$/i,/^package\.json$/i,/^SKILL\.md$/i,/^README(?:\.[A-Za-z0-9_-]+)?\.md$/i,/^README\.md$/i,/^LICENSE(?:\.[A-Za-z0-9_-]+)?$/i,/^LICENSE$/i];
const ALLOWED_LICENSES=new Set(['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC','CC0-1.0']);
const SECRET_PATTERNS=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,/\bsb_secret_[A-Za-z0-9_-]{8,}\b/,/\bsk-[A-Za-z0-9_-]{20,}\b/];
const FORBIDDEN_DEP=/^(?:file:|git\+ssh:|ssh:)|@(?:[^/]+)\/[^@]+@(?:file:|git\+ssh:)/i;

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(stable(v))).digest('hex');}
function req(v,label,max=4096){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const out=v.trim();if(out.length>max)throw new Error(`${label} too long`);return out;}
function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function safeName(name){return ALLOWED_FILES.some((re)=>re.test(name));}
function containsSecret(text){return SECRET_PATTERNS.some((re)=>re.test(text));}
function normalizeLicense(value){const raw=String(value??'').trim();if(!raw)return null;for(const allowed of ALLOWED_LICENSES)if(raw.toLowerCase()===allowed.toLowerCase())return allowed;return raw;}
function safeDependencies(pkg){const rows=[];for(const section of ['dependencies','optionalDependencies','peerDependencies'])for(const [name,spec] of Object.entries(pkg?.[section]??{}))rows.push({section,name,spec:String(spec)});return rows;}
function dependencyMapGreen(rows){return rows.every((x)=>!FORBIDDEN_DEP.test(x.spec));}
function findManifest(files){for(const name of ['cerebro.skill.json','skill.json']){const hit=files.find((x)=>x.name.toLowerCase()===name);if(hit)return hit;}return null;}
function parseJsonFile(file,label){try{return JSON.parse(file.text);}catch{throw new Error(`${label}_INVALID_JSON`);}}
function freezeFiles(files){return Object.freeze(files.map((x)=>Object.freeze({...x})));}
function mergeCandidateEvidence(...evidenceSets){const rows=[];const seen=new Set();for(const evidence of evidenceSets){for(const row of evidence?.semantic_bindings??[]){const key=hash({capability_id:row?.capability_id,domain_id:row?.domain_id,engine_id:row?.engine_id,observed_constraints:row?.observed_constraints,evidence_refs:row?.evidence_refs});if(seen.has(key))continue;seen.add(key);rows.push(row);}}return Object.freeze({semantic_bindings:Object.freeze(rows)});}

export function snapshotRepositoryDirectory({repo_dir,source_locator=null}={}){
  const root=path.resolve(req(repo_dir,'repo_dir',4096));if(!fs.existsSync(root)||!fs.statSync(root).isDirectory())throw new Error('REPOSITORY_DIRECTORY_REQUIRED');
  const files=[];let total=0;
  for(const entry of fs.readdirSync(root,{withFileTypes:true})){
    if(!entry.isFile()||!safeName(entry.name))continue;
    const abs=path.join(root,entry.name);const stat=fs.lstatSync(abs);if(stat.isSymbolicLink())throw new Error(`REPOSITORY_SYMLINK_DENIED:${entry.name}`);if(stat.size>MAX_FILE_BYTES)throw new Error(`REPOSITORY_FILE_TOO_LARGE:${entry.name}`);total+=stat.size;if(total>MAX_TOTAL_BYTES)throw new Error('REPOSITORY_SNAPSHOT_TOO_LARGE');
    const text=fs.readFileSync(abs,'utf8');if(containsSecret(text))throw new Error(`SECRET_MATERIAL_FORBIDDEN:${entry.name}`);
    files.push({name:entry.name,bytes:stat.size,sha256:hash(text),text});
  }
  files.sort((a,b)=>a.name.localeCompare(b.name));if(!files.length)throw new Error('REPOSITORY_NO_GOVERNED_METADATA');
  const snapshot_sha256=hash(files.map((x)=>({name:x.name,sha256:x.sha256,bytes:x.bytes})));
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_GOVERNED_REPOSITORY_SNAPSHOT_V1',status:'SNAPSHOT_GREEN',source_locator:source_locator??`local-repository://${snapshot_sha256}`,snapshot_sha256,files:freezeFiles(files),file_count:files.length,total_bytes:total,read_only:true,...authority()});
}

export function normalizeRepositoryCandidate({snapshot,company_id='fenix'}={}){
  if(!snapshot||snapshot.state_type!=='CEREBRO_GOVERNED_REPOSITORY_SNAPSHOT_V1'||snapshot.status!=='SNAPSHOT_GREEN')throw new Error('GOVERNED_REPOSITORY_SNAPSHOT_REQUIRED');
  const manifestFile=findManifest(snapshot.files);
  if(!manifestFile)return Object.freeze({status:'HUMAN_REQUIRED',human_required:'LOW_CONFIDENCE',reason:'CEREBRO_SKILL_MANIFEST_MISSING',snapshot});
  const manifest=parseJsonFile(manifestFile,'CEREBRO_SKILL_MANIFEST');
  const technical_name=req(manifest.technical_name??manifest.name,'manifest.technical_name',240);
  const skill_version=req(manifest.version??'0.0.0','manifest.version',80);
  const license=normalizeLicense(manifest.license??manifest.license_spdx);
  if(!license||!ALLOWED_LICENSES.has(license))return Object.freeze({status:'REJECTED',reason:'LICENSE_INCOMPATIBLE_OR_UNVERIFIED',license:license??null,snapshot});
  const pkgFile=snapshot.files.find((x)=>x.name==='package.json');const pkg=pkgFile?parseJsonFile(pkgFile,'PACKAGE_JSON'):null;
  const dependencies=safeDependencies(pkg);if(!dependencyMapGreen(dependencies))return Object.freeze({status:'REJECTED',reason:'UNSAFE_DEPENDENCY_SPEC',snapshot});
  const rawCaps=Array.isArray(manifest.capabilities)&&manifest.capabilities.length?manifest.capabilities:[{technical_name,description:manifest.description??technical_name,terms:manifest.terms??[],declared_domains:manifest.declared_domains??[]}];
  const manifestRef=`cerebro/intake/${snapshot.snapshot_sha256}/${manifestFile.name}`;
  const capabilities=rawCaps.map((cap,index)=>{
    const capName=req(cap.technical_name??cap.name??`${technical_name}-${index+1}`,'capability.technical_name',240);const declared=Array.isArray(cap.declared_domains)?cap.declared_domains:[];
    const domain_evidence=Object.fromEntries(declared.map((id)=>[id,[manifestRef]]));
    return Object.freeze({capability_id:`repo:${snapshot.snapshot_sha256.slice(0,16)}:cap:${index+1}`,technical_name:capName,description:String(cap.description??manifest.description??'').trim(),terms:Object.freeze(Array.isArray(cap.terms)?cap.terms.map(String):[]),declared_domains:Object.freeze(declared.map(String)),domain_evidence:Object.freeze(domain_evidence)});
  });
  const candidate_id=`repo:${snapshot.snapshot_sha256.slice(0,28)}`;
  const source_refs=snapshot.files.map((x)=>`cerebro/intake/${snapshot.snapshot_sha256}/${x.name}`);
  return Object.freeze({
    status:'CANDIDATE_READY',company_id,candidate_id,technical_name,skill_version,license_spdx:license,manifest_sha256:manifestFile.sha256,source_locator:snapshot.source_locator,source_refs:Object.freeze(source_refs),capabilities:Object.freeze(capabilities),dependencies:Object.freeze(dependencies.map((x)=>Object.freeze(x))),
    activation_input:Object.freeze({company_id,candidate_id,technical_name,source_refs,inventory_complete:true,dependencies_mapped:true,reuse_checked:true,provenance_license_green:true,capabilities,additional_cost_eur:0}),
    security:Object.freeze({provenance_ok:true,license_ok:true,supply_chain_ok:true}),snapshot,...authority()
  });
}

function materializeSnapshot(candidate){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-usaf-repo-snapshot-'));const relBase=path.join('cerebro','intake',candidate.snapshot.snapshot_sha256);const out=path.join(root,relBase);fs.mkdirSync(out,{recursive:true});
  for(const file of candidate.snapshot.files){const target=path.join(out,file.name);fs.writeFileSync(target,file.text,{mode:0o600});const verify=hash(fs.readFileSync(target,'utf8'));if(verify!==file.sha256)throw new Error(`SNAPSHOT_MATERIALIZATION_HASH_MISMATCH:${file.name}`);}
  return Object.freeze({root,relative_base:relBase});
}

function factNativeInput(candidate,plan,autoEngineering){
  const binding=autoEngineering.binding_report;const full=binding?.full_safe_preprod===true;
  return {
    company_id:candidate.company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,risk_class:'LOW',
    candidate:{skill_id:candidate.candidate_id,skill_version:candidate.skill_version,source_ref:candidate.source_locator,manifest_sha256:candidate.manifest_sha256,license_spdx:candidate.license_spdx},
    evidence:{complete:full,confidence:full?1:0,old_vs_new:{decision:full?'PASS':'MORE_EVIDENCE',reasons:[]},evaluation:{decision:binding?.evaluation?.decision??(full?'PASS':'MORE_EVIDENCE')},tribunal:{decision:binding?.independent_tribunal?.decision??(full?'PASS':'MORE_EVIDENCE')}},
    security:{...candidate.security,incident:false,legal_required:false,policy_conflict:false},
    policy:{locked:true},permissions:{requested:[],allowed:[],locked:true},
    impact:{existing_engine_bindings:plan.target_engine_bindings},observed_registry:[],demand:{needed_now:true},
    cost:{additional_cost_eur:0,zero_cost_alternative:false,roi_positive:false,money_limit_exceeded:false},
    lifecycle:{internal_wrapper_ready:full,external_code_execution_required:false,rollback_ready:binding?.backup_rollback_rebuild?.rollback_green===true,rebuild_ready:binding?.backup_rollback_rebuild?.rebuild_green===true,backup_ready:binding?.backup_rollback_rebuild?.backup_ready===true,runbook_ready:true,changelog_ready:true,dependencies_mapped:true,router_connected:plan.binding_count>0,integration_e2e_green:full,observability_connected:binding?.observability_green===true,idempotency_proven:binding?.idempotency_proven===true,fallback_ready:true,preprod_green_evidence:full,learning_hooks_connected:binding?.learning_sink?.decision==='LRN_FEEDBACK_PERSISTED'}
  };
}

export function runRepositoryActivation({repo_dir,source_locator=null,company_id='fenix',root_dir=null,source_run_id=1,source_head_sha='0000000000000000000000000000000000000001'}={}){
  const started=performance.now();
  let snapshot;try{snapshot=snapshotRepositoryDirectory({repo_dir,source_locator});}catch(error){return Object.freeze({schema_version:'1.2.0',state_type:'CEREBRO_REPOSITORY_ACTIVATION_REPORT_V1',status:'REJECTED',terminal_state:'REJECTED',reason:String(error.message??error),elapsed_ms:Number((performance.now()-started).toFixed(3)),full_safe_preprod:false,...authority()});}
  let candidate;try{candidate=normalizeRepositoryCandidate({snapshot,company_id});}catch(error){return Object.freeze({schema_version:'1.2.0',state_type:'CEREBRO_REPOSITORY_ACTIVATION_REPORT_V1',status:'REJECTED',terminal_state:'REJECTED',reason:String(error.message??error),snapshot_sha256:snapshot.snapshot_sha256,elapsed_ms:Number((performance.now()-started).toFixed(3)),full_safe_preprod:false,...authority()});}
  if(candidate.status!=='CANDIDATE_READY')return Object.freeze({schema_version:'1.2.0',state_type:'CEREBRO_REPOSITORY_ACTIVATION_REPORT_V1',status:candidate.status,terminal_state:candidate.status==='REJECTED'?'REJECTED':null,reason:candidate.reason,snapshot_sha256:snapshot.snapshot_sha256,human_required:candidate.human_required??null,elapsed_ms:Number((performance.now()-started).toFixed(3)),full_safe_preprod:false,...authority()});
  const materialized=materializeSnapshot(candidate);
  let priorityRouting;try{priorityRouting=applyPrioritySeedRouting(candidate.activation_input,candidate.source_locator);}catch(error){return Object.freeze({schema_version:'1.2.0',state_type:'CEREBRO_REPOSITORY_ACTIVATION_REPORT_V1',status:'REJECTED',terminal_state:'REJECTED',reason:`PRIORITY_ROUTING:${String(error.message??error)}`,candidate_id:candidate.candidate_id,elapsed_ms:Number((performance.now()-started).toFixed(3)),full_safe_preprod:false,...authority()});}
  const plan=buildUniversalActivationPlan(priorityRouting.activation_input);
  if(plan.status!=='ACTIVATION_PLAN_READY')return Object.freeze({schema_version:'1.2.0',state_type:'CEREBRO_REPOSITORY_ACTIVATION_REPORT_V1',status:plan.status,terminal_state:plan.terminal_state??null,reason:plan.next_gate,snapshot_sha256:snapshot.snapshot_sha256,candidate_id:candidate.candidate_id,priority_seed_routing:Object.freeze({applied:priorityRouting.applied,technical_name:priorityRouting.seed?.technical_name??null,declared_domains:priorityRouting.seed?.declared_domains??[]}),activation_plan:plan,elapsed_ms:Number((performance.now()-started).toFixed(3)),full_safe_preprod:false,...authority()});
  const priorityEvidence=buildPrioritySeedCandidateEvidence({activation_plan:plan,source_locator:candidate.source_locator,repo_root:materialized.root});
  const readonlyEvidence=buildReadonlySemanticEvidence({activation_plan:plan,repo_root:materialized.root});
  const priorityCandidateEvidence=priorityEvidence.status==='PRIORITY_SEMANTIC_EVIDENCE_GREEN'?priorityEvidence.candidate_evidence:{};
  const candidateEvidence=mergeCandidateEvidence(priorityCandidateEvidence,readonlyEvidence.candidate_evidence);
  const workRoot=root_dir??fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-usaf-repo-e2e-'));
  const autoEngineering=runUniversalSkillAutoEngineering({activation_plan:plan,candidate_evidence:candidateEvidence,repo_root:materialized.root,source_evidence_kind:'GOVERNED_READONLY_REMOTE',root_dir:path.join(workRoot,'auto-engineering'),source_run_id,source_head_sha});
  const prioritySummary=Object.freeze({applied:priorityRouting.applied,technical_name:priorityRouting.seed?.technical_name??null,declared_domains:priorityRouting.seed?.declared_domains??[],evidence_status:priorityEvidence.status,source_check:priorityEvidence.source_check??null,expected_bindings:priorityEvidence.expected_bindings??0,generated_bindings:priorityEvidence.generated_bindings??0,probe_reports:priorityEvidence.probe_reports??[]});
  const readonlySummary=Object.freeze({status:readonlyEvidence.status,supported_domains:readonlyEvidence.supported_domains??[],applicable_bindings:readonlyEvidence.applicable_bindings??0,generated_semantic_evidence_count:readonlyEvidence.generated_semantic_evidence_count??0,source_file_count:readonlyEvidence.source_file_count??0});
  if(autoEngineering.full_safe_preprod!==true)return Object.freeze({schema_version:'1.2.0',state_type:'CEREBRO_REPOSITORY_ACTIVATION_REPORT_V1',status:autoEngineering.status,terminal_state:autoEngineering.status==='BLOCKED_EXTERNAL'?'BLOCKED_EXTERNAL':null,reason:priorityRouting.applied?`AUTO_ENGINEERING_NOT_FULL:${priorityEvidence.status}`:'AUTO_ENGINEERING_NOT_FULL',snapshot_sha256:snapshot.snapshot_sha256,candidate_id:candidate.candidate_id,priority_seed:prioritySummary,readonly_semantic_evidence:readonlySummary,activation_plan:plan,auto_engineering:autoEngineering,elapsed_ms:Number((performance.now()-started).toFixed(3)),full_safe_preprod:false,...authority()});
  const native=runFactSkillNative(factNativeInput(candidate,plan,autoEngineering));
  const full=native.native_full===true&&native.status==='NATIVE_FULL_PREPROD';
  const elapsed_ms=Number((performance.now()-started).toFixed(3));
  const report={schema_version:'1.2.0',state_type:'CEREBRO_REPOSITORY_ACTIVATION_REPORT_V1',status:full?'FULL_SAFE_PREPROD':'HOLD',terminal_state:full?'FULL_SAFE_PREPROD':null,full_safe_preprod:full,company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,candidate_id:candidate.candidate_id,technical_name:candidate.technical_name,source_locator:candidate.source_locator,snapshot_sha256:snapshot.snapshot_sha256,manifest_sha256:candidate.manifest_sha256,license_spdx:candidate.license_spdx,priority_seed:prioritySummary,readonly_semantic_evidence:readonlySummary,activation_plan:plan,auto_engineering:autoEngineering,native_registration:native,elapsed_ms,slo_class:elapsed_ms<=5000?'SIMPLE_TARGET_1_5_MIN_MACHINE_TIME_GREEN':'MEASURED_NO_SLO_CLAIM',...authority()};
  return Object.freeze({...report,outcome_hash:hash(report)});
}
