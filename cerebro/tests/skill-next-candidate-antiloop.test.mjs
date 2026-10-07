import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectNextCandidate} from '../skills/skill-next-candidate-selector.mjs';

const registry=JSON.parse(fs.readFileSync(new URL('../registry/skill-supply-chain-v0.json',import.meta.url),'utf8'));

test('promoted Skill Creator is processed and selector advances without repeating LAB/PREPROD',()=>{
  const valueReport={results:[
    {
      candidate_id:'lobehub-skills:950cf07380d1daa6de69',
      declared_name:'skill-creator',
      value_score:100,
      recommendation:'HIGH_VALUE_LAB_BENCHMARK'
    },
    {
      candidate_id:'skill:test-next-unprocessed',
      declared_name:'next-unprocessed',
      value_score:90,
      recommendation:'LAB_BENCHMARK',
      engine_bindings:['FACT-001']
    }
  ]};
  const result=selectNextCandidate(valueReport,registry);
  assert.ok(result.processed_candidates.includes('lobehub-skills:950cf07380d1daa6de69'));
  assert.ok(result.skipped_processed.some((item)=>item.candidate_id==='lobehub-skills:950cf07380d1daa6de69'&&item.reason==='ALREADY_HAS_BEHAVIORAL_OR_LATER_EVIDENCE'));
  assert.equal(result.selected_candidate_id,'skill:test-next-unprocessed');
  assert.equal(result.external_code_executed,false);
  assert.equal(result.adoption_authorized,false);
  assert.equal(result.prod_authorized,false);
});
