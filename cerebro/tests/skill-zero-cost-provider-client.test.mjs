import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProviderRequest,invokeZeroCostProvider,parseProviderResponse,redactProviderRequest} from '../skills/skill-zero-cost-provider-client.mjs';

const openGate={allowed:true,synthetic_only:true,paid_fallback:false,prod_authorized:false};
const quotaAllow={status:'ALLOW_NEXT_SYNTHETIC_CALL'};

test('Gemini 3 request uses current free-route default, omits legacy sampling and redacts API key',()=>{
  const req=buildProviderRequest({providerId:'google-gemini-api-free',prompt:'synthetic fixture',env:{CEREBRO_GEMINI_API_KEY:'secret-key'}});
  assert.equal(req.model,'gemini-3.5-flash-lite');
  assert.match(req.url,/gemini-3\.5-flash-lite:generateContent$/);
  assert.equal(req.headers['x-goog-api-key'],'secret-key');
  assert.deepEqual(req.body.generationConfig,{maxOutputTokens:2048});
  assert.equal('temperature' in req.body.generationConfig,false);
  const redacted=redactProviderRequest(req);
  assert.equal(redacted.headers['x-goog-api-key'],'[REDACTED]');
  assert.equal(JSON.stringify(redacted).includes('secret-key'),false);
});

test('legacy Gemini request may keep deterministic temperature',()=>{
  const req=buildProviderRequest({providerId:'google-gemini-api-free',prompt:'synthetic fixture',env:{CEREBRO_GEMINI_API_KEY:'secret-key',CEREBRO_GEMINI_MODEL:'gemini-2.5-flash-lite'}});
  assert.equal(req.body.generationConfig.temperature,0);
});

test('Cloudflare request requires token plus account id and redacts bearer token',()=>{
  const req=buildProviderRequest({providerId:'cloudflare-workers-ai-free',prompt:'synthetic fixture',env:{CEREBRO_CF_WORKERS_AI_TOKEN:'cf-token',CEREBRO_CF_ACCOUNT_ID:'acct'}});
  assert.match(req.url,/accounts\/acct\/ai\/run\/@cf\/meta\/llama-3\.1-8b-instruct$/);
  const redacted=redactProviderRequest(req);
  assert.equal(redacted.headers.authorization,'[REDACTED]');
  assert.equal(JSON.stringify(redacted).includes('cf-token'),false);
});

test('provider response parsers accept Gemini and Cloudflare shapes',()=>{
  const gemini=parseProviderResponse('google-gemini-api-free',{candidates:[{content:{parts:[{text:'ok'}]}}],usageMetadata:{promptTokenCount:2,candidatesTokenCount:1,totalTokenCount:3}});
  assert.equal(gemini.text,'ok');
  assert.equal(gemini.usage.total_tokens,3);
  const cf=parseProviderResponse('cloudflare-workers-ai-free',{success:true,result:{response:'fine'}});
  assert.equal(cf.text,'fine');
});

test('closed behavioral gate prevents network call',async()=>{
  let called=false;
  await assert.rejects(()=>invokeZeroCostProvider({providerId:'google-gemini-api-free',prompt:'x',gate:{...openGate,allowed:false},quotaDecisionResult:quotaAllow,env:{CEREBRO_GEMINI_API_KEY:'secret'},fetchImpl:async()=>{called=true;return null;}}),/GATE_CLOSED/);
  assert.equal(called,false);
});

test('quota stop prevents network call',async()=>{
  let called=false;
  await assert.rejects(()=>invokeZeroCostProvider({providerId:'google-gemini-api-free',prompt:'x',gate:openGate,quotaDecisionResult:{status:'STOP',reason:'FREE_QUOTA_CALL_CAP'},env:{CEREBRO_GEMINI_API_KEY:'secret'},fetchImpl:async()=>{called=true;return null;}}),/QUOTA_BLOCK/);
  assert.equal(called,false);
});

test('429 and provider billing or permission failures stop with hashed diagnostics only',async()=>{
  const mk=(status,payload={})=>async()=>({status,ok:false,json:async()=>payload});
  let result=await invokeZeroCostProvider({providerId:'google-gemini-api-free',prompt:'x',gate:openGate,quotaDecisionResult:quotaAllow,env:{CEREBRO_GEMINI_API_KEY:'secret'},fetchImpl:mk(429)});
  assert.equal(result.stop_reason,'HTTP_429');
  result=await invokeZeroCostProvider({providerId:'google-gemini-api-free',prompt:'x',gate:openGate,quotaDecisionResult:quotaAllow,env:{CEREBRO_GEMINI_API_KEY:'secret'},fetchImpl:mk(402,{error:{code:402,status:'FAILED_PRECONDITION',message:'billing details'}})});
  assert.equal(result.stop_reason,'PROVIDER_BILLING_REQUIRED');
  assert.equal(result.provider_error_message_sha256.length,64);
  assert.equal(JSON.stringify(result).includes('billing details'),false);
  result=await invokeZeroCostProvider({providerId:'google-gemini-api-free',prompt:'x',gate:openGate,quotaDecisionResult:quotaAllow,env:{CEREBRO_GEMINI_API_KEY:'secret'},fetchImpl:mk(403,{error:{code:403,status:'PERMISSION_DENIED',message:'private provider message'}})});
  assert.equal(result.stop_reason,'PROVIDER_PERMISSION_DENIED');
  assert.equal(result.provider_error_status,'PERMISSION_DENIED');
  assert.equal(result.raw_error_message_emitted,false);
  assert.equal(JSON.stringify(result).includes('private provider message'),false);
});

test('successful provider invocation returns hashes and never emits exact secret value',async()=>{
  const apiKey='gemini-test-key-12345';
  const fetchImpl=async(url,options)=>{
    assert.equal(options.headers['x-goog-api-key'],apiKey);
    return {status:200,ok:true,json:async()=>({candidates:[{content:{parts:[{text:'synthetic answer'}]}}],usageMetadata:{totalTokenCount:7}})};
  };
  const result=await invokeZeroCostProvider({providerId:'google-gemini-api-free',prompt:'synthetic only',gate:openGate,quotaDecisionResult:quotaAllow,env:{CEREBRO_GEMINI_API_KEY:apiKey},fetchImpl});
  assert.equal(result.ok,true);
  assert.equal(result.secret_values_emitted,false);
  assert.equal(JSON.stringify(result).includes(apiKey),false);
  assert.equal(result.additional_cost_eur_claimed,0);
});
