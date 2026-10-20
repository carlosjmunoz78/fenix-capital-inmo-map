import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {candidateFromQueueResult,mergeDynamicCandidates,promotePendingCandidates,registryFromQueueReport,resolveDynamicSkillCapability,runDynamicProdReadonlyCanary} from '../runtime/skill-dynamic-adoption-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SHA='a'.repeat(40);const H1='1'.repeat(64);const H2='2'.repeat(64);const H3='3'.repeat(64);
const greenClosure={full_safe_preprod:true,per_binding_old_vs_new_pass:true,tribunal_pass:true,learning_feedback_green:true,observability_green:true,finops_green:true,audit_green:true,backup_ready:true,rollback_green:true,rebuild_green:true,idempotency_proven:true,cost_eur:0,binding_count:2};
function queueRow(overrides={}){return {company_id:'fenix',status:'FULL_SAFE_PREPROD',full_safe_preprod:true,human_required:null,candidate_id:'repo:dynamic-finance-001',technical_name:'finance-ops-dynamic',source_locator:`github://example/finance@${SHA}/skills/finance`,pinned_sha:SHA,snapshot_sha256:H1,manifest_sha256:H2,outcome_hash:H3,target_engine_bindings:['FINOPS-001','ACC-001'],capability_contracts:[{capability_id:'cap:finance',technical_name:'finance-ops-dynamic',description:'Read-only finance operations analysis and reconciliation semantics.',domains:[{domain_id:'finance-accounting-payments',engine_bindings:['FINOPS-001','ACC-001']}]}],closure_summary:greenClosure,learning_impact_status:'LRN_IMPACT_GREEN_PREPROD',additional_cost_eur:0,prod_write_authorized:false,prod_mutation_authorized:false,external_skill_code_execution:false,trading_access:false,...overrides};}
function emptyRegistry(){return {schema_version:'1.0.0',state_type:'CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1',company_id:'GLOBAL',engine_id:'FACT-001',environment:'PREPROD',version:'v1',policy:{},capabilities:[]};}

test('dynamic adoption registry remains fail-closed as live capabilities are added',()=>{
  const registry=JSON.parse(fs.readFileSync(path.join(root,'cerebro/registry/skill-dynamic-adoption-v1.json'),'utf8'));
  assert.equal(registry.state_type,'CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1');
  assert.equal(registry.environment,'PREPROD');
  assert.equal(registry.policy.full_safe_preprod_required,true);
  assert.equal(registry.policy.real_prod_readonly_canary_required,true);
  assert.equal(registry.policy.external_skill_code_execution,false);
  assert.equal(registry.policy.prod_write_authorized,false);
  assert.equal(registry.policy.prod_mutation_authorized,false);
  assert.equal(registry.policy.trading_access,false);
  assert.equal(registry.policy.additional_cost_budget_eur,0);
  for(const capability of registry.capabilities??[]){
    assert.ok(['FULL_SAFE_PREPROD_PENDING_PROD_READONLY_CANARY','PROD_CAPABILITY_AVAILABLE_READONLY'].includes(capability.status),`UNEXPECTED_DYNAMIC_STATUS:${capability.candidate_id}:${capability.status}`);
    assert.equal(capability.prod_authorized,false);
    assert.equal(capability.prod_write_authorized,false);
    assert.equal(capability.prod_mutation_authorized,false);
    assert.equal(capability.permission_expansion_authorized,false);
    assert.equal(capability.external_skill_code_execution,false);
    assert.equal(capability.dependency_install_authorized,false);
    assert.equal(capability.customer_data_authorized,false);
    assert.equal(capability.paid_fallback,false);
    assert.equal(capability.spend_authorized,false);
    assert.equal(capability.trading_access,false);
    assert.equal(Number(capability.additional_cost_eur),0);
    assert.equal((capability.target_engine_bindings??[]).some((engine)=>String(engine).toUpperCase().includes('TRADING')),false);
    if(capability.status==='PROD_CAPABILITY_AVAILABLE_READONLY'){
      assert.equal(capability.environment,'PROD_CAPABILITY');
      assert.equal(capability.current_scope,'READONLY_ADVISORY_ANALYZE_REVIEW_PLAN_OBSERVE');
      assert.equal(capability.canary?.ref,'refs/heads/main');
      assert.equal(capability.canary?.side_effects,false);
    }
  }
});

test('FULL_SAFE_PREPROD queue result becomes a pending dynamic capability only with complete closure',()=>{
  const candidate=candidateFromQueueResult(queueRow(),{observed_at:'2026-10-20T07:00:00.000Z'});
  assert.equal(candidate.status,'FULL_SAFE_PREPROD_PENDING_PROD_READONLY_CANARY');
  assert.deepEqual(candidate.target_engine_bindings,['ACC-001','FINOPS-001']);
  assert.equal(candidate.capability_contracts.length,1);
  assert.equal(candidate.prod_write_authorized,false);
  assert.equal(candidate.external_skill_code_execution,false);
  const merged=mergeDynamicCandidates({registry:emptyRegistry(),candidates:[candidate]});
  assert.equal(merged.summary.inserted,1);
  assert.equal(merged.summary.pending_canary,1);
});

