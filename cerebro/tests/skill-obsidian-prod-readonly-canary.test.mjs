import test from 'node:test';
import assert from 'node:assert/strict';
import {runObsidianProdReadonlyCanary} from '../skills/skill-obsidian-prod-readonly-canary.mjs';
import {judgeObsidianProdReadonlyCanary,validateObsidianProdAuthorization} from '../skills/skill-obsidian-prod-readonly-canary-tribunal.mjs';

const TOKEN='x'.repeat(40);
const AUTH=Object.freeze({
  confirm:'RUN_OBSIDIAN_PROD_READONLY_CANARY',
  one_shot_id:'obsidian-prod-canary-20261016-7b8f5d0e',
  scope:'PROD_OBSIDIAN_READONLY_ADVISORY_ONLY',
  target_candidate:'obsidian',
  target_candidate_id:'lobehub-skills:9a6e3fac20369220df43',
  expected_wrapper_id:'skillwrap:cerebro-obsidian-v0.1.0',
  company_id:'GLOBAL',engine_id:'FACT-001',environment:'PROD_CANARY',additional_cost_budget_eur:0,
  allowed_http_methods:['GET'],allow_prod_data:false,allow_customer_data:false,allow_external_skill_code_execution:false,
  allow_prod_write:false,allow_filesystem_write:false,allow_live_obsidian_cli:false,allow_canonical_knowledge_migration:false,
  allow_notion_or_rag_replacement:false,allow_github_write:false,allow_merge:false,allow_push:false,allow_issue_or_pr_mutation:false,
  allow_workflow_dispatch:false,allow_trading_access:false,paid_fallback:false,expected_human_gate:'HIGH_RISK',human_authorization_granted:true,
  authorization_basis:'explicit_owner_instruction_current_chat_2026-10-16_obsidian_prod_first'
});
function response(status,body){return {status,headers:new Map([['content-type','application/json']]),async text(){return JSON.stringify(body);}};}
function fakeFetch(url,options={}){
  assert.equal(options.method,'GET');
  if(url.endsWith('/repos/carlosjmunoz78/fenix-capital-inmo-map')) return Promise.resolve(response(200,{full_name:'carlosjmunoz78/fenix-capital-inmo-map',default_branch:'main',archived:false,disabled:false}));
  if(url.endsWith('/git/ref/heads/main')) return Promise.resolve(response(200,{ref:'refs/heads/main',object:{type:'commit',sha:'a'.repeat(40)}}));
  throw new Error(`unexpected URL ${url}`);
}

test('Obsidian PROD read-only canary requires explicit bounded confirmation',async()=>{
  await assert.rejects(()=>runObsidianProdReadonlyCanary({githubToken:TOKEN,fetchImpl:fakeFetch}),/EXPLICIT_OBSIDIAN_PROD_READONLY_CANARY_CONFIRMATION_REQUIRED/);
});

test('Obsidian PROD read-only authorization is exact, zero-cost and non-mutating',()=>{
  const verdict=validateObsidianProdAuthorization(AUTH);
  assert.equal(verdict.green,true);
  assert.deepEqual(verdict.blockers,[]);
  const expanded={...AUTH,allow_filesystem_write:true};
  const blocked=validateObsidianProdAuthorization(expanded);
  assert.equal(blocked.green,false);
  assert.ok(blocked.blockers.includes('AUTH_EXECUTION_SCOPE_EXPANDED'));
});

