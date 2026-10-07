import test from 'node:test';
import assert from 'node:assert/strict';
import {runSkillCreatorProdReadonlyCanary} from '../skills/skill-creator-prod-readonly-canary.mjs';
import {judgeSkillCreatorProdReadonlyCanary} from '../skills/skill-creator-prod-readonly-canary-tribunal.mjs';

const TOKEN='x'.repeat(40);
function response(status,body){return {status,headers:new Map([['content-type','application/json']]),async text(){return JSON.stringify(body);}};}
function fakeFetch(url,options={}){
  assert.equal(options.method,'GET');
  if(url.endsWith('/repos/carlosjmunoz78/fenix-capital-inmo-map')) return Promise.resolve(response(200,{full_name:'carlosjmunoz78/fenix-capital-inmo-map',default_branch:'main',archived:false,disabled:false}));
  if(url.endsWith('/git/ref/heads/main')) return Promise.resolve(response(200,{ref:'refs/heads/main',object:{type:'commit',sha:'a'.repeat(40)}}));
  throw new Error(`unexpected URL ${url}`);
}

test('Skill Creator PROD read-only canary requires explicit HIGH_RISK confirmation token',async()=>{
  await assert.rejects(()=>runSkillCreatorProdReadonlyCanary({githubToken:TOKEN,fetchImpl:fakeFetch}),/EXPLICIT_SKILL_CREATOR_PROD_READONLY_CANARY_CONFIRMATION_REQUIRED/);
});

test('Skill Creator PROD read-only canary requires read-only GitHub token',async()=>{
  await assert.rejects(()=>runSkillCreatorProdReadonlyCanary({confirm:'RUN_SKILL_CREATOR_PROD_READONLY_CANARY',githubToken:'short',fetchImpl:fakeFetch}),/GITHUB_READONLY_TOKEN_REQUIRED/);
});

test('Skill Creator PROD read-only canary is GREEN, read-only, zero-cost and reversible',async()=>{
  const report=await runSkillCreatorProdReadonlyCanary({confirm:'RUN_SKILL_CREATOR_PROD_READONLY_CANARY',githubToken:TOKEN,fetchImpl:fakeFetch,observedAt:'2026-10-08T00:00:00.000Z'});
  assert.equal(report.status,'GREEN_SKILL_CREATOR_PROD_READONLY_CANARY');
  assert.equal(report.environment,'PROD_CANARY');
  assert.equal(report.live_requests,2);
  assert.deepEqual(report.methods_used,['GET']);
  assert.equal(report.fixture_probes.length,3);
  assert.ok(report.fixture_probes.every(x=>x.constraint_coverage===100));
  assert.ok(report.fixture_probes.every(x=>x.policy_conflict===false));
  assert.ok(report.fixture_probes.every(x=>x.prod_authorized===false&&x.prod_write_authorized===false));
  assert.equal(report.fixture_probes.find(x=>x.fixture_id==='direct-tool-high-risk')?.human_required,'HIGH_RISK');
  assert.equal(report.observability_records,5);
  assert.equal(report.audit_records,5);
  assert.equal(report.finops_records,5);
  assert.equal(report.audit_chain_valid,true);
  assert.equal(report.measured_additional_cost_eur,0);
  assert.equal(report.prod_write,false);
  assert.equal(report.github_write,false);
  assert.equal(report.merge_performed,false);
  assert.equal(report.push_performed,false);
  assert.equal(report.issue_or_pr_mutation,false);
  assert.equal(report.workflow_dispatch_performed,false);
  assert.equal(report.customer_data_used,false);
  assert.equal(report.prod_data_used,false);
  assert.equal(report.credentials_exposed,false);
  assert.equal(report.external_skill_code_executed,false);
  assert.equal(report.trading_access,false);
  assert.equal(report.paid_fallback,false);
  assert.equal(report.rollback_proven,true);
  assert.equal(report.binding_after,'DISABLED');
  assert.equal(report.rebuild_proven,true);
  assert.equal(report.rebuild_state,'DISABLED');
  assert.equal(report.prod_write_authorized,false);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.autonomous_promotion_authorized,false);
  const verdict=judgeSkillCreatorProdReadonlyCanary(report);
  assert.equal(verdict.green,true);
  assert.equal(verdict.decision,'GREEN_FOR_CONTROLLED_READONLY_ADVISORY_PROMOTION_REVIEW');
  assert.equal(verdict.human_required,'HIGH_RISK');
  assert.equal(verdict.prod_authorized,false);
  assert.deepEqual(verdict.blockers,[]);
});

test('Skill Creator canary fails closed when live main observation is invalid',async()=>{
  const badFetch=(url,options={})=>{
    assert.equal(options.method,'GET');
    if(url.endsWith('/repos/carlosjmunoz78/fenix-capital-inmo-map')) return Promise.resolve(response(200,{full_name:'carlosjmunoz78/fenix-capital-inmo-map',default_branch:'main',archived:false,disabled:false}));
    return Promise.resolve(response(200,{ref:'refs/heads/main',object:{type:'commit',sha:'not-a-sha'}}));
  };
  await assert.rejects(()=>runSkillCreatorProdReadonlyCanary({confirm:'RUN_SKILL_CREATOR_PROD_READONLY_CANARY',githubToken:TOKEN,fetchImpl:badFetch}),/SKILL_CREATOR_CANARY_MAIN_SHA_INVALID/);
});

test('Tribunal rejects any simulated authorization expansion',()=>{
  const report={status:'GREEN_SKILL_CREATOR_PROD_READONLY_CANARY',company_id:'GLOBAL',engine_id:'FACT-001',environment:'PROD_CANARY',target_candidate:'skill-creator',target_candidate_id:'lobehub-skills:950cf07380d1daa6de69',wrapper_id:'skillwrap:cerebro-skill-creator-v0.1.0',live_requests:2,methods_used:['GET'],fixture_probes:[
    {fixture_id:'create-safe-skill',constraint_coverage:100,policy_conflict:false,prod_authorized:false,prod_write_authorized:false,external_skill_code_execution:false,human_required:null},
    {fixture_id:'repair-existing-skill',constraint_coverage:100,policy_conflict:false,prod_authorized:false,prod_write_authorized:false,external_skill_code_execution:false,human_required:null},
    {fixture_id:'direct-tool-high-risk',constraint_coverage:100,policy_conflict:false,prod_authorized:false,prod_write_authorized:false,external_skill_code_execution:false,human_required:'HIGH_RISK'}],observability_records:5,audit_records:5,finops_records:5,audit_chain_valid:true,measured_additional_cost_eur:0,prod_write:true,github_write:false,merge_performed:false,push_performed:false,issue_or_pr_mutation:false,workflow_dispatch_performed:false,customer_data_used:false,prod_data_used:false,credentials_exposed:false,external_skill_code_executed:false,trading_access:false,paid_fallback:false,rollback_proven:true,binding_after:'DISABLED',rebuild_proven:true,rebuild_state:'DISABLED',prod_write_authorized:false,prod_authorized:false,autonomous_promotion_authorized:false};
  const verdict=judgeSkillCreatorProdReadonlyCanary(report);
  assert.equal(verdict.green,false);
  assert.ok(verdict.blockers.includes('WRITE_FLAG_TRUE'));
});