test('one unsafe FULL_SAFE_PREPROD row is skipped without blocking an independent safe capability',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-dynamic-nonblocking-'));const registryFile=path.join(tmp,'registry.json');fs.writeFileSync(registryFile,JSON.stringify(emptyRegistry()));
  const unsafe=queueRow({candidate_id:'repo:unsafe-trading',technical_name:'unsafe-trading',target_engine_bindings:['TRADING-001'],capability_contracts:[{capability_id:'cap:unsafe',technical_name:'unsafe-trading',description:'Unsafe trading binding fixture',domains:[{domain_id:'finance-accounting-payments',engine_bindings:['TRADING-001']}]}]});
  const report={status:'QUEUE_TERMINAL_GREEN',results:[unsafe,queueRow()]};
  const registry=registryFromQueueReport({queueReport:report,registryFile,observed_at:'2026-10-20T07:00:00.000Z'});
  assert.equal(registry.summary.inserted,1);
  assert.equal(registry.summary.skipped,1);
  assert.equal(registry.summary.pending_canary,1);
  assert.equal(registry.capabilities[0].candidate_id,'repo:dynamic-finance-001');
  assert.equal(registry.adoption_skips[0].candidate_id,'repo:unsafe-trading');
  assert.equal(registry.adoption_skips[0].blocking,false);
  assert.match(registry.adoption_skips[0].reason,/TRADING_BINDING_DENIED/);
});

test('canonical main no-side-effect canary promotes pending capability to callable PROD read-only',()=>{
  const candidate=candidateFromQueueResult(queueRow(),{observed_at:'2026-10-20T07:00:00.000Z'});
  const canary=runDynamicProdReadonlyCanary({candidate,head_sha:'b'.repeat(40),run_id:12345,ref:'refs/heads/main'});
  assert.match(canary.status,/^GREEN_DYNAMIC_.*_PROD_READONLY_CANARY$/);
  assert.equal(canary.side_effects,false);
  const promoted=promotePendingCandidates({registry:mergeDynamicCandidates({registry:emptyRegistry(),candidates:[candidate]}),head_sha:'b'.repeat(40),run_id:12345,ref:'refs/heads/main',observed_at:'2026-10-20T07:05:00.000Z'});
  assert.equal(promoted.summary.promoted,1);
  assert.equal(promoted.capabilities[0].status,'PROD_CAPABILITY_AVAILABLE_READONLY');
  const resolved=resolveDynamicSkillCapability({candidate_id:candidate.candidate_id,engine_id:'FINOPS-001',requested_mode:'ANALYZE',registry:promoted});
  assert.equal(resolved.allowed,true);
  assert.equal(resolved.status,'PROD_CAPABILITY_AVAILABLE_READONLY');
  assert.equal(resolved.capability_contracts[0].domains[0].domain_id,'finance-accounting-payments');
  assert.equal(resolved.prod_write_authorized,false);
  assert.equal(resolved.prod_mutation_authorized,false);
});

test('dynamic resolver denies write modes, wrong engines, non-main canary and Trading bindings',()=>{
  const candidate=candidateFromQueueResult(queueRow());
  assert.throws(()=>runDynamicProdReadonlyCanary({candidate,head_sha:'b'.repeat(40),run_id:1,ref:'refs/heads/feature'}),/CANONICAL_MAIN_REF_REQUIRED/);
  const promoted=promotePendingCandidates({registry:mergeDynamicCandidates({registry:emptyRegistry(),candidates:[candidate]}),head_sha:'b'.repeat(40),run_id:1,ref:'refs/heads/main'});
  assert.equal(resolveDynamicSkillCapability({candidate_id:candidate.candidate_id,engine_id:'FINOPS-001',requested_mode:'WRITE',registry:promoted}).allowed,false);
  assert.equal(resolveDynamicSkillCapability({candidate_id:candidate.candidate_id,engine_id:'CRM-001',requested_mode:'ANALYZE',registry:promoted}).allowed,false);
  assert.throws(()=>candidateFromQueueResult(queueRow({target_engine_bindings:['TRADING-001'],capability_contracts:[{capability_id:'cap:x',technical_name:'x',description:'x',domains:[{domain_id:'finance-accounting-payments',engine_bindings:['TRADING-001']}]}]})),/TRADING_BINDING_DENIED/);
});

test('incomplete closure or unsafe authority fails closed before registry insertion',()=>{
  assert.throws(()=>candidateFromQueueResult(queueRow({closure_summary:{...greenClosure,tribunal_pass:false}})),/FULL_CLOSURE_SUMMARY_GREEN_REQUIRED/);
  assert.throws(()=>candidateFromQueueResult(queueRow({learning_impact_status:null})),/LRN_IMPACT_GREEN_PREPROD_REQUIRED/);
  assert.throws(()=>candidateFromQueueResult(queueRow({prod_write_authorized:true})),/UNSAFE_AUTHORITY/);
});