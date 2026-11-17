import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudflareOfficialApi } from '../src/cloudflare.mjs';
import { getCapability } from '../src/catalog.mjs';
const ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
const ZONE='abcdefabcdefabcdefabcdefabcdefab';
const id={client_id:'chatgpt',actor_id:'test',identity_ref:'test'};
const scope={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'0.3.0'};
const calls=[];
const api=new CloudflareOfficialApi({tokenProvider:async()=> 'DUMMY_TEST_TOKEN_NOT_REAL',http:async (url,opt)=>{
  const path=new URL(url).pathname;
  assert.equal(opt.method,'GET');
  assert.ok(path.startsWith(`/client/v4/accounts/${ACCOUNT}/`)||path===`/client/v4/zones/${ZONE}`||path.startsWith(`/client/v4/zones/${ZONE}/`));
  calls.push(path);
  return {ok:true,status:200,json:async()=>({success:true,result:path===`/client/v4/zones/${ZONE}`?{id:ZONE,account:{id:ACCOUNT}}:[]})};
}});
const checks=[
  ['cloudflare.workers.account-settings',{},`/client/v4/accounts/${ACCOUNT}/workers/account-settings`],
  ['cloudflare.workers.deployments',{worker_name:'cerebro-test-lab'},`/client/v4/accounts/${ACCOUNT}/workers/scripts/cerebro-test-lab/deployments`],
  ['cloudflare.zone.ssl',{zone_id:ZONE},`/client/v4/zones/${ZONE}/settings/ssl`],
  ['cloudflare.zone.worker-routes',{zone_id:ZONE},`/client/v4/zones/${ZONE}/workers/routes`]
];
test('four generic Cloudflare operations present and implemented LAB read only',()=>{
  for(const [cap] of checks){const action=getCapability(cap);assert.ok(action,cap);assert.equal(action.status,'IMPLEMENTED_LAB');assert.equal(action.sideEffect,false);assert.equal(action.method,'GET');}
});
test('generic operations dispatch read-only official paths',async()=>{
  for(const [cap,input,path] of checks){const before=calls.length;const result=await api.perform({action:getCapability(cap),input,scope,identity:id});assert.equal(result.status,'COMPLETED');assert.equal(calls.at(-1),path);assert.ok(calls.length>before);}
});
test('zone account ownership is independently proven before zone reads',async()=>{
  for(const cap of ['cloudflare.zone.ssl','cloudflare.zone.worker-routes']){
    const target=api.perform({action:getCapability(cap),input:{zone_id:ZONE},scope,identity:id});
    assert.equal((await target).status,'COMPLETED');
    assert.ok(calls.includes(`/client/v4/zones/${ZONE}`));
  }
});
test('zone and worker names cannot inject a second path',async()=>{
  await assert.rejects(api.perform({action:getCapability('cloudflare.zone.ssl'),input:{zone_id:'../x'},scope,identity:id}),/INVALID_ZONE_ID/);
  await assert.rejects(api.perform({action:getCapability('cloudflare.workers.deployments'),input:{worker_name:'../../x'},scope,identity:id}),/INVALID_WORKER_NAME/);
});