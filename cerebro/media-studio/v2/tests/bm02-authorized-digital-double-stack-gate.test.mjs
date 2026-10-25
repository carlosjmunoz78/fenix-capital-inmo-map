import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateBm02AuthorizedDigitalDoubleStack} from '../runtime/bm02-authorized-digital-double-stack-gate.mjs';

const rights={consent_status:'APPROVED',allowed_modalities:['image','video','3d'],allowed_uses:['DIGITAL_DOUBLE','GENERATIVE_DERIVATIVE'],revocation_process:'owner-revocation',evidence_refs:['fixture:consent']};
const base={environment:'PREPROD',identity_type:'REAL_AUTHORIZED',authorized_source_admitted:true,rights_record:rights,liveportrait_code_license_verified:true,liveportrait_weights_commercial_use_verified:true,detector:'MEDIAPIPE',detector_code_license:'Apache-2.0',detector_model_commercial_use_verified:true,detector_adapter_runtime_proven:true,liveportrait_runtime_proven:true};

test('BM02 blocks absent authorized source with LEGAL_REQUIRED',()=>{
 const x=evaluateBm02AuthorizedDigitalDoubleStack({...base,authorized_source_admitted:false});
 assert.equal(x.status,'BM02_HOLD_AUTHORIZED_SOURCE'); assert.equal(x.human_required,true); assert.equal(x.human_required_reason,'LEGAL_REQUIRED'); assert.equal(x.benchmark_credit,false);
});

test('BM02 rejects InsightFace pretrained weights without explicit commercial model license',()=>{
 const x=evaluateBm02AuthorizedDigitalDoubleStack({...base,detector:'INSIGHTFACE_BUFFALO_L',detector_code_license:'MIT',detector_model_commercial_use_verified:false,insightface_commercial_model_license_verified:false});
 assert.equal(x.status,'BM02_HOLD_LICENSE'); assert.match(x.blocker,/INSIGHTFACE/); assert.equal(x.prod_authorized,false);
});

test('BM02 can accept permissive detector route but never self-credit',()=>{
 const x=evaluateBm02AuthorizedDigitalDoubleStack(base);
 assert.equal(x.status,'BM02_ELIGIBLE_FOR_PHYSICAL_BENCHMARK'); assert.equal(x.benchmark_credit,false); assert.equal(x.prod_authorized,false); assert.equal(x.additional_cost_eur,0);
});

test('BM02 separates runtime proof from license proof',()=>{
 const x=evaluateBm02AuthorizedDigitalDoubleStack({...base,detector_adapter_runtime_proven:false});
 assert.equal(x.status,'BM02_READY_FOR_PHYSICAL_RUNTIME_PROOF');
});

test('BM02 is PREPROD only',()=>assert.throws(()=>evaluateBm02AuthorizedDigitalDoubleStack({...base,environment:'PROD'}),/PREPROD_ONLY/));
