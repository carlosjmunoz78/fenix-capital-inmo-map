import test from 'node:test';
import assert from 'node:assert/strict';
import {probeGeminiModelMetadata,GEMINI_MODEL_METADATA_URL} from '../runtime/seo-d13-gemini-cloud-readiness-v0.mjs';
test('absent GitHub secret fails closed without provider call',async()=>{
 let n=0;
 const x=await probeGeminiModelMetadata({key:null,fetch_impl:async()=>{n++}});
 assert.equal(n,0);assert.equal(x.status,'HOLD');assert.equal(x.reason,'SECRET_NOT_PRESENT');
 assert.equal(x.inference_calls,0);assert.equal(x.can_publish,false);
});
test('real model-metadata protocol is GET with header only, no generation & no raw key logged',async()=>{
 const secret='dummy-synthetic-key-not-real';
 let n=0;
 const r=await probeGeminiModelMetadata({key:secret,fetch_impl:async(url,args)=>{
  n++;assert.equal(url,GEMINI_MODEL_METADATA_URL);
  assert.equal(url.includes(secret),false);
  assert.equal(args.method,'GET');
  assert.equal(args.headers['x-goog-api-key'],secret);
  assert.equal(args.redirect,'error');
  assert.equal(args.body,undefined);
  return {ok:true,json:async()=>({name:'models/gemini-3.5-flash-lite',
   supportedGenerationMethods:['countTokens','generateContent']})};
 }});
 assert.equal(n,1);assert.equal(r.status,'METADATA_ONLY_VERIFIED');
 assert.equal(r.model_available,true);
 assert.equal(r.billing_tier_verified,false);
 assert.equal(r.inference_calls,0);
 assert.equal(r.wordpress_writes,0);
 assert.equal(r.additional_cost_eur,0);
 assert.equal(r.can_publish,false);
 assert.equal(JSON.stringify(r).includes(secret),false);
});
test('provider errors, wrong model and unavailable network never unlock billing',async()=>{
 const key='dummy-synthetic-key-not-real';
 const nope=await probeGeminiModelMetadata({key,fetch_impl:async()=>({ok:false,status:403})});
 assert.equal(nope.status,'HOLD');assert.equal(nope.http_status,403);
 const mismatch=await probeGeminiModelMetadata({key,fetch_impl:async()=>({ok:true,json:async()=>({name:'models/gemini-2.0',supportedGenerationMethods:['generateContent']})})});
 assert.equal(mismatch.reason,'MODEL_GENERATION_NOT_ADVERTISED');
 const down=await probeGeminiModelMetadata({key,fetch_impl:async()=>{throw Error('network')}});
 assert.equal(down.reason,'MODEL_METADATA_REQUEST_UNAVAILABLE');
 for(const o of [nope,mismatch,down]){assert.equal(o.inference_calls,0);assert.equal(o.can_publish,false);assert.equal(o.billing_tier_verified,false)}
});
