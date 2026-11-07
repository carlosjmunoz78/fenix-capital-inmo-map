import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyGithubWorkload} from '../runtime/seo-github-workload-verify-v0.mjs';
const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'carlosjmunoz78/fenix-capital-inmo-map',
 GITHUB_EVENT_NAME:'pull_request',GITHUB_HEAD_REF:'cerebro/seo-enterprise-family-staging-contract-v1-20261105',
 GITHUB_JOB:'readonly-staging',GITHUB_RUN_ID:'41980132770',GITHUB_RUN_ATTEMPT:'1'};
const token='fake-readonly-api-token-not-for-network';
const run={id:41980132770,path:'.github/workflows/cerebro-seo-staging-readonly-v0.yml',
 repository:{full_name:env.GITHUB_REPOSITORY},event:'pull_request',head_branch:env.GITHUB_HEAD_REF,
 run_attempt:1,head_sha:'a'.repeat(40),status:'in_progress'};
const jobs={jobs:[{name:'readonly-staging',run_id:41980132770,id:333,status:'in_progress',conclusion:null}]};
const build=(r=run,j=jobs)=>async (url,opts)=>{
 assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');
 assert.equal(opts.headers.Authorization,'Bearer '+token);
 return {ok:true,json:async()=>url.includes('?per_page')?j:r};
};
test('GitHub run provider API can verify existing workflow job but cannot attest individual SEO agents',async()=>{
 const report=await verifyGithubWorkload({env,token,fetchImpl:build()});
 assert.equal(report.status,'GITHUB_API_WORKLOAD_RUN_VERIFIED_READONLY');
 assert.equal(report.github_job_id,333);
 assert.equal(report.github_oidc_jwt_validated,false);
 assert.equal(report.actor_role_credentials_verified,false);
 assert.equal(report.authenticated_roles.length,0);
 assert.equal(report.prod_write_authorized,false);
 assert.equal(JSON.stringify(report).includes(token),false);
});
test('denies env spoofed branch, workflow, wrong job, provider failures and missing token',async()=>{
 await assert.rejects(()=>verifyGithubWorkload({env:{...env,GITHUB_HEAD_REF:'main'},token,fetchImpl:build()}),/WORKLOAD_IDENTITY_BRANCH_JOB/);
 await assert.rejects(()=>verifyGithubWorkload({env:{...env,GITHUB_ACTIONS:'false'},token,fetchImpl:build()}),/WORKLOAD_IDENTITY_NOT_ACTIONS/);
 await assert.rejects(()=>verifyGithubWorkload({env,token:'',fetchImpl:build()}),/WORKLOAD_IDENTITY_TOKEN_REQUIRED/);
 await assert.rejects(()=>verifyGithubWorkload({env,token,fetchImpl:build({...run,path:'.github/workflows/untrusted.yml'})}),/WORKLOAD_IDENTITY_RUN_MISMATCH/);
 await assert.rejects(()=>verifyGithubWorkload({env,token,fetchImpl:build(run,{jobs:[]})}),/WORKLOAD_IDENTITY_JOB_IDENTITY_UNVERIFIED/);
 await assert.rejects(()=>verifyGithubWorkload({env,token,fetchImpl:async()=>{throw Error('fake-token-do-not-log')}}),/WORKLOAD_IDENTITY_PROVIDER_UNAVAILABLE/);
});
test('GitHub run mismatch or event mismatch never grants scope',async()=>{
 await assert.rejects(()=>verifyGithubWorkload({env,token,fetchImpl:build({...run,event:'workflow_dispatch'})}),/WORKLOAD_IDENTITY_RUN_CONTEXT_MISMATCH/);
 await assert.rejects(()=>verifyGithubWorkload({env,token,fetchImpl:build({...run,run_attempt:2})}),/WORKLOAD_IDENTITY_RUN_CONTEXT_MISMATCH/);
});

test('bounded provider API polling accepts delayed valid job but never authorizes queued/unverified job',async()=>{
 let checks=0,pauses=0;
 const queued={jobs:[{...jobs.jobs[0],status:'queued',conclusion:null}]};
 const provider=async(url,opts)=>({
  ok:true,json:async()=>url.includes('jobs?')?++checks<3?queued:jobs:run
 });
 const verified=await verifyGithubWorkload({env,token,fetchImpl:provider,
  pause:async()=>{pauses++}});
 assert.equal(verified.job_checks_attempted,3);
 assert.equal(pauses,2);
 assert.equal(verified.actor_role_credentials_verified,false);
 assert.equal(verified.prod_write_authorized,false);
 checks=0;
 await assert.rejects(()=>verifyGithubWorkload({env,token,
  fetchImpl:async(url)=>({ok:true,json:async()=>url.includes('jobs?')?queued:run}),
  pause:async()=>{}}),/WORKLOAD_IDENTITY_JOB_IDENTITY_UNVERIFIED/);
});
