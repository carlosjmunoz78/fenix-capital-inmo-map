import test from 'node:test';
import assert from 'node:assert/strict';
import {planVendorReplacement} from '../vendors/vendor-replacement-engine.mjs';
const ctx={company_id:'co1',engine_id:'VREP-001',environment:'PREPROD',version:'0.1.0'};
test('recommends safer better vendor',()=>{const r=planVendorReplacement({context:ctx,authorized:true,confidence:.9,source_refs:['vrep:1'],current_vendor:{vendor_ref:'old',score:65},alternatives:[{vendor_ref:'new',score:85,migration_risk:20}]}); assert.equal(r.replace_recommended,true); assert.equal(r.vendor_switch_execute,false);});
test('avoids high migration risk',()=>{const r=planVendorReplacement({context:ctx,authorized:true,confidence:.9,source_refs:['vrep:2'],current_vendor:{vendor_ref:'old',score:65},alternatives:[{vendor_ref:'new',score:90,migration_risk:80}]}); assert.equal(r.replace_recommended,false);});
test('gates low confidence',()=>{assert.equal(planVendorReplacement({context:ctx,authorized:true,confidence:.5,source_refs:['x'],current_vendor:{vendor_ref:'o',score:1},alternatives:[{vendor_ref:'n',score:2,migration_risk:0}]}).reason,'LOW_CONFIDENCE');});
