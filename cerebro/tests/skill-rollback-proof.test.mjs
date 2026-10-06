import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRollbackProof} from '../skills/skill-rollback-proof.mjs';

const safePlan=()=>({wrapper_id:'skillwrap:test',candidate_id:'c1',enabled:false,execution_authorized:false,install_authorized:false,prod_authorized:false,contract:{side_effects:'DENY_BY_DEFAULT'},permissions:{network:false,filesystem_read:false,filesystem_write:false,credentials:false,external_actions:false,prod_write:false,trading_access:false},quality:{rollback_required:true},provenance:{upstream_head_commit:'abc',manifest_sha256:'def'}});

test('disabled zero-permission wrapper proves reversible binding layer',()=>{
  const r=buildRollbackProof({wrappers:{plans:[safePlan()]}});
  assert.equal(r.ready,true);
  assert.equal(r.status,'GREEN_ROLLBACK_REBUILD_PROOF');
  assert.equal(r.plans[0].evidence.baseline_restored,true);
  assert.equal(r.plans[0].evidence.rebuild_disabled_by_default,true);
  assert.equal(r.prod_authorized,false);
});

test('enabled or privileged wrapper fails rollback proof',()=>{
  const p=safePlan();
  p.enabled=true;
  p.permissions.network=true;
  const r=buildRollbackProof({wrappers:{plans:[p]}});
  assert.equal(r.ready,false);
  assert.ok(r.plans[0].blockers.includes('WRAPPER_NOT_DISABLED'));
  assert.ok(r.plans[0].blockers.includes('NONZERO_PERMISSION_PRESENT'));
});

test('proof explicitly does not claim rollback of future side effects',()=>{
  const r=buildRollbackProof({wrappers:{plans:[safePlan()]}});
  assert.equal(r.proof_scope,'WRAPPER_BINDING_ONLY_SYNTHETIC');
  assert.match(r.note,/does not prove rollback/i);
});
