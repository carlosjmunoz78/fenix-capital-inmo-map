import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const state=JSON.parse(fs.readFileSync(new URL('../registry/engine-autonomy-state.v1.json',import.meta.url),'utf8'));

test('HCI-001 and MOTION-001 preserve structural evidence and advance only to tested non-live PREPROD code',()=>{
  assert.equal(state.prod_execution_enabled,false);assert.equal(state.additional_cost_eur,0);
  assert.equal(state.structural_evidence_run.status,'STRUCTURAL_FACTORY_GREEN');assert.equal(state.structural_evidence_run.base_registry_preserved,true);assert.equal(state.structural_evidence_run.base_engine_count,177);assert.equal(state.structural_evidence_run.canonical_engine_count,179);
  assert.equal(state.behavioral_code_evidence.status,'CODE_AND_CONTRACT_TESTS_GREEN');assert.equal(state.behavioral_code_evidence.live_connected,false);assert.equal(state.behavioral_code_evidence.prod_deploy,'SKIPPED');
  assert.deepEqual(state.engines.map(x=>x.engine_id),['HCI-001','MOTION-001']);
  for(const e of state.engines){assert.equal(e.environment,'PREPROD');assert.equal(e.autonomy_state,'PREPROD_CODE_TESTED_NOT_LIVE_CONNECTED');assert.equal(e.execution_model,'DETERMINISTIC_LIBRARY_NOT_LIVE_BOUND');assert.equal(e.behavioral_implementation_state,'IMPLEMENTED_AND_TESTED_IN_CODE');assert.equal(e.structural_file_count,18);assert.equal(e.old_vs_new_logic_present,true);assert.equal(e.lrn001_signal_contract_present,true);assert.match(e.target_engine_evaluation_state,/EVA001_NOT_RUN$/);assert.equal(e.target_engine_tribunal_state,'TARGET_TRIBUNAL_NOT_RUN');assert.equal(e.prod_authorized,false);assert.equal(e.prod_write_authorized,false);assert.equal(e.trading_access,false);assert.equal(e.additional_cost_eur,0);}
});
