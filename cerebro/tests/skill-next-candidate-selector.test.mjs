import test from 'node:test';
import assert from 'node:assert/strict';
import {selectNextCandidate} from '../skills/skill-next-candidate-selector.mjs';

const value={results:[
  {candidate_id:'done-high',declared_name:'done',value_score:95,recommendation:'HIGH_VALUE_LAB_BENCHMARK',engine_bindings:['FACT-001']},
  {candidate_id:'next',declared_name:'next-skill',value_score:72,recommendation:'LAB_BENCHMARK',engine_bindings:['FACT-001']},
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
});

test('does not select HOLD candidates',()=>{
  const report=selectNextCandidate({results:[value.results[2]]},{behavioral_candidates:{}});
  assert.equal(report.selected_candidate_id,null);
  assert.equal(report.no_candidate_reason,'NO_UNPROCESSED_ELIGIBLE_STATIC_CANDIDATE');
});

test('returns none when all eligible candidates already have evidence',()=>{
  const report=selectNextCandidate({results:[value.results[0]]},registry);
  assert.equal(report.selected_candidate_id,null);
  assert.equal(report.skipped_processed.length,1);
});
