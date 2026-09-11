import test from 'node:test';import assert from 'node:assert/strict';import {planEngineActivation} from '../company/engine-activation.mjs';
const base={context:{company_id:'fenix',engine_id:'ENGACT-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,estimated_additional_cost_eur:0,requires_prod_write:false,autonomous_prod:false,engine_ids:['SEO-001','CRM-001']};
test('ENGACT creates gated activation plan',()=>{const r=planEngineActivation(base);assert.equal(r.status,'PLAN_READY');assert.equal(r.activation_mode,'GATED_PLAN_ONLY');assert.equal(r.required_gates.includes('preprod'),true)});
test('ENGACT blocks Trading',()=>{assert.equal(planEngineActivation({...base,engine_ids:['LAB-TRD']}).reason,'POLICY_CONFLICT')});
test('ENGACT blocks prod autonomy',()=>{assert.equal(planEngineActivation({...base,autonomous_prod:true}).reason,'HIGH_RISK')});
