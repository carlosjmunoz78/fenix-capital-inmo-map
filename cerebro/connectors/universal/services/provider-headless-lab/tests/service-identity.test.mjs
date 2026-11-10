import test from 'node:test';
import assert from 'node:assert/strict';
import {SERVICE_IDENTITIES,assertIdentityProbeOrder,probeServiceIdentity} from '../service-identity.mjs';
const fake='FAKE_SERVICE_CREDENTIAL_FOR_UNIT_TEST_ONLY_0123456789';
const base={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',
 version:'1.0.0',source:'owner_order',client_id:'cerebro',
 operation:'provider.service_identity.probe',request_id:'FACT001-INDEPENDENT-IDENTITIES-20261110'};
const stub=(body,status=200)=>{
 const calls=[];
 return {calls,http:async(url,init)=>{calls.push({url,init});return {status,json:async()=>body};}};
};
test('no Notion or GitHub OAuth transfer: fixed independently protected service vault names',()=>{
 assert.deepEqual(Object.keys(SERVICE_IDENTITIES),['notion','github']);
 assert.equal(SERVICE_IDENTITIES.notion.secret_name,'cerebro_notion_service_token_v1');
 assert.equal(SERVICE_IDENTITIES.github.secret_name,'cerebro_github_factory_pat_v1');
 assert.ok(Object.values(SERVICE_IDENTITIES).every(x=>x.url.startsWith('https://api.')));
});
test('signed owner identity probe allows only Notion and GitHub read-only',()=>{
 for(const provider of ['notion','github'])assert.equal(assertIdentityProbeOrder({...base,provider}),provider);
 for(const request of [{...base,provider:'supabase'},{...base,provider:'notion',source:'automation'},
  {...base,provider:'github',environment:'PROD'},{...base,provider:'github',token:'bad'},
  {...base,provider:'notion',operation:'delete-page'},
  {...base,provider:'github',request_id:'UNAUTHORISED'}])
  assert.throws(()=>assertIdentityProbeOrder(request));
});
test('independent Notion integration bot identity read requires bot type and Notion-Version',async()=>{
 const f=stub({object:'user',type:'bot',name:'CEREBRO FACT001',bot:{owner:{type:'workspace'},workspace_name:'Fenix'}});
 const v=await probeServiceIdentity({provider:'notion',token:fake,http:f.http});
 assert.equal(v.status,'SERVICE_IDENTITY_READ_VERIFIED');assert.equal(v.provider,'notion');
 assert.equal(v.admin_write_verified,false);assert.equal(v.mutations,0);assert.equal(v.credential_exposed,false);
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].init.method,'GET');
 assert.equal(f.calls[0].init.headers['Notion-Version'],'2026-03-11');
 assert.equal(f.calls[0].url,SERVICE_IDENTITIES.notion.url);
 assert.ok(!JSON.stringify(v).includes(fake));
});
test('independent GitHub credential identity read requires exact owner',async()=>{
 const f=stub({type:'User',login:'carlosjmunoz78'});
 const v=await probeServiceIdentity({provider:'github',token:fake,http:f.http});
 assert.equal(v.status,'SERVICE_IDENTITY_READ_VERIFIED');assert.equal(v.mutations,0);
 assert.equal(f.calls[0].init.headers['X-GitHub-Api-Version'],'2026-03-10');
 assert.equal(f.calls[0].url,SERVICE_IDENTITIES.github.url);
});
test('wrong service identity cannot be considered connected',async()=>{
 for(const [provider,body,code] of [
  ['notion',{object:'user',type:'person',name:'owner'},'NOTION_INTEGRATION_NOT_PROVEN'],
  ['github',{type:'User',login:'otherperson'},'GITHUB_SERVICE_OWNER_MISMATCH']]){
  const f=stub(body);
  await assert.rejects(()=>probeServiceIdentity({provider,token:fake,http:f.http}),new RegExp(code));
 }
});
test('wrong token, unauthorized API and malformed results deny before any write',async()=>{
 let requests=0;
 await assert.rejects(()=>probeServiceIdentity({provider:'notion',token:'',http:()=>{requests++}}),/SERVICE_TOKEN_INVALID/);
 await assert.rejects(()=>probeServiceIdentity({provider:'cloudflare',token:fake,http:()=>{requests++}}),/SERVICE_PROVIDER_DENIED/);
 assert.equal(requests,0);
 for(const code of [401,403,500]){
  const f=stub({},code);
  await assert.rejects(()=>probeServiceIdentity({provider:'github',token:fake,http:f.http}),
   new RegExp(code===500?'SERVICE_IDENTITY_HTTP_500':'SERVICE_IDENTITY_PERMISSION_'+code));
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].init.method,'GET');
 }
});
