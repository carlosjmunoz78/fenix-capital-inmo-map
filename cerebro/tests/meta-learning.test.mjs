import test from 'node:test';
import assert from 'node:assert/strict';
import {computeMetaMetrics,createMetaCandidate,detectLearningBottleneck,metaGate} from '../runtime/meta-learning.mjs';

const candidate=()=>createMetaCandidate({company_id:'fenix',engine_id:'LRN-001',environment:'LAB',version:'0.1.0',target_stage:'evaluate',prior_strategy_version:'v1',candidate_strategy_version:'v2',dataset_scope:'synthetic-holdout',metric_definition:{name:'quality'},leakage_checks:['holdout'],anti_gaming_checks:['real-outcome'],proposed_change:{kind:'threshold'}});

test('meta metrics compute yield efficiency latency and regressions deterministically',()=>{
  const m=computeMetaMetrics({candidates_evaluated:10,useful_improvements:4,evidence_cost:2,validated_gain:1,signal_at:'2026-10-08T10:00:00Z',validated_at:'2026-10-08T10:05:00Z',promoted_changes:5,regressions:1});
  assert.equal(m.learning_yield,0.4);
  assert.equal(m.evidence_efficiency,0.5);
  assert.equal(m.time_from_signal_to_validated_learning_ms,300000);
  assert.equal(m.regression_from_promoted_changes,0.2);
});

test('meta candidate cannot weaken gates or self-elevate',()=>{
  assert.equal(candidate().prod_authorized,false);
  assert.throws(()=>createMetaCandidate({company_id:'fenix',engine_id:'LRN-001',target_stage:'judge',prior_strategy_version:'1',candidate_strategy_version:'2',dataset_scope:'x',metric_definition:{},leakage_checks:[],anti_gaming_checks:[],proposed_change:{},reduces_requirements:true}),/cannot weaken/);
  assert.throws(()=>createMetaCandidate({company_id:'fenix',engine_id:'LRN-001',target_stage:'judge',prior_strategy_version:'1',candidate_strategy_version:'2',dataset_scope:'x',metric_definition:{},leakage_checks:[],anti_gaming_checks:[],proposed_change:{},may_edit_judge:true}),/self judge/);
});

test('meta gate fails closed until independent evaluation judge rollback and rebuild are green',()=>{
  const closed=metaGate({candidate:candidate()});
  assert.equal(closed.ok,false);
  assert.ok(closed.reasons.includes('independent_evaluation_required'));
  assert.ok(closed.reasons.includes('rollback_required'));
  const green=metaGate({candidate:candidate(),independent_evaluation:true,independent_judge:true,rollback_ready:true,rebuild_ready:true});
  assert.equal(green.ok,true);
  assert.equal(green.next_gate,'META_EXPERIMENT_REVIEW');
  assert.equal(green.prod_authorized,false);
});

test('bottleneck selects highest valid canonical stage metric',()=>{
  assert.deepEqual(detectLearningBottleneck({collect:2,learn:8,promote:3,unknown:99}),{stage:'learn',cost_or_latency:8});
});
