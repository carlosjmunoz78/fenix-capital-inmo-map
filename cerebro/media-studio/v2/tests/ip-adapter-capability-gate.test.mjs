import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateIpAdapterPreprodCapability} from '../runtime/ip-adapter-capability-gate.mjs';

const base={company_id:'GLOBAL',environment:'PREPROD',request_id:'ums:ipadapter:test',code_license_verified:true,checkpoint_license_verified:true,base_model_license_verified:true};

test('IP-Adapter does not confuse CPU support with proven resource fitness',()=>{
  const result=evaluateIpAdapterPreprodCapability({...base,device:'cpu',memory_fit_verified:false,latency_fit_verified:false});
  assert.equal(result.status,'IP_ADAPTER_HOLD_RESOURCE_BENCHMARK');
  assert.equal(result.human_required,false);
  assert.equal(result.additional_cost_eur,0);
});

test('IP-Adapter requires code + checkpoint + base-model license chain',()=>{
  assert.equal(evaluateIpAdapterPreprodCapability({...base,checkpoint_license_verified:false}).status,'IP_ADAPTER_HOLD_LICENSE');
  assert.equal(evaluateIpAdapterPreprodCapability({...base,base_model_license_verified:false}).status,'IP_ADAPTER_HOLD_LICENSE');
});

test('standard gate forbids real-person FaceID path and PROD',()=>{
  assert.throws(()=>evaluateIpAdapterPreprodCapability({...base,faceid_variant_requested:true}),/SYNTHETIC_REFERENCE_ONLY/);
  assert.throws(()=>evaluateIpAdapterPreprodCapability({...base,real_person_face_requested:true}),/SYNTHETIC_REFERENCE_ONLY/);
  assert.throws(()=>evaluateIpAdapterPreprodCapability({...base,environment:'PROD'}),/PREPROD_ONLY/);
});

test('IP-Adapter is binding-eligible only after resource benchmark passes',()=>{
  const result=evaluateIpAdapterPreprodCapability({...base,device:'cuda',cuda_available:true,memory_fit_verified:true,latency_fit_verified:true});
  assert.equal(result.status,'IP_ADAPTER_ELIGIBLE_FOR_PREPROD_PHYSICAL_BINDING');
  assert.equal(result.real_person_face_allowed,false);
  assert.equal(result.prod_authorized,false);
});
