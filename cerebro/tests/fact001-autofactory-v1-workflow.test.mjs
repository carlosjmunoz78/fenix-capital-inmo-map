import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../../.github/workflows/cerebro-fact001-autofactory-v1.yml',import.meta.url),'utf8');

test('FACT-001 V1 workflow is hostless read-only and preserves V0 boundary',()=>{
  assert.match(workflow,/name: CEREBRO FACT-001 AutoFactory V1/);assert.match(workflow,/permissions:\n  contents: read/);assert.doesNotMatch(workflow,/contents:\s*write/);assert.doesNotMatch(workflow,/secrets\./);assert.match(workflow,/base_registry_preserved/);assert.match(workflow,/base_engine_count:177/);assert.match(workflow,/canonical_engine_count:179/);
});

test('FACT-001 V1 workflow allows only the two owner-approved extension engines',()=>{
  assert.match(workflow,/HCI-001/);assert.match(workflow,/MOTION-001/);assert.match(workflow,/unauthorized extension engine/);assert.match(workflow,/generated_file_count!==18/);
});

test('FACT-001 V1 workflow cannot authorize PROD Trading external execution or spend',()=>{
  assert.match(workflow,/additional_cost_eur:0/);assert.match(workflow,/prod_authorized:false/);assert.match(workflow,/prod_write_authorized:false/);assert.match(workflow,/trading_access:false/);assert.match(workflow,/external_code_execution!==false/);assert.match(workflow,/NOT_RUN_SCAFFOLD_ONLY/);
});
