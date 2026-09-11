import test from 'node:test';import assert from 'node:assert/strict';import {buildChatV0} from '../console/chat-v0.mjs';
const base={context:{company_id:'fenix',engine_id:'CHAT-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,estimated_additional_cost_eur:0,message:'estado de motores'};
test('CHAT routes through gateway/model router',()=>{const r=buildChatV0(base);assert.equal(r.status,'PLAN_READY');assert.equal(r.model_router_required,true);assert.equal(r.direct_model_access,false);assert.equal(r.audit_required,true)});
test('CHAT blocks cost',()=>{assert.equal(buildChatV0({...base,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT')});
