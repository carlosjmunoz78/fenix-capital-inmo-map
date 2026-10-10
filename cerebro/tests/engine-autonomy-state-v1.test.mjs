import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const state=JSON.parse(fs.readFileSync(new URL('../registry/engine-autonomy-state.v1.json',import.meta.url),'utf8'));

test('HCI-001 and MOTION-001 are recorded only as verified structural scaffolds',()=>{
  assert.equal(state.prod_execution_enabled,false);assert.equal(state.additional_cost_eur,0);assert.equal(state.evidence_run.status,'STRUCTURAL_FACTORY_GREEN');assert.equal(state.evidence_run.base_registry_preserved,true);assert.equal(state.evidence_run.base_engine_count,177);assert.equal(state.evidence_run.canonical_engine_count,179);
  assert.deepEqual(state.engines.map(x=>x.engine_id),['HCI-001','MOTION-001']);
  for(const e of state.engines){assert.equal(e.environment,'SCAFFOLD');assert.equal(e.autonomy_state,'STRUCTURAL_SCAFFOLD_VERIFIED');assert.equal(e.behavioral_implementation_state,'NOT_IMPLEMENTED');assert.equal(e.target_engine_evaluation_state,'NOT_RUN_SCAFFOLD_ONLY');assert.equal(e.target_engine_tribunal_state,'NOT_RUN_SCAFFOLD_ONLY');assert.equal(e.structural_file_count,18);assert.equal(e.prod_authorized,false);assert.equal(e.prod_write_authorized,false);assert.equal(e.trading_access,false);assert.equal(e.additional_cost_eur,0);}
});
