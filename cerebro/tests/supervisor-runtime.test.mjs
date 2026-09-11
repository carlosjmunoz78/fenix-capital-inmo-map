import test from 'node:test';import assert from 'node:assert/strict';import {supervise} from '../supervisor/supervisor-runtime.mjs';
const context={company_id:'fenix',environment:'PREPROD',version:'0.1.0'};
test('supervisor continues when all checks green',()=>{const r=supervise({context,checks:[{engine_id:'FACT-001',company_id:'fenix',status:'GREEN'},{engine_id:'CTX-001',company_id:'fenix',status:'GREEN'}]});assert.equal(r.status,'GREEN');assert.equal(r.autonomous_continue,true)});
test('supervisor fails closed on cross-company check',()=>{const r=supervise({context,checks:[{engine_id:'CTX-001',company_id:'other',status:'GREEN'}]});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.incidents[0].reason,'POLICY_CONFLICT')});
test('supervisor maps unknown red reason to high risk',()=>{const r=supervise({context,checks:[{engine_id:'X',company_id:'fenix',status:'RED',reason:'UNKNOWN'}]});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.incidents[0].reason,'HIGH_RISK')});
test('supervisor escalates low confidence',()=>{const r=supervise({context,checks:[{engine_id:'X',company_id:'fenix',status:'YELLOW',confidence:0.3}]});assert.equal(r.incidents[0].reason,'LOW_CONFIDENCE')});
