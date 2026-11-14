#!/usr/bin/env node
/**
 * Executes the first existing source-grounded professional example through JOB-001
 * in an isolated GitHub runner. NOT an independent agent, training pass or PROD.
 * No web or model API calls; no customer data; only a SHA-256 receipt leaves runner.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {getSeoTrainingChallenge,enqueueSeoTrainingChallenge,
 receiveSeoTrainingAnswer,inspectSeoTrainingIntake}
 from './seo-phase2-training-intake-v1.mjs';
const source=new URL('../training-pilots/SEO-D05-SPECIALIST-01-SOURCE_APPLICATION_2026-11-06.md',import.meta.url);
const role_id='SEO-D05:SPECIALIST:01',case_id=role_id+':EXAM:01';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const fail=msg=>{throw Error('SEO_PILOT_'+msg)};
export function runExistingSeoPilot({journal_path,now_ms=1793960000000}={}){
 if(typeof journal_path!=='string'||journal_path.length<5)fail('JOURNAL_PATH');
 const answer=fs.readFileSync(source,'utf8');
 if(!answer.includes('post ID **1098**')||!answer.includes(case_id)||
  !answer.includes('no creada por un agente autónomo autenticado'))fail('NOT_ORIGINAL_UNCERTIFIED_PILOT');
 const challenge=getSeoTrainingChallenge({role_id,case_id});
 if(challenge.source_post_id!==1098||challenge.source_url!=='https://fenixcapital.es/notario-espanol-vs-frances-ingles-compraventa/')
  fail('SOURCE_CHANGED');
 const queued=enqueueSeoTrainingChallenge({file_path:journal_path,role_id,case_id,now_ms});
 let submission;
 if(queued.submission_received){
  submission=inspectSeoTrainingIntake({file_path:journal_path,job_id:queued.job_id});
  if(submission.answer_sha256!==sha(answer)||submission.status!=='SUCCEEDED')fail('EXISTING_JOB_CONFLICT');
 }else{
  submission=receiveSeoTrainingAnswer({file_path:journal_path,job_id:queued.job_id,
   role_id,case_id,answer,source_refs:[challenge.source_url],now_ms:now_ms+10});
 }
 const inspected=inspectSeoTrainingIntake({file_path:journal_path,job_id:queued.job_id});
 if(!inspected.completed||inspected.answer_sha256!==sha(answer)||
  inspected.certified_prod!==false||inspected.pending_d31_review!==true||
  inspected.pending_real_identity!==true)fail('INDEPENDENT_REPLAY_NOT_VERIFIED');
 return {schema_version:'1.0.0',status:'PROFESSIONAL_EXAMPLE_CAPTURED_JOB001_NOT_AGENT_TRAINED',
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  role_id,case_id,post_id:1098,challenge_sha256:challenge.challenge_sha256,
  journal_job_id:queued.job_id,answer_sha256:sha(answer),word_count:answer.trim().split(/\s+/).length,
  used_existing_frozen_corpus:true,external_fetches:0,model_api_calls:0,
  report_type:'HASHED_RECEIPT_ONLY_NOT_AGENT_CREDENTIAL',
  answered_by:'CHATGPT_INTERACTIVE_ASSISTANT_NO_AGENT_IAM',
  distinct_agent_identity_authenticated:false,qa_d31_passed:false,
  d32_training_certified:false,tribunal_accepted:false,
  future_real_actor_examination_required:true,
  prod_departments_certified:0,published:false,external_writes:0,
  additional_subscriptions_eur:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [journal_path,receipt_path]=process.argv.slice(2);
  if(!receipt_path||fs.existsSync(receipt_path))fail('NEW_RECEIPT_PATH_REQUIRED');
  const r=runExistingSeoPilot({journal_path});
  fs.writeFileSync(receipt_path,JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write(JSON.stringify({status:r.status,receipt_sha256:sha(JSON.stringify(r)),
   job_id:r.journal_job_id,certifications:0,external_writes:0})+'\n');
 }catch(e){process.stderr.write(String(e.message).slice(0,200)+'\n');process.exitCode=1;}
}
