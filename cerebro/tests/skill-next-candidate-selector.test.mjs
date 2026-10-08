import test from 'node:test';
import assert from 'node:assert/strict';
import {selectNextCandidate,autoloopStateCandidateIds} from '../skills/skill-next-candidate-selector.mjs';

const value={results:[
  {candidate_id:'done-high',declared_name:'done',value_score:95,recommendation:'HIGH_VALUE_LAB_BENCHMARK',engine_bindings:['FACT-001']},
  {candidate_id:'next',declared_name:'next-skill',value_score:72,recommendation:'LAB_BENCHMARK',engine_bindings:['FACT-001']},
  {candidate_id:'later',declared_name:'later-skill',value_score:68,recommendation:'LAB_BENCHMARK',engine_bindings:['FACT-001']},
  {candidate_id:'hold',declared_name:'hold',value_score:99,recommendation:'HOLD_REVIEW',engine_bindings:['FACT-001']}
]};
const registry={behavioral_candidates:{github:{candidate_id:'done-high'}}};

test('selects highest-value unprocessed eligible candidate',()=>{
  const report=selectNextCandidate(value,registry);
  assert.equal(report.selected_candidate_id,'next');
  assert.equal(report.selected.declared_name,'next-skill');
  assert.equal(report.skipped_processed.length,1);
  assert.equal(report.external_code_executed,false);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.autonomous_prod_promotion_authorized,false);
});

test('does not select HOLD candidates',()=>{
  const report=selectNextCandidate({results:[value.results[3]]},{behavioral_candidates:{}});
  assert.equal(report.selected_candidate_id,null);
  assert.equal(report.no_candidate_reason,'NO_UNPROCESSED_ELIGIBLE_STATIC_CANDIDATE');
});

test('returns none when all eligible candidates already have evidence',()=>{
  const report=selectNextCandidate({results:[value.results[0]]},registry);
  assert.equal(report.selected_candidate_id,null);
  assert.equal(report.skipped_processed.length,1);
});

test('persistent AutoLoop state excludes in-flight and waiting-human candidates',()=>{
  const state={
    processed_candidate_ids:['next'],
    in_flight:{'another':{candidate_id:'another'}},
    waiting_human:{'done-high':{candidate_id:'done-high',human_required:'HIGH_RISK'}},
    waiting_safe_handler:{},completed:{},terminal_hold:{}
  };
  const ids=autoloopStateCandidateIds(state);
  assert.ok(ids.has('next'));
  assert.ok(ids.has('another'));
  assert.ok(ids.has('done-high'));
  const report=selectNextCandidate(value,registry,state);
  assert.equal(report.selected_candidate_id,'later');
  assert.equal(report.autoloop_state_applied,true);
  assert.ok(report.skipped_processed.some((x)=>x.candidate_id==='next'));
});

test('waiting safe handler does not block the whole queue, only that candidate',()=>{
  const state={waiting_safe_handler:{next:{candidate_id:'next',stage:'NEEDS_CANDIDATE_HANDLER'}}};
  const report=selectNextCandidate(value,{behavioral_candidates:{}},state);
  assert.equal(report.selected_candidate_id,'done-high');
  assert.ok(report.processed_candidates.includes('next'));
});
