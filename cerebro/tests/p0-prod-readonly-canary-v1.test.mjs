import test from 'node:test';
import assert from 'node:assert/strict';
import {runP0ProdReadonlyCanary} from '../runtime/p0-prod-readonly-canary-v1.mjs';

test('P0 canary probe covers all 10 exact capabilities without side effects or authority',()=>{
  const r=runP0ProdReadonlyCanary({requireMain:false,ref:'refs/heads/test',sha:'a'.repeat(40)});
  assert.equal(r.status,'GREEN_P0_PROD_READONLY_CANARY_SET');
  assert.equal(r.capability_count,10);
  assert.equal(r.prod_write_authorized,false);
  assert.equal(r.prod_mutation_authorized,false);
  assert.equal(r.external_skill_code_execution,false);
  assert.equal(r.trading_access,false);
  assert.equal(r.additional_cost_eur,0);
  for(const row of r.canaries){assert.match(row.evidence,/^GREEN_[A-Z0-9_]+_PROD_READONLY_CANARY$/);assert.equal(row.side_effects,false);assert.ok(row.representative_engine_id);}
});

test('canonical canary requires main ref when requested',()=>{
  assert.throws(()=>runP0ProdReadonlyCanary({requireMain:true,ref:'refs/heads/feature',sha:'b'.repeat(40)}),/MAIN_REF_REQUIRED/);
});
