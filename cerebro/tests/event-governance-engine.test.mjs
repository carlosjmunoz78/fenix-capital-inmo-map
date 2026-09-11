import test from 'node:test';
import assert from 'node:assert/strict';
import {assessEvent} from '../platform/event-governance-engine.mjs';
const base={context:{company_id:'fenix',engine_id:'EVT-001',environment:'PREPROD'},authorized:true,confidence:.95,source_refs:['master'],event:{name:'case.updated',version:'1',producer:'CRM',consumers:['CEREBRO'],schema_ref:'schema://case.updated.v1'}};
test('valid event contract',()=>assert.equal(assessEvent(base).status,'EVENT_CONTRACT_VALID'));
test('cross-company denied',()=>assert.equal(assessEvent({...base,event:{...base.event,company_id:'other'}}).reason,'POLICY_CONFLICT'));
test('secret blocked',()=>assert.equal(assessEvent({...base,event:{...base.event,contains_secret:true}}).reason,'SECURITY_INCIDENT'));
test('prod rejected',()=>assert.throws(()=>assessEvent({...base,context:{...base.context,environment:'PROD'}}),/UNSAFE_CONTEXT/));
