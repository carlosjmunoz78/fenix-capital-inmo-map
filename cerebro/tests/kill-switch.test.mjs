import test from 'node:test';import assert from 'node:assert/strict';import {evaluateKillSwitch} from '../security/kill-switch.mjs';
const base={context:{company_id:'fenix',environment:'LAB',version:'0.1.0'},global_kill:false,identity_kill:false,account_kill:false,connector_kill:false};
test('allows when no kill switch is active',()=>{assert.equal(evaluateKillSwitch(base).status,'ALLOW')});
test('blocks global kill switch',()=>{const r=evaluateKillSwitch({...base,global_kill:true});assert.equal(r.status,'BLOCKED');assert.equal(r.scope,'GLOBAL')});
test('blocks scoped account kill switch',()=>{const r=evaluateKillSwitch({...base,account_kill:true});assert.equal(r.scope,'SCOPED');assert.equal(r.revocation_required,true)});
