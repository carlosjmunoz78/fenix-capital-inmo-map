import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProviderRequest,invokeZeroCostProvider,parseProviderResponse,redactProviderRequest} from '../skills/skill-zero-cost-provider-client.mjs';

const openGate={allowed:true,synthetic_only:true,paid_fallback:false,prod_authorized:false};
const quotaAllow={status:'ALLOW_NEXT_SYNTHETIC_CALL'};

test('Gemini request uses current free-route default and redacts API key',()=>{
  const req=buildProviderRequest({providerId:'google-gemini-api-free',prompt:'synthetic fixture',env:{CEREBRO_GEMINI_API_KEY:'secret-key'}});
  assert.equal(req.model,'gemini-3.5-flash-lite');
  assert.match(req.url,/gemini-3\.5-flash-lite:generateContent$/);
  assert.equal(req.headers['x-goog-api-key'],'secret-key');
  const redacted=redactProviderRequest(req);
  assert.equal(redacted.headers['x-goog-api-key'],'[REDACTED]');
  assert.equal(JSON.stringify(redacted).includes('secret-key'),false);
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

test('429 and billing/permission signals stop with no fallback',async()=>{
  const mk=(status)=>async()=>({status,ok:false,json:async()=>({})});
  let result=await invokeZeroCostProvider({providerId:'google-gemini-api-free',prompt:'x',gate:openGate,quotaDecisionResult:quotaAllow,env:{CEREBRO_GEMINI_API_KEY:'secret'},fetchImpl:mk(429)});
  assert.equal(result.stop_reason,'HTTP_429');
  result=await invokeZeroCostProvider({providerId:'google-gemini-api-free',prompt:'x',gate:openGate,quotaDecisionResult:quotaAllow,env:{CEREBRO_GEMINI_API_KEY:'secret'},fetchImpl:mk(402)});
  assert.equal(result.stop_reason,'PROVIDER_BILLING_OR_PERMISSION_REQUIRED');
});

test('successful provider invocation returns hashes and never emits secret values',async()=>{
  const fetchImpl=async(url,options)=>{
    assert.equal(options.headers['x-goog-api-key'],'secret');
    return {status:200,ok:true,json:async()=>({candidates:[{content:{parts:[{text:'synthetic answer'}]}}],usageMetadata:{totalTokenCount:7}})};
  };
  const result=await invokeZeroCostProvider({providerId:'google-gemini-api-free',prompt:'synthetic only',gate:openGate,quotaDecisionResult:quotaAllow,env:{CEREBRO_GEMINI_API_KEY:'secret'},fetchImpl});
  assert.equal(result.ok,true);
  assert.equal(result.secret_values_emitted,false);
  assert.equal(JSON.stringify(result).includes('secret'),false);
  assert.equal(result.additional_cost_eur_claimed,0);
});
