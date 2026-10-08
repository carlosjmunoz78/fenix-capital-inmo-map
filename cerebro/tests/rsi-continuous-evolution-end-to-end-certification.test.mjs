import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildUniversalLearningEventReport} from '../runtime/universal-learning-ingress.mjs';
import {runLearningWorkerOnce} from '../runtime/rsi-learning-worker.mjs';
import {materializeImprovementCandidates,ImprovementCandidateLedgerV0} from '../runtime/improvement-candidate-factory.mjs';
import {LearningLedgerV0} from '../runtime/learning-ledger.mjs';
import {runOldNewEvaluationTribunalGate} from '../runtime/rsi-old-new-evaluation-tribunal-gate.mjs';
import {defineDomainAutonomyPolicy,evaluateDomainAdoptionPolicy,tripDomainKillSwitch} from '../runtime/rsi-domain-autonomy-policy.mjs';
import {runPreprodAdoptionMonitoringLoop} from '../runtime/rsi-preprod-adoption-monitoring-loop.mjs';

function temp(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-rsi-full-cert-'));return {dir,learning:path.join(dir,'learning.v8'),candidates:path.join(dir,'candidates.v8')};}
function initialSignal({id='initial-safe',type='ENGINE_RESULT',version='old-v1',risk='LOW',confidence=0.90}={}){
  return {signal_id:id,signal_type:type,company_id:'fenix',engine_id:'SEO-001',source_environment:'PREPROD',version,observed_at:'2026-10-09T00:00:00Z',severity:risk==='HIGH'?'HIGH':'LOW',risk_class:risk,confidence,reason:`certification ${id}`,metric:{name:'operational_quality',direction:'HIGHER',measurement:'CONTROLLED_OLD_VS_NEW'},evidence_refs:[`evidence:${id}`],payload:{certification:true},contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
}
function persistSignal({signal,learning,observed_at='2026-10-09T00:01:00Z'}){
  const report=buildUniversalLearningEventReport(signal);
  const result=runLearningWorkerOnce({event_report:report,ledger_file:learning,preprod_version:'0.5.0',policy_pass:true,security_pass:true,local_persistence_enabled:true,observed_at});
  return {report,result};
}
function materialize({learning,candidates}){return materializeImprovementCandidates({learning_ledger_file:learning,candidate_ledger_file:candidates,company_id:'fenix'});}
function candidateList(file){return new ImprovementCandidateLedgerV0({file_path:file}).list();}
function armExecutor(oldValue,newValue){return async(input)=>({version:input.version,fixture_id:input.fixture_id,metrics:{[input.metric]:input.arm==='OLD'?oldValue:newValue},evidence_refs:[`cert:${input.arm}:${input.version}`],prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});}
function b3Args(candidate,{oldValue=70,newValue=90}={}){
  return {
    candidate,
    fixture:{fixture_ref:'fixture:rsi-full-cert:v1',case_ids:['case-1','case-2','case-3'],dataset_kind:'SYNTHETIC'},
    execute_arm:armExecutor(oldValue,newValue),
    benchmark_contract:{benchmark_id:'rsi-full-cert-quality',benchmark_version:'v1',holdout_ref:'holdout:rsi-full-cert:secret',adversarial_refs:['adv:rsi-full-cert:1']},
    judge:{judge_id:'JDG-RSI-CERT-001',candidate_actor_id:'LRN-001'},
    baseline_resolution:candidate.baseline_verification_required===true?{verified:true,resolved_version:'old-v1',evidence_ref:'git:certification:exact-old-v1'}:null,
    backup_ref:'backup:rsi-full-cert',rollback_ref:'rollback:rsi-full-cert',rebuild_ref:'rebuild:rsi-full-cert',post_metric_rule:{min:80},canary_percent:5,candidate_visible_holdout:false
  };
}
function policy(candidate){return defineDomainAutonomyPolicy({policy_id:'rsi-domain:seo-preprod-cert',policy_version:'v1',company_id:candidate.company_id,engine_id:candidate.engine_id,domain_id:'seo.continuous_improvement',environment:'PREPROD',autonomy_mode:'PREPROD_AUTONOMOUS',kill_switch_enabled:true,kill_switch_state:'ARMED',automatic_rollback_allowed:true,min_confidence:0.60,max_canary_percent:10,blast_radius:{max_percent:10,max_records:100,scope:'PREPROD_ONLY'},additional_cost_limit_eur:0,allowed_risk_classes:['LOW','MEDIUM']});}
function b4Args(promotion_plan,metricName,value){return {promotion_plan,shadow_evidence:{pass:true,evidence_refs:['shadow:cert:green'],prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0},canary_evidence:{pass:true,evidence_refs:['canary:cert:green'],prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0},observed_metrics:{[metricName]:value},observed_at:'2026-10-09T00:10:00Z',evidence_refs:['tribunal:cert:green']};}

test('FINAL CERT: evidence -> LRN -> versioned candidate -> OLD/NEW -> tribunal -> bounded canary -> keep -> relearn -> next candidate',async()=>{
  const t=temp();
  try{
    const initial=persistSignal({signal:initialSignal(),learning:t.learning});
    assert.equal(initial.result.status,'GREEN');
    assert.equal(initial.result.persisted_total,1);
    const firstMat=materialize({learning:t.learning,candidates:t.candidates});
    assert.equal(firstMat.persisted_total,1);
    const first=candidateList(t.candidates)[0];
    assert.equal(first.next_gate,'OLD_VS_NEW_EXPERIMENT');
    assert.equal(first.prod_authorized,false);
    const b3=await runOldNewEvaluationTribunalGate(b3Args(first));
    assert.equal(b3.decision,'APPROVE_PREPROD_NEXT_STAGE');
    assert.equal(b3.tribunal.decision,'PASS');
    const domainPolicy=policy(first);
    const adoption=evaluateDomainAdoptionPolicy({policy:domainPolicy,candidate:first,promotion_plan:b3.promotion_plan});
    assert.equal(adoption.decision,'ALLOW_PREPROD_CANARY');
    const metric=first.target_metric.name;
    const b4=runPreprodAdoptionMonitoringLoop(b4Args(b3.promotion_plan,metric,90));
    assert.equal(b4.decision,'KEEP_NONPROD_AND_RELEARN');
    assert.equal(b4.next_gate,'B1_UNIVERSAL_LEARNING_INGRESS');
    const replay=runLearningWorkerOnce({event_report:b4.feedback_report,ledger_file:t.learning,preprod_version:'0.5.0',policy_pass:true,security_pass:true,local_persistence_enabled:true,observed_at:'2026-10-09T00:11:00Z'});
    assert.equal(replay.status,'GREEN');
    assert.equal(replay.persisted_total,1);
    assert.equal(new LearningLedgerV0({file_path:t.learning}).operation_count,2);
    const secondMat=materialize({learning:t.learning,candidates:t.candidates});
    assert.equal(secondMat.persisted_total,1);
    assert.equal(candidateList(t.candidates).length,2);
    const newest=candidateList(t.candidates).find(item=>item.candidate_id!==first.candidate_id);
    assert.ok(newest);
    assert.equal(newest.next_gate,'OLD_VS_NEW_EXPERIMENT');
    assert.equal(newest.prod_authorized,false);
    assert.equal(newest.trading_access,false);
    assert.equal(newest.additional_cost_eur,0);
  }finally{fs.rmSync(t.dir,{recursive:true,force:true});}
});

test('FINAL CERT: measurable OLD/NEW regression is rejected before adoption',async()=>{
  const t=temp();
  try{
    persistSignal({signal:initialSignal({id:'initial-regression'}),learning:t.learning});
    materialize({learning:t.learning,candidates:t.candidates});
    const candidate=candidateList(t.candidates)[0];
    const b3=await runOldNewEvaluationTribunalGate(b3Args(candidate,{oldValue:90,newValue:70}));
    assert.equal(b3.decision,'REJECT');
    assert.equal(b3.tribunal.decision,'FAIL');
    assert.equal(b3.next_gate,'RETURN_TO_LEARNING');
    assert.equal(b3.promotion_plan,undefined);
    assert.equal(b3.prod_authorized,false);
    assert.equal(b3.trading_access,false);
  }finally{fs.rmSync(t.dir,{recursive:true,force:true});}
});

test('FINAL CERT: accepted candidate that regresses in canary automatically rolls back and relearns',async()=>{
  const t=temp();
  try{
    persistSignal({signal:initialSignal({id:'initial-canary-rollback'}),learning:t.learning});
    materialize({learning:t.learning,candidates:t.candidates});
    const first=candidateList(t.candidates)[0];
    const b3=await runOldNewEvaluationTribunalGate(b3Args(first,{oldValue:70,newValue:90}));
    assert.equal(b3.decision,'APPROVE_PREPROD_NEXT_STAGE');
    assert.equal(evaluateDomainAdoptionPolicy({policy:policy(first),candidate:first,promotion_plan:b3.promotion_plan}).decision,'ALLOW_PREPROD_CANARY');
    const b4=runPreprodAdoptionMonitoringLoop(b4Args(b3.promotion_plan,first.target_metric.name,60));
    assert.equal(b4.decision,'ROLLBACK_AND_RELEARN');
    assert.equal(b4.rollback_executed,true);
    assert.equal(b4.rollback_ref,'rollback:rsi-full-cert');
    assert.equal(b4.feedback_report.events[0].source_type,'OBSERVABILITY_ALERT');
    const worker=runLearningWorkerOnce({event_report:b4.feedback_report,ledger_file:t.learning,preprod_version:'0.5.0',policy_pass:true,security_pass:true,local_persistence_enabled:true,observed_at:'2026-10-09T00:12:00Z'});
    assert.equal(worker.persisted_total,1);
    const remat=materialize({learning:t.learning,candidates:t.candidates});
    assert.equal(remat.persisted_total,1);
    assert.equal(candidateList(t.candidates).length,2);
  }finally{fs.rmSync(t.dir,{recursive:true,force:true});}
});

test('FINAL CERT: tripped domain kill switch blocks canary without PROD side effects',async()=>{
  const t=temp();
  try{
    persistSignal({signal:initialSignal({id:'initial-kill-switch'}),learning:t.learning});
    materialize({learning:t.learning,candidates:t.candidates});
    const candidate=candidateList(t.candidates)[0];
    const b3=await runOldNewEvaluationTribunalGate(b3Args(candidate));
    const tripped=tripDomainKillSwitch(policy(candidate),'certification trip');
    const blocked=evaluateDomainAdoptionPolicy({policy:tripped,candidate,promotion_plan:b3.promotion_plan});
    assert.equal(blocked.decision,'KILL_SWITCH_BLOCK');
    assert.equal(blocked.prod_authorized,false);
    assert.equal(blocked.prod_write_authorized,false);
    assert.equal(blocked.trading_access,false);
    assert.equal(blocked.additional_cost_eur,0);
  }finally{fs.rmSync(t.dir,{recursive:true,force:true});}
});
