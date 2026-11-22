import test from 'node:test';
import assert from 'node:assert/strict';
import {runCerebroActgwCloudflareReadOnlyLab} from '../transport/cerebro-actgw-cloudflare-readonly-lab.mjs';
import {CLOUDFLARE_ACCOUNT_ID,FACEBOOK_D1} from '../src/catalog.mjs';

function fakeCloudflare(){
 const calls=[];
 const http=async(input,opts={})=>{
   const url=new URL(input);calls.push({method:opts.method,url:url.pathname});
   assert.equal(opts.method,'GET');
   assert.ok(url.pathname.startsWith(`/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/`));
   const isD1=url.pathname.endsWith('/d1/database');
   const isWorkers=url.pathname.endsWith('/workers/scripts');
   assert.ok(isD1||isWorkers);
   return {ok:true,status:200,json:async()=>({success:true,
     result:isD1?[{name:FACEBOOK_D1,uuid:'e8fe801d-4b01-4e34-ac12-26014b79adc1',jurisdiction:'eu'}]:[{id:'worker-placeholder'}],
     ...(isD1?{result_info:{total_pages:1,total_count:1}}:{})
   })};
 };
 return {http,calls};
}
const trusted=()=>({client_id:'cerebro',account_id:CLOUDFLARE_ACCOUNT_ID,environment:'LAB',authorized:true});
test('CEREBRO Console V0 -> ACTGW-001 -> UniversalCore -> Cloudflare REST, real implementation and audit',async()=>{
 const {http,calls}=fakeCloudflare(),log=[];
 const result=await runCerebroActgwCloudflareReadOnlyLab({token:'FAKE_TEST_TOKEN',http,attestGateway:trusted,log:{log:s=>log.push(s)}});
 assert.equal(result.status,'ISOLATED_CEREBRO_GATEWAY_LAB_REAL_GET_VERIFIED');
 assert.equal(result.d1_count,1);assert.equal(result.workers_count,1);
 assert.equal(result.facebook_d1_exists,true);
 assert.equal(result.console_commands,2);assert.equal(result.core_audits,2);
 assert.equal(result.cloudflare_writes,0);assert.equal(result.prod_deployed,false);
 assert.equal(calls.length,2);
 assert.ok(calls.every(x=>x.method==='GET'));
 assert.ok(!JSON.stringify(log).includes('FAKE_TEST_TOKEN'));
});
test('untrusted Gateway identity is refused before any Cloudflare request',async()=>{
 for(const attestation of [null,{client_id:'chatgpt',account_id:CLOUDFLARE_ACCOUNT_ID,environment:'LAB',authorized:true},{client_id:'cerebro',account_id:'other',environment:'LAB',authorized:true},{client_id:'cerebro',account_id:CLOUDFLARE_ACCOUNT_ID,environment:'PROD',authorized:true},{client_id:'cerebro',account_id:CLOUDFLARE_ACCOUNT_ID,environment:'LAB',authorized:false}]){
  const {http,calls}=fakeCloudflare();
  await assert.rejects(runCerebroActgwCloudflareReadOnlyLab({token:'FAKE_TEST_TOKEN',http,attestGateway:async()=>attestation,log:{log(){}}}),/GATEWAY_IDENTITY_DENIED/);
  assert.equal(calls.length,0);
 }
});
test('missing or empty secret fails closed before Cloudflare request',async()=>{
 for(const token of ['',undefined,null]){
  const {http,calls}=fakeCloudflare();
  await assert.rejects(runCerebroActgwCloudflareReadOnlyLab({token,http,attestGateway:trusted,log:{log(){}}}),/TOKEN_SECRET_MISSING/);
  assert.equal(calls.length,0);
 }
});
test('upstream errors never produce success or leak backend token',async()=>{
 const log=[],secret='TEST_SECRET_MUST_NOT_LEAK';
 const http=async()=>({ok:false,status:403,json:async()=>({success:false,errors:[{message:secret}]})});
 await assert.rejects(runCerebroActgwCloudflareReadOnlyLab({token:secret,http,attestGateway:trusted,log:{log:s=>log.push(s)}}),/ACTGW_CLOUDFLARE_E2E_DENIED/);
 assert.ok(!JSON.stringify(log).includes(secret));
});