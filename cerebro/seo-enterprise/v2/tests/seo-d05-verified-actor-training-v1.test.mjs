import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {runD05SignedExercises,verifySignedD05,verifyD31,createD32Feedback,issueD05Tribunal,requireDedicatedHost,loadActorPolicy}
 from '../runtime/seo-d05-verified-actor-training-v1.mjs';
const roles={actor:['SEO_D05_SPECIALIST_01_READONLY','seo-d05-actor'],qa:['SEO_CORPUS_INDEPENDENT_QA','seo-corpus-qa'],d32:['SEO_D32_TRAINING_REVIEW','seo-d05-d32'],tribunal:['SEO_CORPUS_TRIBUNAL','seo-corpus-tribunal']};
const id=(k,n)=>({status:'GITHUB_OIDC_JWKS_AND_API_JOB_VERIFIED',role:roles[k][0],github_job_name:roles[k][1],
 company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',workflow_path:'.github/workflows/cerebro-seo-corpus-workload-v1.yml',
 workload_oidc_verified:true,provider_job_verified:true,individual_agent_iam_verified:false,can_write_prod:false,
 can_publish:false,can_grant_permissions:false,cost_added_eur:0,github_run_id:103,github_job_id:n,
 oidc_token_sha256:crypto.createHash('sha256').update('test-oidc-'+n).digest('hex')});
const a=id('actor',10),q=id('qa',11),d=id('d32',12),t=id('tribunal',13);
let actor,qa,d32;
test('3 signed factual WordPress work products in JOB001 from distinct OIDC role',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'d05-oidc-'));
 try{
  actor=runD05SignedExercises({identity:a,journal_path:path.join(dir,'jobs.v8')});
  assert.equal(actor.jobs.length,3);assert.equal(actor.submissions.length,3);
  assert.equal(new Set(actor.submissions.map(s=>s.payload.url)).size,3);
  assert.equal(verifySignedD05({actor,identity:a}).signed_cases,3);
  assert.equal(actor.individual_agent_account_verified,false);assert.equal(actor.website_writes,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('independent D31 D32 tribunal accept only source provenance, never professional grade',()=>{
 qa=verifyD31({actor,actor_identity:a,qa_identity:q});
 d32=createD32Feedback({actor,actor_identity:a,qa,qa_identity:q,d32_identity:d});
 const verdict=issueD05Tribunal({actor,actor_identity:a,qa,qa_identity:q,d32,d32_identity:d,tribunal_identity:t});
 assert.equal(qa.signatures_verified,3);assert.equal(d32.exercises.length,3);
 assert.equal(d32.training_certified,false);assert.equal(verdict.professional_exam_passes,0);
 assert.equal(verdict.independent_agent_iam_accounts,0);
 assert.match(verdict.release_decision,/HOLD_/);
});
test('tamper, impersonation, untrusted grants, fake D31 and immediate revocation deny',()=>{
 const tamper=structuredClone(actor);tamper.submissions[0].payload.proposed_work.next_step='PUBLICAR';
 assert.throws(()=>verifySignedD05({actor:tamper,identity:a}),/BUNDLE_INVALID/);
 const fake={...a,github_job_name:'seo-corpus-worker'};
 assert.throws(()=>verifySignedD05({actor,identity:fake}),/OIDC_JOB_INVALID/);
 assert.throws(()=>verifyD31({actor,actor_identity:a,qa_identity:{...q,github_job_id:10}}),/NOT_INDEPENDENT_JOBS/);
 assert.throws(()=>createD32Feedback({actor,actor_identity:a,qa:{...qa,actual_professional_exam_passes:3},qa_identity:q,d32_identity:d}),/D31_TAMPERED/);
 const revoked={...loadActorPolicy(),revoked:true,revocation_revision:1};
 assert.throws(()=>requireDedicatedHost(a,'actor',revoked),/PRINCIPAL_REVOKED_OR_UNSCOPED/);
 assert.throws(()=>verifySignedD05({actor,identity:a,policy:revoked}),/PRINCIPAL_REVOKED_OR_UNSCOPED/);
});