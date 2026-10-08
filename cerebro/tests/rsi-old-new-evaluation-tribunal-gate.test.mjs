import test from 'node:test';
import assert from 'node:assert/strict';
import {runOldNewEvaluationTribunalGate,RSI_B3_OLD_NEW_TRIBUNAL_CONTRACT} from '../runtime/rsi-old-new-evaluation-tribunal-gate.mjs';

function candidate(overrides={}){
  return {
    candidate_id:'cand:test-b3',company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
    baseline_version:'old-v1',baseline_version_source:'SOURCE_EVIDENCE_VERSION',baseline_verification_required:false,
    candidate_version:'new-v2',hypothesis:'candidate improves quality',next_gate:'OLD_VS_NEW_EXPERIMENT',
    target_metric:{name:'score',direction:'HIGHER',measurement:'CONTROLLED_OLD_VS_NEW'},confidence:0.90,risk_class:'LOW',
    preservation_contract:{preserve_existing:true,rollback_required:true,rebuild_required:true,policy_mutation_allowed:false,permission_elevation_allowed:false,budget_elevation_allowed:false},
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,...overrides
  };
}
function fixture(){return {fixture_ref:'fixture:rsi-b3:v1',case_ids:['c2','c1','c1'],dataset_kind:'SYNTHETIC'};}
function benchmark(){return {benchmark_id:'rsi-b3-quality',benchmark_version:'v1',holdout_ref:'secret:holdout:rsi-b3',adversarial_refs:['adv:1']};}
function baseArgs(overrides={}){
  return {
    candidate:candidate(),fixture:fixture(),benchmark_contract:benchmark(),judge:{judge_id:'JDG-001',candidate_actor_id:'LRN-001'},
    backup_ref:'backup:b3:1',rollback_ref:'rollback:b3:1',rebuild_ref:'rebuild:b3:1',post_metric_rule:{min:75},canary_percent:5,...overrides
  };
}
function armExecutor({old=70,newer=80,calls=[]}={}){
  return async (input)=>{
    calls.push(input);
    const value=input.arm==='OLD'?old:newer;
    return {version:input.version,fixture_id:input.fixture_id,metrics:{score:value},evidence_refs:[`evidence:${input.arm}:${value}`],prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  };
}

test('B3 approves only an independently judged improvement and prepares PREPROD-only promotion',async()=>{
  const calls=[];
  const result=await runOldNewEvaluationTribunalGate(baseArgs({execute_arm:armExecutor({calls})}));
  assert.equal(result.ok,true);
  assert.equal(result.decision,'APPROVE_PREPROD_NEXT_STAGE');
  assert.equal(result.comparison.delta,10);
  assert.equal(result.tribunal.decision,'PASS');
  assert.equal(result.promotion_plan.state,'PREPROD');
  assert.equal(result.promotion_plan.next_gate,'SHADOW_EVIDENCE');
  assert.equal(result.prod_authorized,false);
  assert.equal(result.prod_write_authorized,false);
  assert.equal(result.trading_access,false);
  assert.equal(result.additional_cost_eur,0);
  assert.equal(calls.length,2);
  assert.deepEqual(calls[0].case_ids,calls[1].case_ids);
  assert.equal(calls[0].fixture_id,calls[1].fixture_id);
  assert.equal(calls[0].version,'old-v1');
  assert.equal(calls[1].version,'new-v2');
  assert.deepEqual(result.replay.case_ids,['c1','c2']);
});

test('B3 rejects a measurable regression and creates no promotion plan',async()=>{
  const result=await runOldNewEvaluationTribunalGate(baseArgs({execute_arm:armExecutor({old:70,newer:60})}));
  assert.equal(result.ok,false);
  assert.equal(result.decision,'REJECT');
  assert.equal(result.tribunal.reason,'candidate_degraded');
  assert.equal(result.next_gate,'RETURN_TO_LEARNING');
  assert.equal(result.promotion_plan,undefined);
});

test('B3 holds an equal result for more evidence',async()=>{
  const result=await runOldNewEvaluationTribunalGate(baseArgs({execute_arm:armExecutor({old:70,newer:70})}));
  assert.equal(result.decision,'HOLD');
  assert.equal(result.tribunal.decision,'MORE_EVIDENCE');
  assert.equal(result.next_gate,'MORE_EVIDENCE');
});

test('B3 emits HUMAN_REQUIRED for HIGH_RISK before executing arms',async()=>{
  let calls=0;
  const result=await runOldNewEvaluationTribunalGate(baseArgs({candidate:candidate({risk_class:'HIGH'}),execute_arm:async()=>{calls+=1;throw new Error('must not execute');}}));
  assert.equal(result.decision,'HUMAN_REQUIRED');
  assert.equal(result.human_required,'HIGH_RISK');
  assert.equal(calls,0);
});

test('B3 emits HUMAN_REQUIRED for LOW_CONFIDENCE before executing arms',async()=>{
  let calls=0;
  const result=await runOldNewEvaluationTribunalGate(baseArgs({candidate:candidate({confidence:0.40}),execute_arm:async()=>{calls+=1;throw new Error('must not execute');}}));
  assert.equal(result.decision,'HUMAN_REQUIRED');
  assert.equal(result.human_required,'LOW_CONFIDENCE');
  assert.equal(calls,0);
});

test('B3 fails closed on any candidate authority expansion',async()=>{
  const result=await runOldNewEvaluationTribunalGate(baseArgs({candidate:candidate({prod_write_authorized:true}),execute_arm:armExecutor()}));
  assert.equal(result.decision,'HUMAN_REQUIRED');
  assert.equal(result.human_required,'SECURITY_INCIDENT');
});

test('B3 holds legacy provisional baseline until exact OLD contract is resolved',async()=>{
  let calls=0;
  const provisional=candidate({baseline_verification_required:true,baseline_version_source:'LEARNING_CONTEXT_VERSION_REQUIRES_OLD_CONTRACT_RESOLUTION'});
  const held=await runOldNewEvaluationTribunalGate(baseArgs({candidate:provisional,execute_arm:async()=>{calls+=1;throw new Error('must not execute');}}));
  assert.equal(held.decision,'HOLD');
  assert.match(held.reasons[0],/OLD_CONTRACT_RESOLUTION/);
  assert.equal(calls,0);
  const approved=await runOldNewEvaluationTribunalGate(baseArgs({candidate:provisional,baseline_resolution:{verified:true,resolved_version:'exact-old-v0',evidence_ref:'git:exact-old-v0'},execute_arm:armExecutor()}));
  assert.equal(approved.decision,'APPROVE_PREPROD_NEXT_STAGE');
  assert.equal(approved.baseline_version,'exact-old-v0');
  assert.equal(approved.baseline_resolution_evidence_ref,'git:exact-old-v0');
});

test('B3 requires backup rollback and rebuild before any experiment',async()=>{
  let calls=0;
  const result=await runOldNewEvaluationTribunalGate(baseArgs({backup_ref:null,execute_arm:async()=>{calls+=1;throw new Error('must not execute');}}));
  assert.equal(result.decision,'HOLD');
  assert.equal(result.reasons[0],'BACKUP_ROLLBACK_REBUILD_REQUIRED');
  assert.equal(calls,0);
});

test('B3 enforces same exact fixture for both arms',async()=>{
  let count=0;
  const bad=async(input)=>{
    count+=1;
    return {version:input.version,fixture_id:count===1?input.fixture_id:'wrong-fixture',metrics:{score:count===1?70:80},evidence_refs:[`e:${count}`],prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  };
  await assert.rejects(()=>runOldNewEvaluationTribunalGate(baseArgs({execute_arm:bad})),/NEW arm fixture mismatch/);
});

test('B3 is reproducible and idempotent for identical evidence',async()=>{
  const a=await runOldNewEvaluationTribunalGate(baseArgs({execute_arm:armExecutor()}));
  const b=await runOldNewEvaluationTribunalGate(baseArgs({execute_arm:armExecutor()}));
  assert.equal(a.gate_id,b.gate_id);
  assert.equal(a.experiment.experiment_id,b.experiment.experiment_id);
  assert.equal(a.replay.replay_id,b.replay.replay_id);
  assert.equal(a.evaluation.evaluation_id,b.evaluation.evaluation_id);
  assert.equal(a.evidence_hash,b.evidence_hash);
});

test('B3 does not guess TARGET/STABLE comparators',async()=>{
  let calls=0;
  const result=await runOldNewEvaluationTribunalGate(baseArgs({candidate:candidate({target_metric:{name:'score',direction:'TARGET',measurement:'CONTROLLED_OLD_VS_NEW'}}),execute_arm:async()=>{calls+=1;throw new Error('must not execute');}}));
  assert.equal(result.decision,'HOLD');
  assert.equal(result.reasons[0],'DOMAIN_COMPARATOR_REQUIRED_FOR_TARGET_OR_STABLE_METRIC');
  assert.equal(calls,0);
});

test('B3 contract remains zero-cost PREPROD-only and explicitly reuses canonical pipelines',()=>{
  assert.equal(RSI_B3_OLD_NEW_TRIBUNAL_CONTRACT.environment,'PREPROD');
  assert.equal(RSI_B3_OLD_NEW_TRIBUNAL_CONTRACT.prod_authorized,false);
  assert.equal(RSI_B3_OLD_NEW_TRIBUNAL_CONTRACT.prod_write_authorized,false);
  assert.equal(RSI_B3_OLD_NEW_TRIBUNAL_CONTRACT.trading_access,false);
  assert.equal(RSI_B3_OLD_NEW_TRIBUNAL_CONTRACT.additional_cost_target_eur,0);
  assert.deepEqual(RSI_B3_OLD_NEW_TRIBUNAL_CONTRACT.reuses,['experiment-pipeline.mjs','evaluation-tribunal.mjs','promotion-pipeline.mjs']);
});
