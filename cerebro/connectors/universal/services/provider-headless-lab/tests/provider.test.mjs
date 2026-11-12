import test from 'node:test';
import assert from 'node:assert/strict';
import {readProviderInventory,providerSpecs} from '../provider.mjs';
const fake='FAKE_SERVICE_ONLY_TEST_TOKEN_0123456789';
function stub(status,body){
 const calls=[];
 return {calls,http:async(url,init)=>{calls.push({url,init});return {status,json:async()=>body};}};
}
test('Cloudflare, Vercel and Supabase are fixed to exact read-only HTTPS endpoints',async()=>{
 const samples={
  cloudflare:{success:true,result:[{name:'cerebro-fact001-recovery-lab-eu'}]},
  vercel:{projects:[{name:'fenix-capital-preprod'},{name:'fenix-capital-preprod-app'}]},
  supabase:[{name:'cerebro-fact001-cf-issuer-lab'}]
 };
 for(const [provider,body] of Object.entries(samples)){
  const f=stub(200,body);
  const result=await readProviderInventory({provider,token:fake,http:f.http});
  assert.equal(result.status,'VERIFIED_READ');assert.equal(result.writes,0);assert.equal(result.credentials_exposed,false);
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].url,providerSpecs[provider].url);
  assert.equal(f.calls[0].init.method,'GET');assert.equal(f.calls[0].init.redirect,'error');
  assert.equal(f.calls[0].init.headers.Authorization,'Bearer '+fake);
  assert.ok(!JSON.stringify(result).includes(fake));
 }
});
test('cannot call arbitrary provider or pass dynamic path/API URL',async()=>{
 let count=0;const http=async()=>{count++;throw Error('never')};
 await assert.rejects(()=>readProviderInventory({provider:'notion',token:fake,http}),/UNKNOWN_PROVIDER/);
 await assert.rejects(()=>readProviderInventory({provider:'supabase',token:'wrong',http}),/SERVICE_TOKEN_NOT_CONFIGURED/);
 assert.equal(count,0);
});
test('provider permission denial, rate limit, unexpected response are fail-closed',async()=>{
 for(const [status,body,code] of [[401,{},'UPSTREAM_AUTH_401'],[403,{},'UPSTREAM_AUTH_403'],[429,{},'UPSTREAM_RATE_LIMIT'],[200,{},'UPSTREAM_UNVERIFIED_LIST']]){
  const f=stub(status,body);
  await assert.rejects(()=>readProviderInventory({provider:'vercel',token:fake,http:f.http}),new RegExp(code));
 }
});
test('Cloudflare error envelope cannot be treated as success',async()=>{
 const f=stub(200,{success:false,result:[]});
 await assert.rejects(()=>readProviderInventory({provider:'cloudflare',token:fake,http:f.http}),/CLOUDFLARE_UNSUCCESSFUL/);
});
