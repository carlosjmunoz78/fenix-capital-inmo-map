import test from 'node:test';import assert from 'node:assert/strict';import {planCommandV0} from '../console/command-v0.mjs';
const base={context:{company_id:'fenix',engine_id:'CMD-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,command:'query engine status',idempotency_key:'idem-001',risk:'LOW',estimated_additional_cost_eur:0};
test('CMD plans low-risk command through gateway',()=>{const r=planCommandV0(base);assert.equal(r.status,'COMMAND_PLANNED');assert.equal(r.gateway_required,true);assert.equal(r.idempotency_key,'idem-001')});
test('CMD requires idempotency key',()=>{assert.throws(()=>planCommandV0({...base,idempotency_key:''}))});
test('CMD blocks high-risk and cost',()=>{assert.equal(planCommandV0({...base,risk:'HIGH'}).reason,'HIGH_RISK');assert.equal(planCommandV0({...base,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT')});
test('CMD rejects accessor-backed context',()=>{const context={company_id:'fenix',engine_id:'CMD-001',version:'0.1.0'};Object.defineProperty(context,'environment',{get(){return 'SCAFFOLD'},enumerable:true});assert.throws(()=>planCommandV0({...base,context}))});
