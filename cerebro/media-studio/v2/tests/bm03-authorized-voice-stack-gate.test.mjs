import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateBm03AuthorizedVoiceStack} from '../runtime/bm03-authorized-voice-stack-gate.mjs';

const rights={consent_status:'APPROVED',allowed_modalities:['voice'],allowed_uses:['VOICE_CLONE','VOICE_CONVERSION','TTS','PROSODY','MULTILINGUAL'],revocation_process:'revoke-by-identity-owner',evidence_refs:['consent:fixture-only']};
const stack={environment:'PREPROD',identity_type:'REAL_AUTHORIZED',authorized_source_admitted:true,rights_record:rights,qwen_code_license_verified:true,qwen_checkpoint_license_verified:true,qwen_cpu_runtime_proven:true,openvoice_code_license_verified:true,openvoice_checkpoint_license_verified:true,openvoice_runtime_proven:true};

test('BM03 blocks when no authorized real-person source has been admitted',()=>{
  const x=evaluateBm03AuthorizedVoiceStack({...stack,authorized_source_admitted:false});
  assert.equal(x.status,'BM03_HOLD_AUTHORIZED_SOURCE');
  assert.equal(x.human_required,true);
  assert.equal(x.human_required_reason,'LEGAL_REQUIRED');
  assert.equal(x.benchmark_credit,false);
});

test('BM03 blocks incomplete consent scope',()=>{
  const x=evaluateBm03AuthorizedVoiceStack({...stack,rights_record:{...rights,allowed_uses:['VOICE_CLONE','TTS']}});
  assert.equal(x.status,'BM03_HOLD_AUTHORIZED_SOURCE');
  assert.equal(x.source_admission.scope_ok,false);
});

test('BM03 keeps license and physical runtime as independent gates',()=>{
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

test('BM03 gate is PREPROD-only',()=>{
  assert.throws(()=>evaluateBm03AuthorizedVoiceStack({...stack,environment:'PROD'}),/PREPROD_ONLY/);
});
