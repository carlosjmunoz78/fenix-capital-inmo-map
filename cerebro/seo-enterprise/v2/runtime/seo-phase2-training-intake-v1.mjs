#!/usr/bin/env node
/**
 * CEREBRO SEO V2 / phase 2 — real exercise response intake for future trusted actors.
 * Durable JOB-001 journal, one exact role and challenge, full answer fingerprint,
 * fail-closed read-only handoff. An answer is NOT proof of agent identity, professional
 * competence, independent QA, nor PROD certification. No website/network/AI API calls.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {DurableJobRuntimeV1} from '../../../runtime/durable-job-runtime-v1.mjs';
import {buildSeoPhase2AllRolesCurriculum} from './seo-phase2-all-roles-curriculum-v1.mjs';
import {seoRoleOwnerPolicy} from './seo-owner-role-governance-v1.mjs';
const ctx={company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'2.7.0'};
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const deny=(ok,code)=>{if(!ok)throw Error('SEO_TRAINING_INTAKE_'+code)};
const safeField=x=>typeof x==='string'&&x.length>=4&&x.length<=180&&
 !/[\x00-\x1f<>]/.test(x);
const rolePattern=/^(?:SEO-D(?:0[1-9]|[12][0-9]|3[0-2]):(?:SPECIALIST:\d{2}|DEPARTMENT_HEAD)|SEO-PF0[1-8]:(?:DIRECTOR|SUPERVISOR)|SEO:GLOBAL:(?:JUDGE|GUARDIAN))$/;
function safeAnswer(answer){
 deny(typeof answer==='string'&&answer.length>=120&&answer.length<=16000,'ANSWER_SIZE');
 deny(!/(?:\b(?:PASSWORD|CONTRASEÑA|API[_ -]?KEY|SECRET|BEARER|ACCESS[_ -]?TOKEN)\s*[:=])/i.test(answer),'SECRET_SHAPED_TEXT');
 deny(!/\b\d{8}[A-Z]\b/i.test(answer),'POSSIBLE_DNI');
 return answer;
}
export function getSeoTrainingChallenge({role_id,case_id}={}){
 deny(typeof role_id==='string'&&rolePattern.test(role_id),'ROLE');
 deny(safeField(case_id),'CASE');
 const c=buildSeoPhase2AllRolesCurriculum();
 const role=c.roles.find(x=>x.role_id===role_id),drill=c.drills.find(x=>x.case_id===case_id&&x.role_id===role_id);
 deny(Boolean(role&&drill)&&role.role_policy_id===c.owner_policy_id,'CASE_NOT_REGISTERED');
 const owner=seoRoleOwnerPolicy(role_id);
 deny(owner.directives.no_prod_writes===true,'OWNER_POLICY');
 const assign={
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'PREPROD',version:'2.7.0',
  role_id,role_kind:role.role_kind,case_id,round_id:drill.round_id,
  title:role.expertise,task:drill.task,expected_artifact:drill.expected_artifact,
  source_post_id:drill.source_post_id,source_url:drill.source_url,
  source_copy_sha256:drill.source_copy_sha256,
  accepted_corpus_digest:c.corpus_digest,
  owner_governance_policy_id:c.owner_policy_id,
  owner_policy_sha256:c.owner_policy_sha256,
  required_facts:drill.required_evidence_note,
  evidence_limits:'ONLY_APPROVED_FROZEN_PROD_CORPUS_NO_NEW_WEB_AUDIT',
  permitted_scope:'PREPROD_READONLY_TRAINING_RESPONSE',
  reviewer:'SEO-D31',trainer:'SEO-D32',tribunal:'SEO:GLOBAL:JUDGE',
  actor_iam_verified:false,independent_review_completed:false,
  publication_allowed:false,training_certified:false,spending_allowed:false
 };
 return {...assign,challenge_sha256:hash(JSON.stringify(assign))};
}
export function enqueueSeoTrainingChallenge({file_path,role_id,case_id,now_ms=Date.now()}={}){
 deny(typeof file_path==='string'&&file_path.length>3,'JOURNAL_REQUIRED');
 const challenge=getSeoTrainingChallenge({role_id,case_id});
 const journal=new DurableJobRuntimeV1({file_path});
 const saved=journal.enqueue({context:ctx,name:'SEO_REAL_EXAM_ANSWER_INTAKE_READONLY',
  idempotency_key:'seo-phase2-training:'+challenge.challenge_sha256,now_ms,
  priority:95,max_attempts:1,timeout_ms:30000,
  payload:{role_id,case_id,challenge_sha256:challenge.challenge_sha256,
   corpus_sha256:challenge.accepted_corpus_digest,external_write:false,
   publish:false,cost_eur:0}});
 return {job_id:saved.job.job_id,accepted:saved.accepted,duplicate:saved.duplicate,
  role_id,case_id,challenge_sha256:challenge.challenge_sha256,
  submission_received:saved.job.status==='SUCCEEDED',
  agent_iam_verified:false,training_certified:false,publish_allowed:false};
}
export function receiveSeoTrainingAnswer({file_path,job_id,role_id,case_id,answer,source_refs=[],now_ms=Date.now()}={}){
 deny(typeof file_path==='string'&&file_path.length>3,'JOURNAL_REQUIRED');
 deny(safeField(job_id),'JOB');
 const challenge=getSeoTrainingChallenge({role_id,case_id});
 safeAnswer(answer);
 deny(Array.isArray(source_refs)&&source_refs.length>=1&&source_refs.length<=12&&
  source_refs.every(x=>typeof x==='string'&&x.length>=6&&x.length<=400)&&
  source_refs.includes(challenge.source_url||'cerebro/seo-enterprise/v2/seo-owner-excellence-all-roles-policy-v1.json'),
  'SOURCE_PROVENANCE');
 const journal=new DurableJobRuntimeV1({file_path});
 const list=journal.listForContext(ctx).filter(x=>x.job_id===job_id);
 deny(list.length===1,'UNKNOWN_JOB');
 const job=list[0];
 deny(job.name==='SEO_REAL_EXAM_ANSWER_INTAKE_READONLY'&&
  job.payload.role_id===role_id&&job.payload.case_id===case_id&&
  job.payload.challenge_sha256===challenge.challenge_sha256&&
  job.payload.external_write===false&&job.payload.publish===false,
  'CHALLENGE_BINDING');
 deny(job.status==='QUEUED','NOT_QUEUED_OR_REPLAY');
 // Current intake is intentionally serialized; never claim another role's queued job.
 // A competing/earlier queued challenge must be processed by its own caller.
 const competing=journal.listForContext(ctx).filter(x=>
   (x.status==='QUEUED'||x.status==='RETRY_WAIT')&&x.job_id!==job_id);
 deny(competing.length===0,'MULTIPLE_PENDING_JOBS_REQUIRE_ORDERED_INTAKE');
 const claimed=journal.claim({context:ctx,worker_id:'SEO_PHASE2_INTAKE_UNAUTHENTICATED',now_ms,lease_ms:30000});
 deny(claimed?.job_id===job_id,'ISOLATION_OR_CLAIM_CONFLICT');
 const result={
   role_id,case_id,challenge_sha256:challenge.challenge_sha256,
   answer_sha256:hash(answer),source_refs,
   answer_text:answer,received_at_ms:now_ms,
   submission_type:'UNVERIFIED_ACTOR_DRAFT_ONLY',
   actor_identity_attested_by_trusted_provider:false,
   competence_grading_performed:false,independent_qa_performed:false,
   d32_training_certified:false,tribunal_accepted:false,
   owner_reward_or_permissions_granted:false,
   public_corpus_source_only:true,published:false,external_writes:0
 };
 journal.complete({job_id,worker_id:'SEO_PHASE2_INTAKE_UNAUTHENTICATED',
  now_ms:now_ms+1,result});
 return {
  status:'ANSWER_CAPTURED_PENDING_AGENT_IAM_AND_D31_D32',
  job_id,role_id,case_id,challenge_sha256:challenge.challenge_sha256,
  answer_sha256:result.answer_sha256,
  source_refs:source_refs.length,
  actor_iam_verified:false,professional_exam_passed:false,
  qa_completed:false,training_certified:false,prod_release:false,external_writes:0
 };
}
export function inspectSeoTrainingIntake({file_path,job_id}={}){
 deny(typeof file_path==='string'&&file_path.length>3&&safeField(job_id),'INSPECT_ARGS');
 const j=new DurableJobRuntimeV1({file_path});
 const found=j.listForContext(ctx).find(x=>x.job_id===job_id);
 deny(found?.name==='SEO_REAL_EXAM_ANSWER_INTAKE_READONLY','INSPECT_JOB');
 return {job_id,role_id:found.payload.role_id,case_id:found.payload.case_id,
  status:found.status,
  answer_sha256:found.result?.answer_sha256||null,
  completed:found.status==='SUCCEEDED',
  pending_real_identity:found.result?.actor_identity_attested_by_trusted_provider!==true,
  pending_d31_review:true,pending_d32_training:true,pending_tribunal:true,
  certified_prod:false,publish_authorized:false};
}
export function requireRealTrainingCertification({intake}={}){
 // No self-reported flags can certify: a distinct trusted provider IAM service,
 // independent D31/D32 and tribunal must verify externally in a future runtime.
 deny(intake?.actor_iam_verified===true&&intake?.qa_completed===true&&
  intake?.training_certified===true&&intake?.tribunal_accepted===true&&
  intake?.signed_external_evidence_verified===true,
  'UNVERIFIED_TRAINING_EVIDENCE');
 throw Error('SEO_TRAINING_INTAKE_EXTERNAL_VERIFIER_NOT_CONNECTED');
}
async function main(){
 const [command,file,role_id,case_id,extra]=process.argv.slice(2);
 deny(['challenge','queue','inspect'].includes(command),'CLI_USAGE');
 let out;
 if(command==='challenge')out=getSeoTrainingChallenge({role_id,case_id});
 if(command==='queue')out=enqueueSeoTrainingChallenge({file_path:file,role_id,case_id});
 if(command==='inspect')out=inspectSeoTrainingIntake({file_path:file,job_id:role_id});
 process.stdout.write(JSON.stringify(out,null,2)+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{process.stderr.write(String(e.message).slice(0,200)+'\n');process.exitCode=1});
}
