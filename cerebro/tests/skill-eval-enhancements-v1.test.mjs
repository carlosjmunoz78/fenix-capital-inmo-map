import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cohenKappa,judgeCalibrationGate,buildAdversarialScenarioMatrix,buildControlledAblationPlan,buildSkillHealthSnapshot,externalPatternDisposition
} from '../runtime/skill-eval-enhancements-v1.mjs';

test('cohen kappa returns perfect agreement',()=>{
  const r=cohenKappa({human_labels:['PASS','FAIL','PASS'],judge_labels:['PASS','FAIL','PASS']});
  assert.equal(r.kappa,1);
  assert.equal(r.sample_size,3);
});

test('judge calibration fails closed below threshold',()=>{
  const r=judgeCalibrationGate({human_labels:['PASS','PASS','FAIL','FAIL'],judge_labels:['PASS','FAIL','PASS','FAIL'],minimum_kappa:0.6});
  assert.equal(r.decision,'HOLD');
  assert.equal(r.calibrated_judge_authorized,false);
  assert.equal(r.prod_authorized,false);
});

test('adversarial matrix is deterministic and bounded',()=>{
  const r=buildAdversarialScenarioMatrix({personas:['expert','novice'],failure_cases:['tool-misuse','bad-escalation'],max_scenarios:3});
  assert.equal(r.scenario_count,3);
  assert.deepEqual(r.scenarios.map((x)=>[x.persona,x.failure_case]),[
    ['expert','bad-escalation'],['expert','tool-misuse'],['novice','bad-escalation']
  ]);
});

test('controlled ablation changes exactly one untested parameter and remembers dead ends',()=>{
  const r=buildControlledAblationPlan({champion_id:'skill:v3',parameters:['trigger','routine','tool-description'],dead_end_parameters:['trigger'],history:[{parameter:'routine',decision:'REJECTED'}]});
  assert.equal(r.decision,'TEST_ONE_VARIABLE');
  assert.equal(r.next_parameter,'tool-description');
  assert.equal(r.change_count,1);
  assert.equal(r.rollback_required,true);
});

test('skill health requires provenance spec freshness and non-ineffective eval',()=>{
  const r=buildSkillHealthSnapshot({
    now:'2026-10-13T00:00:00Z',stale_after_days:90,
    skills:[
      {skill_id:'good',source:'github',version:'1',fingerprint:'abc',spec_valid:true,last_used_at:'2026-10-12T00:00:00Z',eval_effectiveness:'EFFECTIVE'},
      {skill_id:'stale',source:'github',version:'1',fingerprint:'def',spec_valid:true,last_used_at:'2025-01-01T00:00:00Z',eval_effectiveness:'EFFECTIVE'},
      {skill_id:'bad',source:'github',version:'1',fingerprint:'ghi',spec_valid:true,last_used_at:'2026-10-12T00:00:00Z',eval_effectiveness:'INEFFECTIVE'}
    ]
  });
  assert.equal(r.total,3);
  assert.equal(r.healthy,1);
  assert.equal(r.needs_attention,2);
  assert.equal(r.prod_write_authorized,false);
});

test('external pattern disposition preserves license boundaries and no new engine',()=>{
  const r=externalPatternDisposition();
  assert.equal(r.sources.length,3);
  assert.equal(r.new_engine_required,false);
  assert.equal(r.additional_cost_eur,0);
  assert.equal(r.sources.find((s)=>s.source==='justinwetch/Skill-RSI').reuse,'PATTERNS_ONLY');
});
