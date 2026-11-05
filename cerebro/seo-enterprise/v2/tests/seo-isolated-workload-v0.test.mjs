import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyIsolatedWorkload} from '../runtime/seo-isolated-workload-v0.mjs';
const base={
 GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'carlosjmunoz78/fenix-capital-inmo-map',
 GITHUB_EVENT_NAME:'pull_request',
 GITHUB_HEAD_REF:'cerebro/seo-enterprise-family-staging-contract-v1-20261105',
 GITHUB_RUN_ID:'7777777',GITHUB_RUN_ATTEMPT:'1',GITHUB_JOB:'seo-qa-isolated',
 SEO_EXPECTED_HEAD_SHA:'a'.repeat(40)};
const run={id:7777777,path:'.github/workflows/cerebro-seo-staging-readonly-v0.yml',
 repository:{full_name:base.GITHUB_REPOSITORY},
 event:'pull_request',head_branch:base.GITHUB_HEAD_REF,run_attempt:1,head_sha:'a'.repeat(40)};
const jobs={jobs:[
 {name:'seo-worker-isolated',id:101,run_id:7777777,status:'completed',conclusion:'success'},
 {name:'seo-qa-isolated',id:102,run_id:7777777,status:'in_progress',conclusion:null},
 {name:'seo-tribunal-isolated',id:103,run_id:7777777,status:'queued',conclusion:null}
]};
const prev={run_id:7777777,run_attempt:1,head_sha:'a'.repeat(40),job_name:'seo-worker-isolated',github_job_id:101};
const token='mock-github-token-will-not-send';
const fetcher=(r=run,j=jobs)=>async (url,opts)=>{
 assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');
 assert.equal(opts.headers.Authorization,'Bearer '+token);
 return {ok:true,json:async()=>url.includes('jobs?')?j:r};
};
test('provider-approved QA job checks previous successful worker within same run',async()=>{
 const a=await verifyIsolatedWorkload({env:base,token,fetchImpl:fetcher(),previous_jobs:[prev]});
 assert.equal(a.role_id,'SEO_D31_QA');assert.equal(a.github_job_id,102);
 assert.equal(a.verified_previous_job_count,1);
 assert.equal(a.independent_agent_iam_credentials_verified,false);
 assert.equal(a.github_oidc_verified,false);
 assert.equal(JSON.stringify(a).includes(token),false);
});
test('GitHub provider failures, cross-run artifacts and preceding failed jobs are denied',async()=>{
 await assert.rejects(()=>verifyIsolatedWorkload({env:{...base,GITHUB_HEAD_REF:'main'},token,fetchImpl:fetcher(),previous_jobs:[prev]}),/CONTEXT_DENIED/);
 await assert.rejects(()=>verifyIsolatedWorkload({env:base,token,fetchImpl:fetcher(),previous_jobs:[{...prev,run_id:9}]}),/PRIOR_BOUNDARY_MISMATCH/);
 await assert.rejects(()=>verifyIsolatedWorkload({env:base,token,fetchImpl:fetcher(),previous_jobs:[prev,prev]}),/PRIOR_BOUNDARY_MISMATCH/);
 const bad={jobs:[{...jobs.jobs[0],conclusion:'failure'},jobs.jobs[1]]};
 await assert.rejects(()=>verifyIsolatedWorkload({env:base,token,fetchImpl:fetcher(run,bad),previous_jobs:[prev]}),/PRIOR_JOB_NOT_VERIFIED_SUCCESS/);
 await assert.rejects(()=>verifyIsolatedWorkload({env:base,token,fetchImpl:fetcher({...run,path:'other.yml'}),previous_jobs:[prev]}),/RUN_UNTRUSTED/);
 await assert.rejects(()=>verifyIsolatedWorkload({env:base,token,fetchImpl:async()=>{throw Error('secret-not-for-logs')},previous_jobs:[prev]}),/PROVIDER_UNAVAILABLE/);
});
