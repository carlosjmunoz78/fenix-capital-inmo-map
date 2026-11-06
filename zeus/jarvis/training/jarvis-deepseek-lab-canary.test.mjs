import test from 'node:test';
import assert from 'node:assert/strict';
import {executeJarvisSmoke,validateJarvisSmokeContext,calculateJarvisSmokeCost} from './jarvis-deepseek-lab-canary.mjs';
const env={JARVIS_LAB_SMOKE_APPROVED:'YES',
 GITHUB_REF:'refs/heads/cerebro/jarvis-deepseek-weekend-lab-20261106',
 DEEPSEEK_API_KEY:'TEST_ONLY_NOT_A_REAL_DEEPSEEK_SECRET'};
const stub=(balance='98.23',reply='JARVIS_LAB_CANARY_OK')=>async (url,options)=>{
 assert.equal(options.headers.Authorization??options.headers.authorization,'Bearer '+env.DEEPSEEK_API_KEY);
 if(url.endsWith('/user/balance'))return {ok:true,json:async()=>({
   is_available:true,balance_infos:[{currency:'USD',total_balance:balance}]})};
 if(url.endsWith('/responses'))return {ok:true,json:async()=>({
  model:'deepseek-flash',status:'completed',output_text:reply,
  usage:{input_tokens:120,output_tokens:8,input_tokens_details:{cached_tokens:0}}
 })};
 throw Error('Unknown URL');
};
test('strict environment and reference; no global repo secret fallback',()=>{
 assert.equal(validateJarvisSmokeContext(env),true);
 assert.equal(validateJarvisSmokeContext({...env,GITHUB_REF:'refs/heads/main'}),false);
 assert.equal(validateJarvisSmokeContext({...env,JARVIS_LAB_SMOKE_APPROVED:'NO'}),false);
 assert.equal(validateJarvisSmokeContext({...env,DEEPSEEK_API_KEY:''}),false);
});
test('one tiny canonical-provider LAB smoke verifies without actual network',async()=>{
 const r=await executeJarvisSmoke({env,fetchImpl:stub()});
 assert.equal(r.status,'CANARY_PASS');
 assert.equal(r.prod_authorized,false);
 assert.equal(r.provider_limit_eur_verified,false);
 assert.ok(r.cost_usd_conservative_peak<0.01);
});
test('unverified or rebased balance denies before paid call',async()=>{
 let calls=0;const fetchImpl=async (...args)=>{calls++;return stub('99.23')(...args)};
 await assert.rejects(()=>executeJarvisSmoke({env,fetchImpl}),/MONEY_LIMIT/);
 assert.equal(calls,1);
});
test('mismatched response fails and never promotes',async()=>{
 await assert.rejects(()=>executeJarvisSmoke({env,fetchImpl:stub('98.23','NOT_OK')}),/RESPONSE_MISMATCH/);
});
test('rejects excess tokens and projected billing',()=>{
 assert.throws(()=>calculateJarvisSmokeCost({input_tokens:3001,output_tokens:1}),/OUT_OF_BOUNDS/);
 assert.throws(()=>calculateJarvisSmokeCost({input_tokens:10,output_tokens:33}),/OUT_OF_BOUNDS/);
});
