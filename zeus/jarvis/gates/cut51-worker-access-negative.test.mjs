import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyAnonymousAccess,checkAnonymousAccess,WORKER_ENDPOINTS} from './cut51-worker-access-negative.mjs';
const classification=(code,location)=>classifyAnonymousAccess(code,location).classification;
test('CUT51 public 200 / redirectless 204 fail closed',()=>{
 for(const code of [200,201,204,206]){
  const x=classifyAnonymousAccess(code);
  assert.equal(x.public_exposure,true);
  assert.equal(x.access_proven,false);
  assert.equal(x.classification,'PUBLIC_2XX_SECURITY_BLOCKER');
 }
});
test('CUT51 only Cloudflare Access challenge counted as an Access-style challenge',()=>{
 assert.equal(classification(302,'https://test.cloudflareaccess.com/cdn-cgi/access/login/abc'),'ACCESS_CHALLENGE_OBSERVED');
 assert.equal(classifyAnonymousAccess(302,'https://test.cloudflareaccess.com/cdn-cgi/access/login/abc').access_proven,true);
 assert.equal(classification(302,'https://evil.example/cdn-cgi/access/login/abc'),'REDIRECT_UNVERIFIED');
 assert.equal(classification(301,'https://test.cloudflareaccess.com/redirect'),'REDIRECT_UNVERIFIED');
 assert.equal(classification(302,'/cdn-cgi/access/login/abc'),'REDIRECT_UNVERIFIED');
});
test('CUT51 403/401 and OFF/404 are NOT proof of verified Access',()=>{
 for(const code of [401,403,404,530,500,503]){
  const x=classifyAnonymousAccess(code);
  assert.equal(x.public_exposure,false);
  assert.equal(x.access_proven,false);
 }
});
test('CUT51 has exactly original and parallel fixed URLs, no credentials or third-party endpoints',()=>{
 assert.deepEqual(WORKER_ENDPOINTS.map(x=>x.id),['CUT30_ORIGINAL','CUT32_PARALLEL']);
 assert.ok(WORKER_ENDPOINTS.every(x=>x.url.startsWith('https://cerebro-jarvis-')&&x.url.endsWith('/__jarvis/owner-check')));
});
test('CUT51 genuine unauthenticated request never forwards cookies, tokens or follows redirects',async()=>{
 const observed=[];
 const fetchImpl=async (url,options)=>{
  observed.push({url,options});
  return {status:302,headers:{get:()=> 'https://demo.cloudflareaccess.com/cdn-cgi/access/login/example'}};
 };
 const r=await checkAnonymousAccess({fetchImpl});
 assert.equal(r.release_gate,'NO_GO');
 assert.equal(r.production_authorized,false);
 assert.equal(r.physical_owner_mission_certified,false);
 assert.equal(r.access_runtime_certified,false);
 assert.equal(r.results.length,2);
 assert.ok(r.results.every(x=>x.classification==='ACCESS_CHALLENGE_OBSERVED'));
 assert.ok(observed.every(x=>x.options.method==='GET'&&x.options.redirect==='manual'&&
  !('cookie' in x.options.headers)&&!('authorization' in x.options.headers)));
});
test('CUT51 anonymous 2xx detected as security blocker, never a success',async()=>{
 const r=await checkAnonymousAccess({fetchImpl:async()=>({status:200,headers:{get:()=>null}})});
 assert.equal(r.public_exposure_detected,true);
 assert.ok(r.results.every(x=>x.classification==='PUBLIC_2XX_SECURITY_BLOCKER'));
 assert.equal(r.release_gate,'NO_GO');
});
test('CUT51 network errors remain inconclusive, never disguised as an Access pass',async()=>{
 const r=await checkAnonymousAccess({fetchImpl:async()=>{throw Error('DNS_DISABLED')}});
 assert.equal(r.public_exposure_detected,false);
 assert.ok(r.results.every(x=>x.classification==='NO_HTTP_EVIDENCE'&&!x.access_proven));
 assert.equal(r.release_gate,'NO_GO');
});
