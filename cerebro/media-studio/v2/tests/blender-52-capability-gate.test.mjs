import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateBlender52PreprodCapability} from '../runtime/blender-52-capability-gate.mjs';

const green={company_id:'GLOBAL',environment:'PREPROD',request_id:'ums:blender52:test',blender_version:'5.2.3',binary_verified:true,checksum_verified:true,license_verified:true,zero_cost_verified:true,headless_verified:true,cpu_render_verified:true};

test('Blender 5.2 LTS becomes PREPROD-eligible only with complete physical proof',()=>{
  const result=evaluateBlender52PreprodCapability(green);
  assert.equal(result.status,'BLENDER_52_ELIGIBLE_FOR_PREPROD_PHYSICAL_BINDING');
  assert.equal(result.human_required,false);
  assert.equal(result.additional_cost_eur,0);
  assert.equal(result.prod_authorized,false);
});

test('Blender gate fails closed when checksum or CPU render proof is absent',()=>{
  assert.equal(evaluateBlender52PreprodCapability({...green,checksum_verified:false}).status,'BLENDER_52_HOLD_PHYSICAL_PROOF');
  assert.equal(evaluateBlender52PreprodCapability({...green,cpu_render_verified:false}).status,'BLENDER_52_HOLD_PHYSICAL_PROOF');
});

test('Blender gate rejects PROD and non-LTS-target version',()=>{
  assert.throws(()=>evaluateBlender52PreprodCapability({...green,environment:'PROD'}),/PREPROD_ONLY/);
  assert.equal(evaluateBlender52PreprodCapability({...green,blender_version:'5.3.0'}).status,'BLENDER_52_HOLD_PHYSICAL_PROOF');
});
