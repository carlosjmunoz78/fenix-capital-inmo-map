import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateBm02AuthorizedDigitalDoubleStack} from '../runtime/bm02-authorized-digital-double-stack-gate.mjs';

const owner={
  authorization_id:'auth-fixture-bm02',decision:'APPROVED',decided_by:'owner:test',decided_at:'2026-10-26T00:00:00Z',
  authorization_basis:'OWNER_ATTESTATION',attests_rights_or_permission:true,
  modalities:['image','video','3d'],actions:['DIGITAL_DOUBLE','GENERATIVE_DERIVATIVE'],
  environments:['PREPROD','PROD'],evidence_refs:['owner-decision:fixture']
};
const rights={
  consent_status:'APPROVED',allowed_modalities:['image','video','3d'],allowed_uses:['DIGITAL_DOUBLE','GENERATIVE_DERIVATIVE'],
  revocation_process:'owner-revocation',evidence_refs:['fixture:consent'],owner_authorization:owner
};
const base={
  environment:'PREPROD',usage_class:'INTERNAL_VALIDATION',identity_type:'REAL_AUTHORIZED',authorized_source_admitted:true,rights_record:rights,
  liveportrait_code_license_verified:true,liveportrait_weights_test_use_verified:true,
  detector:'INSIGHTFACE_BUFFALO_L',detector_code_license:'MIT',detector_model_test_use_verified:true,insightface_test_use_verified:true,
  detector_adapter_runtime_proven:true,liveportrait_runtime_proven:true
};

test('BM02 asks the owner only when an owner decision is missing',()=>{
  const pendingRights={...rights,owner_authorization:{}};
  const x=evaluateBm02AuthorizedDigitalDoubleStack({...base,rights_record:pendingRights,authorized_source_admitted:false});
  assert.equal(x.status,'BM02_HOLD_AUTHORIZED_SOURCE');
  assert.equal(x.human_required,true);
  assert.equal(x.human_required_reason,'LEGAL_REQUIRED');
  assert.equal(x.benchmark_credit,false);
});

test('BM02 does not ask again after explicit owner denial or revocation',()=>{
  for(const decision of ['DENIED','REVOKED']){
    const r={...rights,owner_authorization:{...owner,decision}};
    const x=evaluateBm02AuthorizedDigitalDoubleStack({...base,rights_record:r,authorized_source_admitted:false});
    assert.equal(x.status,'BM02_HOLD_OWNER_DECISION');
    assert.equal(x.human_required,false);
    assert.match(x.blocker,new RegExp(decision));
  }
});

test('BM02 internal validation can use test-licensed stack without granting commercial PROD inference',()=>{
  const x=evaluateBm02AuthorizedDigitalDoubleStack(base);
  assert.equal(x.status,'BM02_ELIGIBLE_FOR_PHYSICAL_BENCHMARK');
  assert.equal(x.benchmark_credit,false);
  assert.equal(x.commercial_use_authorized,false);
  assert.equal(x.prod_authorized,false);
  assert.equal(x.additional_cost_eur,0);
});

test('BM02 separates runtime proof from license proof',()=>{
  const x=evaluateBm02AuthorizedDigitalDoubleStack({...base,detector_adapter_runtime_proven:false});
  assert.equal(x.status,'BM02_READY_FOR_PHYSICAL_RUNTIME_PROOF');
});

test('BM02 PROD source use works after owner approval but still requires commercial-safe runtime licenses',()=>{
  const prod={
    ...base,environment:'PROD',usage_class:'PROD_INFERENCE',detector:'MEDIAPIPE',detector_code_license:'Apache-2.0',
    liveportrait_weights_commercial_use_verified:true,detector_model_commercial_use_verified:true,
    rights_record:{...rights,owner_authorization:{...owner,actions:[...owner.actions,'COMMERCIAL_USE']}}
  };
  const x=evaluateBm02AuthorizedDigitalDoubleStack(prod);
  assert.equal(x.status,'BM02_ELIGIBLE_FOR_PHYSICAL_BENCHMARK_PROD');
  assert.equal(x.prod_source_use_authorized,true);
  assert.equal(x.commercial_use_authorized,true);
  assert.equal(x.prod_authorized,false);
});

test('BM02 PROD fails closed if commercial runtime license chain is not verified',()=>{
  const prod={...base,environment:'PROD',usage_class:'PROD_INFERENCE'};
  const x=evaluateBm02AuthorizedDigitalDoubleStack(prod);
  assert.equal(x.status,'BM02_HOLD_LICENSE');
  assert.equal(x.human_required,false);
});
