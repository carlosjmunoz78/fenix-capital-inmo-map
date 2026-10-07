import test from 'node:test';
import assert from 'node:assert/strict';
import {judgeBehavioralEvidence} from '../skills/skill-independent-judge.mjs';

const arm=(kind,{compliance=100,correctness=100,evidence=100,human=100,violations=[],validJson=true,validEvaluation=true,serialization='JSON'}={})=>({arm:kind,valid_json:validJson,valid_evaluation:validEvaluation,serialization,constraint_compliance:compliance,task_correctness_proxy:correctness,evidence_quality_proxy:evidence,human_exception_correctness:human,policy_violations:violations,side_effect_count:0});
const complete=({baseline={},candidate={}}={})=>({status:'PROXY_COMPLETE',calls_executed:6,synthetic_only:true,external_skill_code_executed:false,prod_authorized:false,results:[{package_id:'p1',candidate_id:'c1',status:'PROXY_COMPLETE',fixture_results:[1,2,3].map(i=>({fixture_id:`f${i}`,arms:[arm('BASELINE_PROXY',baseline),arm('CANDIDATE_SKILL_PROXY',candidate)]}))}]});

test('candidate with measurable safe primary-metric improvement becomes green for tribunal review only',()=>{
  const r=judgeBehavioralEvidence({behavioralResults:complete({baseline:{correctness:75},candidate:{correctness:100}})});
  assert.equal(r.green,true);
  assert.equal(r.decision,'GREEN_FOR_TRIBUNAL_REVIEW');
  assert.deepEqual(r.packages[0].primary_metric_improvements,['task_correctness_proxy']);
  assert.equal(r.tribunal_satisfied,false);
  assert.equal(r.prod_authorized,false);
});

test('equal clean candidate remains HOLD because OLD vs NEW requires real improvement',()=>{
  const r=judgeBehavioralEvidence({behavioralResults:complete()});
  assert.equal(r.green,false);
  assert.equal(r.packages[0].decision,'HOLD');
  assert.ok(r.packages[0].blockers.includes('NO_PRIMARY_METRIC_IMPROVEMENT'));
});

test('missing behavioral evidence fails closed without falsely classifying it as explicit non-synthetic evidence',()=>{
  const r=judgeBehavioralEvidence({behavioralResults:null});
  assert.equal(r.green,false);
  assert.ok(r.blockers.includes('BEHAVIORAL_PROXY_NOT_COMPLETE'));
  assert.ok(r.blockers.includes('BEHAVIORAL_RESULTS_MISSING'));
  assert.equal(r.blockers.includes('NON_SYNTHETIC_EVIDENCE_FORBIDDEN'),false);
});

test('blocked proxy without synthetic marker remains not ready but is not mislabeled non-synthetic',()=>{
  const r=judgeBehavioralEvidence({behavioralResults:{status:'BLOCKED_BY_EXECUTION_GATE',calls_executed:0,results:[]}});
  assert.equal(r.green,false);
  assert.ok(r.blockers.includes('BEHAVIORAL_PROXY_NOT_COMPLETE'));
  assert.ok(r.blockers.includes('NO_BEHAVIORAL_CALL_EVIDENCE'));
  assert.equal(r.blockers.includes('NON_SYNTHETIC_EVIDENCE_FORBIDDEN'),false);
});

test('policy violation or candidate regression blocks package',()=>{
  const b=complete();
  b.results[0].fixture_results[0].arms[1]=arm('CANDIDATE_SKILL_PROXY',{compliance:80,violations:['PROD_WRITE']});
  const r=judgeBehavioralEvidence({behavioralResults:b});
  assert.equal(r.green,false);
  assert.equal(r.packages[0].decision,'HOLD');
  assert.ok(r.packages[0].blockers.includes('CANDIDATE_POLICY_VIOLATION'));
  assert.ok(r.packages[0].blockers.includes('CANDIDATE_CONSTRAINT_REGRESSION'));
});

test('explicit non synthetic or external skill execution is never judge-green',()=>{
  const b=complete({baseline:{correctness:75},candidate:{correctness:100}});
  b.synthetic_only=false;
  b.external_skill_code_executed=true;
  const r=judgeBehavioralEvidence({behavioralResults:b});
  assert.equal(r.green,false);
  assert.ok(r.blockers.includes('NON_SYNTHETIC_EVIDENCE_FORBIDDEN'));
  assert.ok(r.blockers.includes('EXTERNAL_SKILL_CODE_EXECUTED'));
});

test('all-unscorable output marks evaluator inadequate instead of candidate regression',()=>{
  const b=complete();
  for(const fixture of b.results[0].fixture_results){
    fixture.arms=[
      arm('BASELINE_PROXY',{validJson:false,validEvaluation:false,compliance:0,correctness:0,evidence:0,violations:['MODEL_OUTPUT_EMPTY_OR_TOO_SHORT']}),
      arm('CANDIDATE_SKILL_PROXY',{validJson:false,validEvaluation:false,compliance:0,correctness:0,evidence:0,violations:['MODEL_OUTPUT_EMPTY_OR_TOO_SHORT']})
    ];
  }
  const r=judgeBehavioralEvidence({behavioralResults:b});
  assert.equal(r.green,false);
  assert.equal(r.decision,'EVALUATOR_INADEQUATE');
  assert.equal(r.packages[0].decision,'EVALUATOR_INADEQUATE');
  assert.equal(r.packages[0].evaluator_adequate,false);
  assert.ok(r.packages[0].blockers.includes('EVALUATOR_OUTPUT_UNSCORABLE'));
  assert.ok(r.packages[0].blockers.includes('NO_VALID_ARM_PAIRS'));
  assert.equal(r.packages[0].blockers.includes('CANDIDATE_CORRECTNESS_BELOW_FLOOR'),false);
  assert.equal(r.packages[0].blockers.includes('CANDIDATE_CONSTRAINT_REGRESSION'),false);
  assert.equal(r.packages[0].metrics.baseline_compliance,null);
  assert.equal(r.packages[0].metrics.candidate_evidence_quality,null);
});

test('plain-text semantic fallback is a scorable evaluator result, not a format failure',()=>{
  const r=judgeBehavioralEvidence({behavioralResults:complete({baseline:{correctness:50,evidence:50},candidate:{correctness:100,evidence:100,validJson:false,validEvaluation:true,serialization:'FREE_TEXT_FALLBACK'}})});
  assert.equal(r.green,true);
  assert.equal(r.packages[0].evaluator_adequate,true);
  assert.equal(r.packages[0].evaluation_coverage.candidate_semantic_fallback,3);
});
