/**
 * Real WebCrypto RS256 signing/verifying, using ONLY synthetic Access and
 * Gateway responses. No external network, tokens, PROD or remote Workers.
 */
import assert from 'node:assert/strict';
import {serveOwnerReadOnlyDirectory,verifyCloudflareAccessJwt} from './worker/owner-readonly-gate.ts';
import worker from './worker/index.ts';
const issuer='https://fenix-test.cloudflareaccess.com';
const aud='cerebro_lab_test_audience_20261118';
const host='owner-stage.example';
const key='sb_publishable_'+'x'.repeat(30);
const env={
 CEREBRO_OWNER_READONLY_ENABLED:'true',
 CF_ACCESS_ISSUER:issuer,CF_ACCESS_AUD:aud,CF_ALLOWED_HOST:host,
 SUPABASE_PUBLISHABLE_KEY:key
};
const {publicKey,privateKey}=await crypto.subtle.generateKey(
 {name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',publicKey),kid:'cerebro-test-key',alg:'RS256',use:'sig'};
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
async function signed(claims={},header={}){
 const now=Math.floor(Date.now()/1000);
 const head=enc({alg:'RS256',typ:'JWT',kid:jwk.kid,...header});
 const body=enc({iss:issuer,aud:[aud],iat:now-60,exp:now+3600,nbf:now-60,...claims});
 const message=head+'.'+body;
 const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',privateKey,new TextEncoder().encode(message));
 return message+'.'+Buffer.from(sig).toString('base64url');
}
const access=await signed();
const request=(path='/api/cerebro-agent-directory?company_id=fenix&kind=ALL&limit=25',options={})=>
 new Request('https://'+host+path,{
  ...options,
  headers:{
   authorization:'Bearer '+'s'.repeat(52),apikey:key,'cf-access-jwt-assertion':access,
   ...options.headers
  }
 });
const original=globalThis.fetch;
const calls=[];
let jwksOk=true,ownerOk=true,ownerActor='CARLOS-ADMIN',upstreamError=false;
globalThis.fetch=async (url,options={})=>{
 const text=String(url);
 calls.push({url:text,method:options.method});
 if(text===issuer+'/cdn-cgi/access/certs'){
  if(upstreamError)throw new Error('Synthetic JWKS offline');
  return {status:jwksOk?200:503,json:async()=>({keys:[jwk]})};
 }
 if(text==='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context'){
  assert.equal(options.method,'GET');
  assert.equal(options.headers.apikey,key);
  assert.equal(options.redirect,'error');
  return {status:ownerOk?200:401,json:async()=>({ok:!upstreamError,context:{actor_code:ownerActor}})};
 }
 throw Error('UNAUTHORIZED_OUTBOUND_ORIGIN');
};
const run=(req,settings=env)=>serveOwnerReadOnlyDirectory(req,settings);
try{
 assert.equal(await verifyCloudflareAccessJwt(access,issuer,aud),true);
 assert.equal(await verifyCloudflareAccessJwt(access,issuer,aud+'-wrong'),false);
 assert.equal(await verifyCloudflareAccessJwt(access,'https://evil.invalid',aud),false);
 assert.equal(await verifyCloudflareAccessJwt(await signed({exp:Math.floor(Date.now()/1000)-120}),issuer,aud),false);
 assert.equal(await verifyCloudflareAccessJwt(await signed({nbf:Math.floor(Date.now()/1000)+400}),issuer,aud),false);
 assert.equal(await verifyCloudflareAccessJwt(await signed({iss:'https://wrong.cloudflareaccess.com'}),issuer,aud),false);
 assert.equal(await verifyCloudflareAccessJwt(await signed({aud:['unknown-audience']}),issuer,aud),false);
 assert.equal(await verifyCloudflareAccessJwt(await signed({}, {alg:'none'}),issuer,aud),false);
 const forged=access.slice(0,-3)+'aaa';
 assert.equal(await verifyCloudflareAccessJwt(forged,issuer,aud),false);
 const anon=await run(request(),{});assert.equal(anon.status,503);assert.equal((await anon.json()).reason,'CLOUDFLARE_PORTABILITY_LAB_API_DISABLED');
 assert.equal((await run(request(),{...env,CF_ACCESS_AUD:undefined})).status,503);
 assert.equal((await run(request(),{...env,CF_ACCESS_ISSUER:'http://evil.invalid'})).status,503);
 assert.equal((await run(request(),{...env,CF_ALLOWED_HOST:'evil.test'})).status,403);
 assert.equal((await run(new Request('http://'+host+'/api/cerebro-agent-directory?company_id=fenix',{headers:request().headers}))).status,403);
 assert.equal((await run(request(undefined,{headers:{origin:'https://attacker.example'}}))).status,403);
 assert.equal((await run(request('?company_id=another'))).status,400);
 assert.equal((await run(request('?company_id=fenix&kind=HACK'))).status,400);
 assert.equal((await run(request(undefined,{headers:{authorization:''}}))).status,401);
 assert.equal((await run(request(undefined,{headers:{apikey:'sb_publishable_wrong'}}))).status,401);
 assert.equal((await run(request(undefined,{headers:{'cf-access-jwt-assertion':''}}))).status,401);
 let k=calls.length;
 assert.equal((await run(request(undefined,{headers:{'cf-access-jwt-assertion':await signed({aud:['evil']})}}))).status,403);
 assert(!calls.slice(k).some(x=>x.url.includes('fenix-app-gateway')),'JWT rejected before Gateway');
 ownerActor='OTHER_ACTOR';
 assert.equal((await run(request())).status,403);
 ownerActor='CARLOS-ADMIN';ownerOk=false;
 assert.equal((await run(request())).status,403);
 ownerOk=true;upstreamError=true;
 assert.equal((await run(request())).status,403);
 upstreamError=false;jwksOk=false;
 assert.equal((await run(request())).status,403);
 jwksOk=true;
 const yes=await run(request());
 assert.equal(yes.status,200);
 const data=await yes.json();
 assert.equal(data.page.total,2506);
 assert.equal(data.records.length,25);
 assert.equal(data.company_id,'fenix');
 assert.equal(data.transport,'OWNER_PROD_READONLY');
 assert.equal(data.read_only,true);
 assert.equal(data.executed,false);
 assert.equal(data.active_agents_verified,false);
 assert.equal(yes.headers.get('cache-control'),'private, no-store, max-age=0');
 assert.equal(yes.headers.get('x-robots-tag'),'noindex,nofollow');
 const viaWorker=await worker.fetch(request(),env);
 assert.equal(viaWorker.status,200);
 assert.equal((await viaWorker.json()).page.total,2506);
 assert.equal((await worker.fetch(request(undefined,{method:'POST'}),env)).status,405);
 assert.equal((await worker.fetch(new Request('https://'+host+'/api/cerebro-preview-owner'),env)).status,503);
 assert(calls.some(x=>x.url===issuer+'/cdn-cgi/access/certs'));
 assert(calls.some(x=>x.url.includes('/fenix-app-gateway/session/context')));
 assert(calls.every(x=>x.url===issuer+'/cdn-cgi/access/certs'||x.url.includes('cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context')));
}finally{globalThis.fetch=original}
console.log('PASS Access RS256 real signature and issuer/audience/lifetime; Gateway owner AND-gate; 2506 GET; denied hosts, origins, tenants, methods; zero real network');
