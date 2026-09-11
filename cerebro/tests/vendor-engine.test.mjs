import test from 'node:test';
import assert from 'node:assert/strict';
import {assessVendor} from '../vendors/vendor-engine.mjs';
const ctx={company_id:'co1',engine_id:'VEN-001',environment:'PREPROD',version:'0.1.0'};
test('assesses vendor deterministically',()=>{const r=assessVendor({context:ctx,authorized:true,confidence:.9,source_refs:['v:1'],vendor_ref:'ven1',sla_score:90,quality_score:85,cost_score:80,risk_score:20}); assert.equal(r.approved_for_consideration,true); assert.equal(r.vendor_write,false);});
test('gates low confidence',()=>{assert.equal(assessVendor({context:ctx,authorized:true,confidence:.5,source_refs:['x'],vendor_ref:'v'}).reason,'LOW_CONFIDENCE');});
test('rejects bad score',()=>{assert.throws(()=>assessVendor({context:ctx,authorized:true,confidence:.9,source_refs:['x'],vendor_ref:'v',sla_score:120,quality_score:80,cost_score:80,risk_score:10}),/SCORE_RANGE/);});
