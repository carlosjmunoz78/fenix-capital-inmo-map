#!/usr/bin/env node
/**
 * CEREBRO SEO Enterprise V2 / phase 1: assemble existing 32/141 contracts
 * into ONE shared, auditable, read-only control-plane manifest.
 *
 * No network, inference, accounts, subscriptions, website audits, STAGING,
 * publishing, deployment or production privileges. Never call this agent autonomy.
 * Existing JOB-001 orientation journal is reused, NOT enqueued again.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadFrozenSeoCorpus} from './seo-corpus-job001-work-v1.mjs';
import {listSeoDepartments,getSeoDepartmentKnowledge} from './seo-specialist-workforce-v2.mjs';
import {verifySeoKnowledgeOrientation} from './seo-workforce-orientation-v2.mjs';
import {buildSeoTrainingPacks} from './seo-ops-console-cli-v1.mjs';
import {allSeoRolePolicyBindings,seoRoleOwnerPolicy} from './seo-owner-role-governance-v1.mjs';
import {planSeoDirectorOrder,SEO_ORDER_TYPES} from './seo-director-order-router-v1.mjs';

const ROOT=new URL('../',import.meta.url);
const load=p=>JSON.parse(fs.readFileSync(new URL(p,ROOT),'utf8'));
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const REQUIRED=Object.freeze({
 company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
 source:'FROZEN_PROD_ACCEPTED_2026_11_05',
 gateway:'ACTGW-001',queue:'JOB-001',factory:'FACT-001',
 qa:'SEO-D31',training:'SEO-D32',tribunal:'SEO:GLOBAL:JUDGE',
 service_cost_eur:0,can_write_prod:false,can_publish:false
});
function deny(condition,reason){if(!condition)throw Error('SEO_V2_ASSEMBLY_'+reason)}
function safePath(x){
 deny(typeof x==='string'&&x.length>2&&x.length<4096,'JOURNAL_REQUIRED');
 return x;
}
export function assembleSeoV2ControlPlane({orientation_journal}={}){
 safePath(orientation_journal);
 const org=load('organization.manifest.json');
 const roles=load('seo-specialist-role-roster-v2.json');
 const operational=load('seo-operational-readonly-evidence-v1.json');
 const orientation=verifySeoKnowledgeOrientation({file_path:orientation_journal});
 deny(orientation.status==='LAB_CONTRACT_ORIENTATION_VERIFIED'&&
  orientation.unique_role_templates===141&&orientation.real_agents_certified===0,
  'JOB001_ORIENTATION_NOT_VERIFIED');
 deny(org.professional_family_count===8&&org.department_count===32&&
  org.departments.length===32&&roles.departments.length===32&&
  roles.counts.specialist_subagent_templates===141,'ORGANIZATION_DRIFT');
 deny(operational.baseline?.stored_urls===200&&
  operational.baseline?.media_library_images===629&&
  operational.baseline?.snapshot_date==='2026-11-05'&&
  operational.governance?.no_new_audit===true&&
  operational.governance?.staging_off===true,'ACCEPTED_CORPUS_REQUIRED');
 const corpus=loadFrozenSeoCorpus(); // reads ONLY 10 existing, pinned local JSON files
 deny(corpus.documents.length===200&&corpus.media_count===629&&
  corpus.preserved_snapshot===true&&corpus.wordpress_reaudited===false,
  'CORPUS_SNAPSHOT_MISMATCH');
 const courseware=buildSeoTrainingPacks();
 deny(courseware.size===33&&courseware.has('manifest.json'),'COURSEWARE_INCOMPLETE');
 const governance=allSeoRolePolicyBindings();
 deny(governance.role_count===191&&governance.roles.length===191&&
  governance.roles.every(r=>r.policy_id===governance.policy_id&&
   r.role_privileges_granted===false),'UNIVERSAL_GOVERNANCE_UNBOUND');
 const registered=new Map(org.departments.map(d=>[d.department_id,d]));
 const roster=new Map(roles.departments.map(d=>[d.department_id,d]));
 deny(registered.size===32&&roster.size===32,'DUPLICATE_DEPARTMENTS');
 const seen=new Set();
 const departments=[];
 for(const d of listSeoDepartments()){
  const entry=registered.get(d.department_id),r=roster.get(d.department_id);
  const knowledge=getSeoDepartmentKnowledge(d.department_id);
  deny(entry&&r&&entry.family_id===knowledge.family_id,'DEPARTMENT_BINDING_INVALID');
  deny(r.knowledge_pack==='knowledge/'+d.department_id+'.json'&&
    r.qa_department==='SEO-D31'&&r.training_department==='SEO-D32'&&
    knowledge.workforce.subagents.length===r.subagents.length,
    'INDEPENDENT_CONTROL_MISSING');
  deny(courseware.has(d.department_id+'.json'),'COURSEWARE_BINDING_MISSING');
  const ids=knowledge.workforce.subagents.map(x=>x.role_id);
  deny(ids.length>0&&ids.every(id=>r.subagents.includes(id))&&
    new Set(ids).size===ids.length,'SPECIALIST_ROLE_MISMATCH');
  for(const id of ids){deny(!seen.has(id),'DUPLICATE_ROLE');seen.add(id)}
  const bytes=fs.readFileSync(new URL('knowledge/'+d.department_id+'.json',ROOT));
  departments.push({
   department_id:d.department_id,family_id:entry.family_id,
   director_role:entry.family_id+':DIRECTOR',department_head:r.head,
   universal_owner_policy_id:seoRoleOwnerPolicy(r.head).policy_id,
   qa_department:'SEO-D31',training_department:'SEO-D32',
   tribunal:'SEO:GLOBAL:JUDGE',knowledge_pack:r.knowledge_pack,
   knowledge_sha256:hash(bytes),
   courseware_sha256:hash(courseware.get(d.department_id+'.json')),
   specialist_role_ids:ids,
   binding_state:'ASSEMBLED_AND_VERIFIED_READONLY_CONTRACT',
   verified_live_agent_identity:false,training_exam_passed:false,
   release_authorized:false,external_writes:0
  });
 }
 deny(seen.size===141,'SPECIALIST_COVERAGE_DRIFT');
 const routes=SEO_ORDER_TYPES.map((work_type,i)=>{
  const plan=planSeoDirectorOrder({
   company_id:'fenix',work_type,
   objective:'Preparar tarea de lectura desde el corpus PROD congelado sin publicar',
   request_ref:'SEO_ASSEMBLY_'+String(i).padStart(3,'0'),
   territory:'Córdoba',scope:'SITE'});
  deny(plan.only_proposal===true&&plan.wordpress_production_writes_allowed===false&&
   plan.historical_archive_operational===false&&
   plan.current_corpus_documents===200&&plan.current_corpus_images===629&&
   plan.operational_source_policy==='PROD_FROZEN_ONLY_NO_STAGING_NO_REAUDIT',
   'ROUTE_STALE_OR_UNSAFE');
  return {work_type,lead_department:plan.lead_department,
   collaborating_departments:plan.collaborating_departments,
   requires_owner_gateway:plan.required_gates.includes('REAL_TRUSTED_OWNER_GATEWAY'),
   permitted_stage:'PLAN_ONLY'};
 });
 const result={
  schema_version:'1.0.0',
  status:'SHARED_CONTROL_PLANE_ASSEMBLED_READONLY_LAB_NOT_AUTONOMOUS',
  ...REQUIRED,
  corpus:{date:'2026-11-05',documents:200,media_images:629,
   source_digest:corpus.corpus_digest,source_requests:0,
   source_name:'ACCEPTED_LOCAL_PROD_CORPUS',historical_staging_used:false},
  platform:{organization_families:8,departments:32,specialists:141,
   all_seo_role_templates:191,owner_excellence_governance_roles:governance.role_count,
   owner_excellence_governance_policy_id:governance.policy_id,
   owner_excellence_governance_sha256:governance.policy_sha256,
   route_types:routes.length,existing_orientation_job_receipts:orientation.journal_jobs,
   courseware_packets:32,one_shared_job_runtime:true,additional_servers:0,
   gateway_persistent_host_proven:false,github_actions_runtime_ephemeral:true,
   authenticated_individual_agent_principals:0,certified_prod_departments:0,
   auto_publication_enabled:false,paid_model_invocations:0},
  controls:{identity:'IAM_001_NOT_PROVISIONED',
   universal_owner_business_authority:'AUTHENTICATED_OWNER_ONLY',
   owner_general_exception_precedents:'THREE_VERIFIED_IDENTICAL_SCOPE_DECISIONS_CANDIDATE_ONLY',
   auto_promotion:false,
   qa:'D31_DEFINED_INDEPENDENT_REAL_MODEL_ASSESSMENT_PENDING',
   training:'D32_DEFINED_REAL_SUBJECT_MATTER_TRAINING_PENDING',
   tribunal:'NO_AUTONOMY_OR_REWARD_GRANTED',
   idempotence:'JOB001_ORIENTATION_JOURNAL_VERIFIED',
   rollback:'GIT_BRANCH_REVERT_AND_JOB001_JOURNAL_REPLAY_ONLY',
   production_data_mutated:false},
  departments,routes,
  stage_gate:'PHASE_1_WIRING_READONLY_ONLY',
  next_required:'PROVISION_TRUSTED_AGENT_IAM_AND_DURABLE_HOST_BEFORE_LIVE_EXECUTION'
 };
 const serialized=JSON.stringify(result);
 return {...result,assembly_sha256:hash(serialized)};
}
export function verifySeoV2Assembly({orientation_journal,manifest}={}){
 deny(manifest&&typeof manifest==='object','MANIFEST_REQUIRED');
 const expected=assembleSeoV2ControlPlane({orientation_journal});
 deny(JSON.stringify(manifest)===JSON.stringify(expected),'MANIFEST_NOT_REPRODUCIBLE');
 return {status:'ASSEMBLY_VERIFIED_READONLY',departments:32,role_bindings:141,
  route_types:12,certified_prod_departments:0,external_writes:0};
}
async function main(args){
 const [cmd,journal,out]=args;
 deny(['assemble','verify'].includes(cmd)&&journal&&out,'USAGE');
 const result=cmd==='assemble'
  ?assembleSeoV2ControlPlane({orientation_journal:journal})
  :verifySeoV2Assembly({orientation_journal:journal,
    manifest:JSON.parse(fs.readFileSync(out,'utf8'))});
 if(cmd==='assemble'){
  const target=path.resolve(out);
  deny(target!==path.parse(target).root&&!fs.existsSync(target),'OUTPUT_MUST_BE_NEW_FILE');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 }
 process.stdout.write(JSON.stringify({status:result.status,departments:32,
  specialists:141,production_certifications:0,external_writes:0})+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main(process.argv.slice(2)).catch(e=>{
  process.stderr.write(String(e.message).slice(0,240)+'\n');process.exitCode=1;
 });
}
