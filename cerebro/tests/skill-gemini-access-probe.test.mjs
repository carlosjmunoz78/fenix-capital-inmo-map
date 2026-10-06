import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyGeminiError,probeGeminiAccess} from '../skills/skill-gemini-access-probe.mjs';

test('classifies billing, disabled API and permission without exposing raw message',()=>{
  assert.equal(classifyGeminiError({httpStatus:403,payload:{error:{status:'PERMISSION_DENIED',message:'Please enable billing'}}}),'BILLING_REQUIRED');
  assert.equal(classifyGeminiError({httpStatus:403,payload:{error:{status:'PERMISSION_DENIED',message:'API has not been used in project before or it is disabled'}}}),'API_NOT_ENABLED_OR_SERVICE_DISABLED');
  assert.equal(classifyGeminiError({httpStatus:403,payload:{error:{status:'PERMISSION_DENIED',message:'Permission denied'}}}),'PERMISSION_DENIED_UNCLASSIFIED');
});

test('missing credential makes zero network calls',async()=>{
  let calls=0;
  const r=await probeGeminiAccess({env:{},fetchImpl:async()=>{calls++;throw new Error('should not call')}});
  assert.equal(calls,0);
  assert.equal(r.status,'NO_CREDENTIAL');
  assert.equal(r.inference_executed,false);
});

test('accessible model metadata proves only metadata access, not inference',async()=>{
  const r=await probeGeminiAccess({env:{CEREBRO_GEMINI_API_KEY:'secret',CEREBRO_GEMINI_MODEL:'gemini-3.5-flash-lite'},fetchImpl:async()=>({ok:true,status:200,json:async()=>({name:'models/gemini-3.5-flash-lite',supportedGenerationMethods:['generateContent']})})});
  assert.equal(r.status,'MODEL_METADATA_ACCESSIBLE');
  assert.equal(r.target_model_returned,true);
  assert.equal(r.generate_content_supported,true);
  assert.equal(r.inference_executed,false);
  assert.equal(r.secret_values_emitted,false);
});

test('provider error emits class and hash but not raw error text',async()=>{
  const r=await probeGeminiAccess({env:{CEREBRO_GEMINI_API_KEY:'secret'},fetchImpl:async()=>({ok:false,status:403,json:async()=>({error:{code:403,status:'PERMISSION_DENIED',message:'API key is blocked by restriction'}})})});
  assert.equal(r.provider_error_class,'API_KEY_RESTRICTION_OR_BLOCK');
  assert.equal(r.provider_error_status,'PERMISSION_DENIED');
  assert.equal(r.raw_error_message_emitted,false);
  assert.ok(r.provider_error_message_sha256);
});
