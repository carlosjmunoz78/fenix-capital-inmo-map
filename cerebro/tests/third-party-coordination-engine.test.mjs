import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinateThirdParties} from '../operations/third-party-coordination-engine.mjs';
const context={company_id:'fenix',engine_id:'3RD-001',environment:'PREPROD',version:'0.1.0'};
test('creates follow-up for breached SLA',()=>{const r=coordinateThirdParties({context,authorized:true,confidence:.95,source_refs:['case:1'],parties:[{id:'bank',type:'BANCO',sla_breached:true,severity:3}]});assert.equal(r.status,'THIRD_PARTY_COORDINATION_REQUIRED');assert.equal(r.actions[0].action,'TRIGGER_FOLLOWUP');assert.equal(r.communication_send,false);});
test('clear when no blockers',()=>{const r=coordinateThirdParties({context,authorized:true,confidence:.95,source_refs:['case:2'],parties:[{id:'notary',type:'NOTARIA'}]});assert.equal(r.status,'THIRD_PARTY_COORDINATION_CLEAR');});
test('critical external blocker escalates',()=>{const r=coordinateThirdParties({context,authorized:true,confidence:.95,source_refs:['case:3'],parties:[{id:'registry',blocked:true,severity:5}]});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'HIGH_RISK');});
