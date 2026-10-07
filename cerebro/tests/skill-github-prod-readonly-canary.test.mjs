import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runGitHubProdReadonlyCanary} from '../skills/skill-github-prod-readonly-canary.mjs';

function root(){return fs.mkdtempSync(path.join(os.tmpdir(),'skill-github-prod-canary-test-'));}
const TOKEN='ghs_test_readonly_token_1234567890';

function mockFetch(url,options={}){
  assert.equal(options.method,'GET');
  assert.match(String(options.headers?.authorization??''),/^Bearer /);
  if(url==='https://api.github.com/repos/carlosjmunoz78/fenix-capital-inmo-map'){
    return Promise.resolve(new Response(JSON.stringify({
      full_name:'carlosjmunoz78/fenix-capital-inmo-map',default_branch:'main',visibility:'public',archived:false,disabled:false
    }),{status:200,headers:{'content-type':'application/json'}}));
  }
  if(url==='https://api.github.com/repos/carlosjmunoz78/fenix-capital-inmo-map/git/ref/heads/main'){
    return Promise.resolve(new Response(JSON.stringify({
      ref:'refs/heads/main',object:{type:'commit',sha:'a9b51ee98cdfbf674a02e9b68b15bbf0e455d19b'}
    }),{status:200,headers:{'content-type':'application/json'}}));
  }
  throw new Error(`unexpected url:${url}`);
}

test('requires explicit standing high-risk GitHub read-only canary confirmation',async()=>{
  await assert.rejects(()=>runGitHubProdReadonlyCanary({confirm:'NO',githubToken:TOKEN,fetchImpl:mockFetch,stateRoot:root()}),/EXPLICIT_GITHUB_PROD_READONLY_CANARY_CONFIRMATION_REQUIRED/);
});

test('requires an ephemeral GitHub read-only token and does not fall back anonymously',async()=>{
  await assert.rejects(()=>runGitHubProdReadonlyCanary({confirm:'RUN_GITHUB_PROD_READONLY_CANARY',githubToken:'short',fetchImpl:mockFetch,stateRoot:root()}),/GITHUB_READONLY_TOKEN_REQUIRED/);
});

test('observes real-repository equivalents with GET only, applies wrapper locally and rolls back binding',async()=>{
  const stateRoot=root();
  const report=await runGitHubProdReadonlyCanary({
    confirm:'RUN_GITHUB_PROD_READONLY_CANARY',githubToken:TOKEN,fetchImpl:mockFetch,stateRoot,observedAt:'2026-10-07T00:00:00.000Z'
  });
  assert.equal(report.status,'GREEN_GITHUB_PROD_READONLY_CANARY');
  assert.equal(report.environment,'PROD_CANARY');
  assert.equal(report.live_requests,2);
  assert.deepEqual(report.methods_used,['GET']);
  assert.equal(report.repository.full_name,'carlosjmunoz78/fenix-capital-inmo-map');
  assert.equal(report.repository.default_branch,'main');
  assert.equal(report.main_ref.ref,'refs/heads/main');
  assert.match(report.main_ref.sha,/^[0-9a-f]{40}$/);
  assert.equal(report.wrapper.wrapper_id,'skillwrap:cerebro-github-v0.1.0');
  assert.equal(report.wrapper.policy_conflict,false);
  assert.equal(report.wrapper.prod_authorized,false);
  assert.equal(report.prod_write,false);
  assert.equal(report.github_write,false);
  assert.equal(report.merge_performed,false);
  assert.equal(report.push_performed,false);
  assert.equal(report.issue_or_pr_mutation,false);
  assert.equal(report.workflow_dispatch_performed,false);
  assert.equal(report.customer_data_used,false);
  assert.equal(report.credentials_exposed,false);
  assert.equal(report.external_skill_code_executed,false);
  assert.equal(report.trading_access,false);
  assert.equal(report.additional_cost_eur,0);
  assert.equal(report.paid_fallback,false);
  assert.equal(report.rollback_proven,true);
  assert.equal(report.binding_after,'DISABLED');
  const persisted=JSON.parse(fs.readFileSync(path.join(stateRoot,'binding','skill-github-prod-canary-binding.json'),'utf8'));
  assert.equal(persisted.state,'DISABLED');
});

test('repository read failure fails closed and still restores binding to DISABLED',async()=>{
  const stateRoot=root();
  const failingFetch=async(url)=>{
    if(url.endsWith('/fenix-capital-inmo-map')) return new Response(JSON.stringify({message:'rate limited'}),{status:429});
    throw new Error('should not reach main ref after first failure');
  };
  await assert.rejects(()=>runGitHubProdReadonlyCanary({
    confirm:'RUN_GITHUB_PROD_READONLY_CANARY',githubToken:TOKEN,fetchImpl:failingFetch,stateRoot
  }),/GITHUB_PROD_CANARY_HTTP_429/);
  const persisted=JSON.parse(fs.readFileSync(path.join(stateRoot,'binding','skill-github-prod-canary-binding.json'),'utf8'));
  assert.equal(persisted.state,'DISABLED');
});
