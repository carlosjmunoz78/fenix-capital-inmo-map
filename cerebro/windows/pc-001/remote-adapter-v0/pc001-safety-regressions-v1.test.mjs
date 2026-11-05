import test from 'node:test';
import assert from 'node:assert/strict';
import {requestMatches, claimPc001VisibleProof} from './pc001-remote-policy-v0.mjs';

// This file checks rejection only. It cannot send commands or access Windows.
const malformed = [
  null, [], 'invalid', {},
  {payload:null}, {payload:[]},
  {payload:{}}, {payload:{policy:null}},
  {payload:{policy:[]}}, {payload:{policy:'invalid'}},
];
test('malformed Gateway command shapes never crash or authorize', () => {
  for (const row of malformed) {
    assert.doesNotThrow(() => requestMatches(row, 'test-device'));
    assert.equal(requestMatches(row, 'test-device'), false);
    const result=claimPc001VisibleProof({row,deviceIdentity:{canonical_device_id:'test-device',enrolled:true,revoked:false},local:{transport_authenticated:true,gateway_worker_quiescent:true,interactive_user_session:true,local_consent_accepted:true,verified_fixture_sha256:'d150f09b0580311d005b40b74c2dabab3f0b7e2b4e34402444add65afb557758'},ledger:new Map(),now:'2026-11-05T09:00:00Z'});
    assert.notEqual(result.decision,'CLAIMED');
    assert.equal(result.execution_authorized,false);
  }
});
test('malformed idempotency ledger always fails closed', () => {
  for (const ledger of [null,{},[],false]) {
    const decision=claimPc001VisibleProof({row:{},deviceIdentity:{},local:{},ledger});
    assert.equal(decision.decision,'HOLD');
    assert.deepEqual(decision.blockers,['idempotency_ledger_invalid']);
    assert.equal(decision.execution_authorized,false);
  }
});
