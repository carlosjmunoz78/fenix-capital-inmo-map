import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');

test('dynamic adoption registry starts fail-closed and cannot grant PROD mutation authority',()=>{
  const registry=JSON.parse(fs.readFileSync(path.join(root,'cerebro/registry/skill-dynamic-adoption-v1.json'),'utf8'));
  assert.equal(registry.state_type,'CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1');
  assert.equal(registry.environment,'PREPROD');
  assert.equal(registry.policy.full_safe_preprod_required,true);
  assert.equal(registry.policy.real_prod_readonly_canary_required,true);
  assert.equal(registry.policy.external_skill_code_execution,false);
  assert.equal(registry.policy.prod_write_authorized,false);
  assert.equal(registry.policy.prod_mutation_authorized,false);
  assert.equal(registry.policy.trading_access,false);
  assert.equal(registry.policy.additional_cost_budget_eur,0);
  assert.deepEqual(registry.capabilities,[]);
});