test('Obsidian PROD read-only canary is GREEN, six-engine scoped, zero-cost and reversible',async()=>{
  const report=await runObsidianProdReadonlyCanary({confirm:'RUN_OBSIDIAN_PROD_READONLY_CANARY',githubToken:TOKEN,fetchImpl:fakeFetch,observedAt:'2026-10-16T00:00:00.000Z'});
  assert.equal(report.status,'GREEN_OBSIDIAN_PROD_READONLY_CANARY');
  assert.equal(report.environment,'PROD_CANARY');
  assert.deepEqual(report.target_engine_bindings,['RSH-001','KNW-001','TRN-001','TRNBOOT-001','RAG-001','PRV-001']);
  assert.equal(report.live_requests,2);
  assert.deepEqual(report.methods_used,['GET']);
  assert.equal(report.fixture_probes.length,3);
  assert.ok(report.fixture_probes.every(x=>x.constraint_coverage===100));
  assert.ok(report.fixture_probes.every(x=>x.policy_conflict===false));
  assert.ok(report.fixture_probes.every(x=>x.prod_authorized===false&&x.prod_write_authorized===false));
  assert.ok(report.fixture_probes.every(x=>x.external_skill_code_execution===false&&x.live_obsidian_cli_execution===false));
  assert.equal(report.fixture_probes.find(x=>x.fixture_id==='knowledge-change-safety')?.human_required,'HIGH_RISK');
  assert.equal(report.observability_records,5);
  assert.equal(report.audit_records,5);
  assert.equal(report.finops_records,5);
  assert.equal(report.audit_chain_valid,true);
  assert.equal(report.measured_additional_cost_eur,0);
  assert.equal(report.prod_write,false);
  assert.equal(report.filesystem_write,false);
  assert.equal(report.live_obsidian_cli_execution,false);
  assert.equal(report.real_vault_used,false);
  assert.equal(report.canonical_knowledge_replaced,false);
  assert.equal(report.notion_or_rag_migration_authorized,false);
  assert.equal(report.customer_data_used,false);
  assert.equal(report.prod_data_used,false);
  assert.equal(report.external_skill_code_executed,false);
  assert.equal(report.trading_access,false);
  assert.equal(report.paid_fallback,false);
  assert.equal(report.rollback_proven,true);
  assert.equal(report.binding_after,'DISABLED');
  assert.equal(report.rebuild_proven,true);
  assert.equal(report.rebuild_state,'DISABLED');
  const verdict=judgeObsidianProdReadonlyCanary(report,{authorization:AUTH});
  assert.equal(verdict.green,true);
  assert.equal(verdict.decision,'GREEN_FOR_OBSIDIAN_PROD_READONLY_ADVISORY_REGISTRATION');
  assert.equal(verdict.human_required,null);
  assert.equal(verdict.authorization_consumed,true);
  assert.equal(verdict.registration_scope,'PROD_READONLY_ADVISORY_METADATA_ONLY');
  assert.deepEqual(verdict.blockers,[]);
});

test('Obsidian canary fails closed when live main observation is invalid',async()=>{
  const badFetch=(url,options={})=>{
    assert.equal(options.method,'GET');
    if(url.endsWith('/repos/carlosjmunoz78/fenix-capital-inmo-map')) return Promise.resolve(response(200,{full_name:'carlosjmunoz78/fenix-capital-inmo-map',default_branch:'main',archived:false,disabled:false}));
    return Promise.resolve(response(200,{ref:'refs/heads/main',object:{type:'commit',sha:'not-a-sha'}}));
  };
  await assert.rejects(()=>runObsidianProdReadonlyCanary({confirm:'RUN_OBSIDIAN_PROD_READONLY_CANARY',githubToken:TOKEN,fetchImpl:badFetch}),/OBSIDIAN_CANARY_MAIN_SHA_INVALID/);
});

test('Tribunal rejects filesystem or knowledge migration expansion even with valid owner authorization',async()=>{
  const report=await runObsidianProdReadonlyCanary({confirm:'RUN_OBSIDIAN_PROD_READONLY_CANARY',githubToken:TOKEN,fetchImpl:fakeFetch,observedAt:'2026-10-16T00:00:00.000Z'});
  const unsafe={...report,filesystem_write:true,canonical_knowledge_replaced:true};
  const verdict=judgeObsidianProdReadonlyCanary(unsafe,{authorization:AUTH});
  assert.equal(verdict.green,false);
  assert.ok(verdict.blockers.includes('WRITE_OR_LIVE_VAULT_FLAG_TRUE'));
  assert.ok(verdict.blockers.includes('KNOWLEDGE_REPLACEMENT_DETECTED'));
  assert.equal(verdict.human_required,'HIGH_RISK');
});
