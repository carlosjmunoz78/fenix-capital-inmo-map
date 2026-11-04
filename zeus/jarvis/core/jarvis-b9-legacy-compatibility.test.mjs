/** B9 CUT04 · Compatibility with ORIGINAL CEREBRO PREPROD evaluator,
 * bounded recovery supervisor, and cross-company learning contracts.
 * Tests are read-only/pure; no PREPROD runtime activation or migration.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
 defineBenchmark,evaluateOldNew,tribunalDecision,validateEvaluatorChange
} from '../../../cerebro/runtime/evaluation-tribunal.mjs';
import {planRecovery} from '../../../cerebro/runtime/bounded-recovery-supervisor.mjs';
import {scopedKnowledge,transferCandidate,validateLocalTransfer,tenantIsolation}
 from '../../../cerebro/runtime/multi-company-learning.mjs';
import {decideJarvisB9Recovery} from './jarvis-b9-resilience-decision.mjs';

const ctx={company_id:'fenix',engine_id:'ORCH-001',environment:'PREPROD',version:'0.1.0'};
const benchmark=()=>defineBenchmark({...ctx,benchmark_id:'b9-quality',benchmark_version:'v1',
 metric:'testPassRate',holdout_ref:'secret-synthetic-holdout',
 adversarial_refs:['adversarial-cross-tenant','adversarial-self-judge']});
const arm=(name,v)=>({...ctx,arm:name,experiment_id:'synthetic-experiment',
 metrics:{testPassRate:v}});
const compare=(oldv,newv)=>evaluateOldNew({benchmark:benchmark(),
 old_result:arm('OLD',oldv),new_result:arm('NEW',newv)});
const observation={...ctx,failure_family:'NETWORK_TEMPORARY',
 observed_at:'2026-11-04T06:00:00Z',evidence_ref:'synthetic-failure-evidence',
 prod_authorized:false,trading_access:false};
test('B9 preserves original PREPROD evaluation with secret holdout and 2 adversarial references',()=>{
 const b=benchmark(),e=compare(80,90);
 assert.equal(b.secret_holdout,true);assert.equal(b.adversarial_refs.length,2);
 assert.equal(e.delta,10);assert.equal(e.prod_authorized,false);
});
test('B9 original independent tribunal PASS still does not authorize PROD',()=>{
 const e=compare(80,90),t=tribunalDecision({evaluation:e,judge_id:'independent-judge',
 candidate_actor_id:'candidate-specialist'});
 assert.equal(t.decision,'PASS');assert.equal(t.prod_authorized,false);
});
test('B9 original Tribunal forbids self-judging even with improved metrics',()=>{
 const e=compare(80,100),t=tribunalDecision({evaluation:e,judge_id:'specialist',
 candidate_actor_id:'specialist'});
 assert.equal(t.decision,'FAIL');assert.equal(t.reason,'judge_not_independent');
});
test('B9 original evaluator rejects Goodhart effect and real negative outcomes',()=>{
 const e=compare(80,90),t=tribunalDecision({evaluation:e,judge_id:'independent-judge',
 candidate_actor_id:'candidate-specialist',real_outcome_delta:-1});
 assert.equal(t.reason,'GOODHART_DETECTED');assert.equal(t.decision,'FAIL');
});
test('B9 benchmark never accepts candidate knowing secret holdout',()=>{
 assert.throws(()=>evaluateOldNew({benchmark:benchmark(),
 old_result:arm('OLD',80),new_result:arm('NEW',95),
 candidate_visible_holdout:true}),/leakage/i);
});
test('B9 evaluator guard denies own judge edits and privilege escalations',()=>{
 for(const config of [{may_edit_judge:true},{may_elevate_permissions:true},
  {may_elevate_budget:true},{reduces_requirements:true}]){
  const r=validateEvaluatorChange(config);
  assert.equal(r.ok,false);assert.equal(r.prod_authorized,false);
 }
});
test('B9 PREPROD recovery supervisor and B9 LAB classifier maintain separate authority',()=>{
 const old=planRecovery(observation,{attempts:0});
 assert.equal(old.environment,'PREPROD');assert.equal(old.prod_authorized,false);
 const fresh=decideJarvisB9Recovery({companyId:'fenix',environment:'LAB',
 missionId:'synthetic-m',failureClass:'NETWORK',consecutiveSameFamily:1});
 assert.equal(fresh.decision,'CANDIDATE_ONLY');assert.equal(fresh.executed,false);
 assert.throws(()=>planRecovery({...observation,environment:'LAB'}),/PREPROD/);
});
test('B9 three failures never become unbounded automatic retries across existing policies',()=>{
 const old=planRecovery(observation,{attempts:3});
 const fresh=decideJarvisB9Recovery({companyId:'fenix',environment:'LAB',
 missionId:'synthetic-m',failureClass:'NETWORK',consecutiveSameFamily:3});
 assert.equal(old.state,'HUMAN_REQUIRED');assert.equal(old.human_required,'LOW_CONFIDENCE');
 assert.equal(fresh.decision,'STOP');assert.equal(fresh.reason,'ANTI_LOOP_REEVALUATE_CAUSE');
});
test('B9 cross-company knowledge reuse only creates candidate with local validation',()=>{
 const source=scopedKnowledge({...ctx,rule_id:'rule-1',scope:'GLOBAL_CANDIDATE',
 context_signature:'shared-synthetic-context',evidence_refs:['evidence-1'],
 contains_secrets:false,contains_raw_company_data:false});
 const transfer=transferCandidate({source,target_company_id:'aion',
 target_context_signature:'shared-synthetic-context',context_compatible:true});
 assert.equal(transfer.allowed,true);assert.equal(transfer.requires_local_validation,true);
 assert.equal(transfer.prod_authorized,false);
 assert.equal(validateLocalTransfer({transfer,local_evidence_refs:[]}).accepted,false);
 const checked=validateLocalTransfer({transfer,local_evidence_refs:['local-synthetic'],
 local_validation_passed:true});
 assert.equal(checked.accepted,true);assert.equal(checked.prod_authorized,false);
});
test('B9 cross-company learning rejects raw data and secrets',()=>{
 const source=scopedKnowledge({...ctx,rule_id:'rule-2',scope:'GLOBAL_CANDIDATE',
 context_signature:'same-context',evidence_refs:['proof-1']});
 assert.equal(transferCandidate({source,target_company_id:'aion',
 target_context_signature:'same-context',source_contains_raw_company_data:true,
 context_compatible:true}).reason,'RAW_COMPANY_DATA_ISOLATION');
 assert.equal(transferCandidate({source,target_company_id:'aion',
 target_context_signature:'same-context',source_contains_secrets:true,
 context_compatible:true}).reason,'SECRET_ISOLATION');
 assert.throws(()=>scopedKnowledge({...ctx,rule_id:'secret',scope:'GLOBAL_CANDIDATE',
 context_signature:'same-context',evidence_refs:['proof-1'],contains_secrets:true}),/secrets/);
 assert.equal(tenantIsolation({request_company_id:'fenix',record_company_id:'aion'}).allowed,false);
});
test('B9 no automatic cross-company transfer even if local evidence is missing',()=>{
 const source=scopedKnowledge({...ctx,rule_id:'rule-3',scope:'COMPANY',
 context_signature:'private-only',evidence_refs:['synthetic-evidence-1']});
 const t=transferCandidate({source,target_company_id:'aion',
 target_context_signature:'private-only',context_compatible:true});
 assert.equal(t.allowed,false);assert.equal(t.reason,'SOURCE_NOT_TRANSFERABLE');
 assert.equal(validateLocalTransfer({transfer:t,
 local_evidence_refs:['synthetic-local'],local_validation_passed:true}).accepted,false);
});
