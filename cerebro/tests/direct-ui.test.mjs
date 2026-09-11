import test from 'node:test';import assert from 'node:assert/strict';import {buildDirectUi} from '../console/direct-ui.mjs';
const context={company_id:'fenix',environment:'PREPROD',version:'0.1.0'};
test('DIRUI-001 exposes canonical gateway-only panels',()=>{const r=buildDirectUi({context});assert.equal(r.status,'READY');assert.equal(r.gateway_required,true);assert.equal(r.direct_model_access,false);assert.equal(r.additional_cost_eur,0);assert.deepEqual(r.panels,['COMPANY_SELECTOR','CONTEXT_SELECTOR','CHAT','COMMANDS','ENGINES','HISTORY','AUDIT','WHY','TIMELINE']);assert.equal(Object.isFrozen(r.panels),true)});
test('DIRUI-001 blocks direct model access',()=>{const r=buildDirectUi({context,direct_model_access:true});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'POLICY_CONFLICT')});
test('DIRUI-001 blocks additional cost',()=>{const r=buildDirectUi({context,additional_cost_eur:0.01});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'MONEY_LIMIT')});
test('DIRUI-001 blocks PROD',()=>{const r=buildDirectUi({context:{...context,environment:'PROD'}});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'HIGH_RISK')});
