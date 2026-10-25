import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateBm03AuthorizedVoiceStack} from '../runtime/bm03-authorized-voice-stack-gate.mjs';

const owner={
  authorization_id:'auth-fixture-bm03',decision:'APPROVED',decided_by:'owner:test',decided_at:'2026-10-26T00:00:00Z',
  authorization_basis:'OWNER_ATTESTATION',attests_rights_or_permission:true,
  modalities:['voice'],actions:['VOICE_CLONE','VOICE_CONVERSION','TTS','PROSODY','MULTILINGUAL'],
  environments:['PREPROD','PROD'],evidence_refs:['owner-decision:fixture']
};
const rights={
  consent_status:'APPROVED',allowed_modalities:['voice'],allowed_uses:['VOICE_CLONE','VOICE_CONVERSION','TTS','PROSODY','MULTILINGUAL'],
  revocation_process:'revoke-by-identity-owner',evidence_refs:['consent:fixture-only'],owner_authorization:owner
};
const stack={
  environment:'PREPROD',identity_type:'REAL_AUTHORIZED',authorized_source_admitted:true,rights_record:rights,
  qwen_code_license_verified:true,qwen_checkpoint_license_verified:true,qwen_cpu_runtime_proven:true,
  openvoice_code_license_verified:true,openvoice_checkpoint_license_verified:true,openvoice_runtime_proven:true
};

test('BM03 asks the owner only while no owner decision exists',()=>{
  const pendingRights={...rights,owner_authorization:{}};
  const x=evaluateBm03AuthorizedVoiceStack({...stack,rights_record:pendingRights,authorized_source_admitted:false});
  assert.equal(x.status,'BM03_HOLD_AUTHORIZED_SOURCE');
  assert.equal(x.human_required,true);
  assert.equal(x.human_required_reason,'LEGAL_REQUIRED');
  assert.equal(x.benchmark_credit,false);
});

test('BM03 does not ask again after explicit owner denial or revocation',()=>{
  for(const decision of ['DENIED','REVOKED']){
    const r={...rights,owner_authorization:{...owner,decision}};
    const x=evaluateBm03AuthorizedVoiceStack({...stack,rights_record:r,authorized_source_admitted:false});
    assert.equal(x.status,'BM03_HOLD_OWNER_DECISION');
    assert.equal(x.human_required,false);
    assert.match(x.blocker,new RegExp(decision));
  }
});

test('BM03 blocks incomplete owner scope without inventing another human request',()=>{
  const r={...rights,owner_authorization:{...owner,actions:['VOICE_CLONE','TTS']}};
  const x=evaluateBm03AuthorizedVoiceStack({...stack,rights_record:r,authorized_source_admitted:false});
  assert.equal(x.status,'BM03_HOLD_OWNER_SCOPE');
  assert.equal(x.human_required,false);
  assert.equal(x.source_admission.owner_scope_ok,false);
});

test('BM03 keeps license and physical runtime as independent automatic gates',()=>{
  assert.equal(evaluateBm03AuthorizedVoiceStack({...stack,openvoice_checkpoint_license_verified:false}).status,'BM03_HOLD_LICENSE');
  assert.equal(evaluateBm03AuthorizedVoiceStack({...stack,openvoice_runtime_proven:false}).status,'BM03_READY_FOR_PHYSICAL_RUNTIME_PROOF');
});

test('BM03 can become benchmark-eligible but never self-promotes or self-credits',()=>{
  const x=evaluateBm03AuthorizedVoiceStack(stack);
  assert.equal(x.status,'BM03_ELIGIBLE_FOR_PHYSICAL_BENCHMARK');
  assert.equal(x.benchmark_credit,false);
  assert.equal(x.prod_authorized,false);
  assert.equal(x.additional_cost_eur,0);
});

test('BM03 owner-authorized source can be admitted for PROD without bypassing global PROD tribunal',()=>{
  const prodRights={...rights,owner_authorization:{...owner,actions:[...owner.actions,'COMMERCIAL_USE']}};
  const x=evaluateBm03AuthorizedVoiceStack({...stack,environment:'PROD',rights_record:prodRights});
  assert.equal(x.status,'BM03_ELIGIBLE_FOR_PHYSICAL_BENCHMARK_PROD');
  assert.equal(x.prod_source_use_authorized,true);
  assert.equal(x.commercial_use_authorized,true);
  assert.equal(x.prod_authorized,false);
});
