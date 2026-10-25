import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateMuseTalkPreprodCapability} from '../runtime/musetalk-capability-gate.mjs';

test('MuseTalk stays HOLD_HARDWARE without proven CUDA and does not escalate to human',()=>{
  const result=evaluateMuseTalkPreprodCapability({company_id:'GLOBAL',environment:'PREPROD',request_id:'ums:musetalk:test',license_verified:true,zero_cost_verified:true},{runtime:{cuda_available:false,nvidia_smi:false,gpus:[],probe_error:'not found'}});
  assert.equal(result.status,'HOLD_HARDWARE');
  assert.equal(result.blocker,'GPU_RUNTIME_NOT_PROVEN');
  assert.equal(result.human_required,false);
  assert.equal(result.install_authorized,false);
  assert.equal(result.spend_authorized,false);
});

test('MuseTalk becomes PREPROD binding-eligible only with CUDA + license + zero cost',()=>{
  const runtime={cuda_available:true,nvidia_smi:true,gpus:[{name:'fixture',memory_total_mb:24000,driver_version:'fixture'}],probe_error:null};
  const result=evaluateMuseTalkPreprodCapability({company_id:'GLOBAL',environment:'PREPROD',request_id:'ums:musetalk:test2',license_verified:true,zero_cost_verified:true,preprod_install_requested:true},{runtime});
  assert.equal(result.status,'MUSETALK_ELIGIBLE_FOR_PREPROD_PHYSICAL_BINDING');
  assert.equal(result.install_authorized,true);
  assert.equal(result.prod_authorized,false);
});

test('MuseTalk gate never treats license or cost as optional',()=>{
  const runtime={cuda_available:true,nvidia_smi:true,gpus:[{name:'fixture',memory_total_mb:24000,driver_version:'fixture'}],probe_error:null};
  assert.equal(evaluateMuseTalkPreprodCapability({company_id:'GLOBAL',request_id:'ums:musetalk:l1',license_verified:false,zero_cost_verified:true},{runtime}).status,'HOLD_HARDWARE');
  assert.equal(evaluateMuseTalkPreprodCapability({company_id:'GLOBAL',request_id:'ums:musetalk:l2',license_verified:true,zero_cost_verified:false},{runtime}).status,'HOLD_HARDWARE');
  assert.throws(()=>evaluateMuseTalkPreprodCapability({company_id:'GLOBAL',environment:'PROD',request_id:'ums:musetalk:p'}),/PREPROD_ONLY/);
});
