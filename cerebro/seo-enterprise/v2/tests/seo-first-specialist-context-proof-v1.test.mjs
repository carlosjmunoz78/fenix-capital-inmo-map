import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {executeSeoCorpusViaGateway} from '../runtime/seo-corpus-job001-work-v1.mjs';
import {firstSpecialistWorkerReceipt,firstSpecialistQaReceipt,firstSpecialistTribunalReceipt}
 from '../runtime/seo-first-specialist-context-proof-v1.mjs';
const identity=(kind,n)=>({
 status:'GITHUB_OIDC_JWKS_AND_API_JOB_VERIFIED',
 company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
 role:{worker:'SEO_CORPUS_WORKER',qa:'SEO_CORPUS_INDEPENDENT_QA',tribunal:'SEO_CORPUS_TRIBUNAL'}[kind],
 github_job_name:{worker:'seo-corpus-worker',qa:'seo-corpus-qa',tribunal:'seo-corpus-tribunal'}[kind],
 github_job_id:n,github_run_id:87654,github_run_attempt:1,github_sha:'f'.repeat(40),
 oidc_token_sha256:n.toString(16).padStart(64,'a').slice(-64),
 workload_oidc_verified:true,provider_job_verified:true,individual_agent_iam_verified:false,
 can_write_prod:false,can_publish:false,can_grant_permissions:false
});
const workerId=identity('worker',101),qaId=identity('qa',102),tribunalId=identity('tribunal',103);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'seo-first-context-'));
let worker,receipt,qa;
test('first D05 job consumes actual pinned corpus via ACTGW/JOB001 with no website I/O',async()=>{
 try{
  worker=await executeSeoCorpusViaGateway({journal_path:path.join(dir,'job001.v8'),identity:workerId});
  receipt=firstSpecialistWorkerReceipt({worker,identity:workerId});
  assert.equal(receipt.role_id,'SEO-D05:SPECIALIST:01');
  assert.equal(receipt.gateway_id,'ACTGW-001');
  assert.equal(receipt.job001_persisted,true);
  assert.equal(receipt.work_status,'REVIEWABLE_DETERMINISTIC_DRAFT');
  assert.match(receipt.context_sha256,/^[0-9a-f]{64}$/);
  assert.match(receipt.source_copy_sha256,/^[0-9a-f]{64}$/);
  assert.equal(receipt.external_source_currently_verified,false);
  assert.equal(receipt.independent_agent_iam_verified,false);
  assert.equal(receipt.publish_authorized,false);
  assert.equal(receipt.web_requests,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('D31 separate job independently verifies exact role context and a third job holds PROD',()=>{
 assert.ok(worker&&receipt);
 qa=firstSpecialistQaReceipt({worker,worker_identity:workerId,receipt,qa_identity:qaId});
 assert.equal(qa.independent_github_job,true);
 assert.equal(qa.individual_expert_exam_passed,false);
 const verdict=firstSpecialistTribunalReceipt({worker,worker_identity:workerId,receipt,
  qa_identity:qaId,qa,tribunal_identity:tribunalId});
 assert.equal(verdict.github_oidc_jobs_verified,3);
 assert.equal(verdict.release_decision,'HOLD_IAM_AND_PROFESSIONAL_EVALUATION');
 assert.equal(verdict.production_permissions_granted,false);
 assert.equal(verdict.staging_requests,0);
});
test('reject altered knowledge SHA, other role and forged independent identity',()=>{
 assert.ok(qa&&receipt);
 assert.throws(()=>firstSpecialistQaReceipt({worker,worker_identity:workerId,
  receipt:{...receipt,context_sha256:'0'.repeat(64)},qa_identity:qaId}),/QA_RECEIPT_TAMPERED/);
 assert.throws(()=>firstSpecialistQaReceipt({worker,worker_identity:workerId,
  receipt:{...receipt,role_id:'SEO-D06:SPECIALIST:01'},qa_identity:qaId}),/QA_RECEIPT_BOUNDS/);
 assert.throws(()=>firstSpecialistQaReceipt({worker,worker_identity:workerId,
  receipt,qa_identity:{...qaId,github_job_id:101}}),/NOT_INDEPENDENT_GITHUB_JOBS/);
 assert.throws(()=>firstSpecialistTribunalReceipt({worker,worker_identity:workerId,receipt,
  qa_identity:qaId,qa:{...qa,publish_authorized:true},tribunal_identity:tribunalId}),/TRIBUNAL_QA_TAMPERED/);
});
