import test from 'node:test';
import assert from 'node:assert/strict';
import {planProcurement} from '../vendors/procurement-engine.mjs';
const ctx={company_id:'co1',engine_id:'BUY-001',environment:'PREPROD',version:'0.1.0'};
test('selects best candidate within budget',()=>{const r=planProcurement({context:ctx,authorized:true,confidence:.9,source_refs:['buy:1'],need_ref:'need1',budget_cents:10000,candidates:[{vendor_ref:'a',cost_cents:9000,quality_score:90,risk_score:20},{vendor_ref:'b',cost_cents:8000,quality_score:80,risk_score:10}]}); assert.equal(r.selected_vendor_ref,'a'); assert.equal(r.po_create,false);});
test('gates when none fit budget',()=>{const r=planProcurement({context:ctx,authorized:true,confidence:.9,source_refs:['buy:2'],need_ref:'need2',budget_cents:1000,candidates:[{vendor_ref:'a',cost_cents:2000,quality_score:90,risk_score:10}]}); assert.equal(r.reason,'MONEY_LIMIT');});
test('gates low confidence',()=>{assert.equal(planProcurement({context:ctx,authorized:true,confidence:.5,source_refs:['x'],need_ref:'n',budget_cents:1000,candidates:[{vendor_ref:'a',cost_cents:1,quality_score:90,risk_score:10}]}).reason,'LOW_CONFIDENCE');});
