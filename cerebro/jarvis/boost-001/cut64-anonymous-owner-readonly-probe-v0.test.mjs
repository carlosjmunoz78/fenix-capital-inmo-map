import test from 'node:test';
import assert from 'node:assert/strict';
import {PROBE_PLAN,assertProbePlan,classifyHttpStatus,runAnonymousGetProbes}
 from './cut64-anonymous-owner-readonly-probe-v0.mjs';

test('only three allowlisted owner GET paths, without URLs holding login tokens',()=>{
 assert.equal(assertProbePlan(PROBE_PLAN),true);
 assert.equal(PROBE_PLAN.length,3);
 for(const p of PROBE_PLAN){
  assert.equal(new URL(p.url).search,'');
  assert.equal(new URL(p.url).protocol,'https:');
 }
});
test('reject query strings, altered host, action paths and duplicate probes',()=>{
 assert.throws(()=>assertProbePlan([...PROBE_PLAN.slice(0,2),{...PROBE_PLAN[2],url:PROBE_PLAN[2].url+'?token=x'}]),/NONALLOWLISTED_OR_UNSAFE_PROBE/);
 assert.throws(()=>assertProbePlan([...PROBE_PLAN.slice(0,2),{...PROBE_PLAN[2],url:'https://evil.invalid/__jarvis/owner-check'}]),/NONALLOWLISTED_OR_UNSAFE_PROBE/);
 assert.throws(()=>assertProbePlan([...PROBE_PLAN.slice(0,2),{...PROBE_PLAN[2],url:PROBE_PLAN[2].url.replace('owner-check','mission-execute')}]),/UNSAFE_WORKER_PATH/);
 assert.throws(()=>assertProbePlan([...PROBE_PLAN.slice(0,2),{...PROBE_PLAN[0]}]),/NONALLOWLISTED_OR_UNSAFE_PROBE/);
});
test('classify owner GET 401/403 as denied, but not as OWNER E2E success',()=>{
 assert.equal(classifyHttpStatus({status:401}),'ANONYMOUS_REQUEST_DENIED_BY_SOME_LAYER');
 assert.equal(classifyHttpStatus({status:403}),'ANONYMOUS_REQUEST_DENIED_BY_SOME_LAYER');
 assert.equal(classifyHttpStatus({status:200}),'ANONYMOUS_HTTP_SUCCESS_MANUAL_SECURITY_REVIEW');
 assert.equal(classifyHttpStatus({status:302,accessLoginRedirect:true}),'CLOUDFLARE_ACCESS_LOGIN_CHALLENGE_PRESENT');
 assert.equal(classifyHttpStatus({status:302,accessLoginRedirect:false}),'REDIRECT_NOT_PROOF_OF_AUTHORIZATION');
 assert.equal(classifyHttpStatus({status:404}),'ENDPOINT_NOT_AVAILABLE_NOT_AUTH_PROOF');
 assert.equal(classifyHttpStatus({status:0}),'TRANSPORT_FAILURE_NOT_AUTH_PROOF');
});
test('mock transport never sends Authorization, API keys, POST, bodies or cookies',async()=>{
 const received=[];
 const fake=async(url,opt)=>{
  received.push({url,opt});
  if(url.includes('.workers.dev'))return new Response(null,{status:302,
    headers:{location:'https://fenix.cloudflareaccess.com/cdn-cgi/access/login?token=private'}});
  return new Response(null,{status:403});
 };
 const r=await runAnonymousGetProbes(fake);
 assert.equal(received.length,3);
 for(const v of received){
  assert.equal(v.opt.method,'GET');
  assert.equal(v.opt.redirect,'manual');
  assert.equal(v.opt.credentials,'omit');
  assert.equal(v.opt.headers,undefined);
  assert.equal(v.opt.body,undefined);
  assert.equal(v.opt.cache,'no-store');
  assert.equal(new URL(v.url).search,'');
 }
 assert.equal(r.probes[2].cloudflare_access_login_redirect,true);
 assert.equal(r.security_attention,false);
 assert.equal(r.prod_data_writes,0);
 assert.equal(r.owner_authenticated_path_verified,false);
 assert.equal(r.prod_write_authorized,false);
 assert.ok(!JSON.stringify(r).includes('token=private'));
});
test('anonymous 200 triggers hard review, no fabricated security clearance',async()=>{
 const fake=async()=>new Response('ignored',{status:200});
 const r=await runAnonymousGetProbes(fake);
 assert.equal(r.security_attention,true);
 assert.equal(r.probes.every(x=>x.conclusion==='ANONYMOUS_HTTP_SUCCESS_MANUAL_SECURITY_REVIEW'),true);
 assert.equal(r.run_has_production_release_authority,false);
});
test('transport failure remains inconclusive, never accepted as authentication success',async()=>{
 const fake=async()=>{throw Error('NOT_VERIFIED');};
 const r=await runAnonymousGetProbes(fake);
 assert.equal(r.probes.every(x=>x.http_status===0&&x.transport_error),true);
 assert.equal(r.probes.every(x=>x.conclusion==='TRANSPORT_FAILURE_NOT_AUTH_PROOF'),true);
 assert.equal(r.b3_owner_grant_verified,false);
});
