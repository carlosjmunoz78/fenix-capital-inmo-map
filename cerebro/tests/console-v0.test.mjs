import test from 'node:test';import assert from 'node:assert/strict';import {buildConsoleV0} from '../console/console-v0.mjs';
const base={context:{company_id:'fenix',engine_id:'CONSOLE-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,estimated_additional_cost_eur:0};
test('CONSOLE builds gateway-only zero-cost plan',()=>{const r=buildConsoleV0(base);assert.equal(r.status,'PLAN_READY');assert.equal(r.gateway_required,true);assert.equal(r.direct_model_access,false);assert.equal(r.ui.includes('audit'),true)});
test('CONSOLE blocks cost',()=>{assert.equal(buildConsoleV0({...base,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT')});
