import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {isolatedWorker,isolatedQa,isolatedTribunal} from '../runtime/seo-isolated-role-jobs-v0.mjs';
import {verifyProcessReceipt} from '../runtime/seo-process-signature-v0.mjs';
const base={status:'SEPARATE_GITHUB_JOB_PROVIDER_VERIFIED',company_id:'fenix',engine_id:'SEO-001',
 environment:'PREPROD',version:'0.1.0',
 workflow:'.github/workflows/cerebro-seo-staging-readonly-v0.yml',
 provider_authenticated_api_read:true,job_isolation_by_github_job_id:true,
 prod_write_authorized:false,web_staging_write_authorized:false,
 independent_agent_iam_credentials_verified:false,run_id:123456789,run_attempt:1,head_sha:'a'.repeat(40)};
const attest=(name,role,scope,id,n)=>({...base,job_name:name,role_id:role,role_scope:scope,github_job_id:id,verified_previous_job_count:n});
const w=attest('seo-worker-isolated','SEO_D15_WORKER','mission:execute',1001,0);
const q=attest('seo-qa-isolated','SEO_D31_QA','mission:evaluate',1002,1);
const j=attest('seo-tribunal-isolated','SEO_JUDGE_A','mission:verdict:read',1003,2);
test('three job identities produce one durable job, separate signed QA, no-release tribunal',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'seo-v2-3jobs-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const journal_path=path.join(dir,'job001.v8');
 const worker=isolatedWorker({workload:w,journal_path});
 assert.equal(worker.run_state,'SUCCEEDED');
 assert.equal(worker.source_type,'SYNTHETIC_LAB_FIXTURE');
 assert.ok(worker.findings_count>=1);
 assert.equal(verifyProcessReceipt({receipt:worker,expected_role:w.role_id}).valid,true);
 const review=isolatedQa({workload:q,worker,journal_path});
 assert.equal(review.independent_fixture_recomputed,true);
 assert.equal(verifyProcessReceipt({receipt:review,expected_role:q.role_id}).valid,true);
 const verdict=isolatedTribunal({workload:j,worker,review});
 assert.equal(verdict.status,'THREE_GITHUB_JOBS_DISTINCT_VERIFIED_LAB_NO_RELEASE');
 assert.deepEqual(verdict.distinct_github_job_ids,[1001,1002,1003]);
 assert.equal(verdict.per_actor_cerebro_iam_verified,false);
 assert.equal(verdict.actual_website_audited_in_this_workflow,false);
 assert.equal(verdict.award_granted,false);
 assert.equal(verdict.prod_authorized,false);
 assert.equal(verdict.external_writes,0);
 assert.equal(verifyProcessReceipt({receipt:verdict,expected_role:j.role_id}).valid,true);
 assert.equal(fs.readFileSync(journal_path).includes(Buffer.from('Simulación hipotecaria')),false);
 const dup=isolatedWorker({workload:w,journal_path});
 assert.equal(dup.job_id,worker.job_id);
});
test('different job id, run id and wrong stage cannot impersonate predecessor',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'seo-v2-deny-jobs-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const journal_path=path.join(dir,'job.v8');
 const worker=isolatedWorker({workload:w,journal_path});
 assert.throws(()=>isolatedQa({workload:{...q,github_job_id:1001},worker,journal_path}),/SEO_ISOLATED_WORKLOAD_CHAIN/);
 assert.throws(()=>isolatedQa({workload:{...q,run_id:77},worker,journal_path}),/SEO_ISOLATED_WORKLOAD_CHAIN/);
 assert.throws(()=>isolatedQa({workload:{...q,verified_previous_job_count:0},worker,journal_path}),/SEO_ISOLATED_WORKER_NOT_PROVIDER_RECHECKED/);
 assert.throws(()=>isolatedQa({workload:{...q,role_scope:'mission:execute'},worker,journal_path}),/SEO_ISOLATED_ROLE_SCOPE/);
 const review=isolatedQa({workload:q,worker,journal_path});
 assert.throws(()=>isolatedTribunal({workload:{...j,github_job_id:1002},worker,review}),/SEO_ISOLATED_WORKLOAD_CHAIN/);
 assert.throws(()=>isolatedTribunal({workload:{...j,verified_previous_job_count:1},worker,review}),/SEO_ISOLATED_PROVIDER_CHAIN/);
 const tampered={...review,verified_observations_count:909};
 assert.throws(()=>isolatedTribunal({workload:j,worker,review:tampered}),/PROCESS_RECEIPT_TAMPERED/);
});
test('previous roles cannot be silently converted into actual IAM identities',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'seo-v2-no-iam-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 assert.throws(()=>isolatedWorker({workload:{...w,independent_agent_iam_credentials_verified:true},journal_path:path.join(dir,'x')}),/SEO_ISOLATED_GATE/);
 assert.throws(()=>isolatedWorker({workload:{...w,prod_write_authorized:true},journal_path:path.join(dir,'x')}),/SEO_ISOLATED_GATE/);
});
